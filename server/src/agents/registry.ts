import type { Tool } from '@google/generative-ai';
import type { AgentStep } from './context';

export interface ToolContext {
  threadId: string;
  userId: string;
  agentMessageId: string | null;
  reportStep: (step: AgentStep) => Promise<void>;
}

export interface ToolHandler {
  /** Gemini tool declaration(s) this handler owns */
  tools: Tool;
  /** Execute the tool and return a result string fed back to the model */
  handle(args: Record<string, unknown>, ctx: ToolContext): Promise<string>;
}

/** Config for connecting to an MCP server (stdio or SSE) */
export interface MCPServerConfig {
  type: 'stdio' | 'sse';
  /** For stdio: command + args. For SSE: url */
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
}

class ToolRegistry {
  private handlers = new Map<string, ToolHandler>();

  /**
   * Register a tool handler by name.
   * Safe to call multiple times with the same name (idempotent — silently skips re-registration).
   */
  register(name: string, handler: ToolHandler): void {
    if (this.handlers.has(name)) return;
    this.handlers.set(name, handler);
  }

  /** Remove a tool from the registry (used for dynamic MCP tools on disconnect) */
  unregister(name: string): void {
    this.handlers.delete(name);
  }

  /** All Gemini Tool objects — pass to getGenerativeModel() */
  allTools(): Tool[] {
    return [...this.handlers.values()].map(h => h.tools);
  }

  /** Dispatch a tool call by name */
  async dispatch(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
    const handler = this.handlers.get(name);
    if (!handler)
      throw new Error(
        `Unknown tool: "${name}". Registered: ${[...this.handlers.keys()].join(', ')}`,
      );
    return handler.handle(args, ctx);
  }

  /**
   * Connect to an MCP server and register all its tools dynamically.
   * Each tool is prefixed with the server name: mcp_{serverName}_{toolName}.
   * Returns an unregister function — call it when the MCP server disconnects.
   *
   * NOTE: Requires @modelcontextprotocol/sdk to be installed.
   * Install: npm install @modelcontextprotocol/sdk
   */
  async registerMCP(serverName: string, config: MCPServerConfig): Promise<() => void> {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
    const { StreamableHTTPClientTransport } =
      await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const { SchemaType } = await import('@google/generative-ai');

    const client = new Client({ name: 'byte', version: '1.0.0' }, { capabilities: {} });

    let transport;
    if (config.type === 'stdio' && config.command) {
      transport = new StdioClientTransport({
        command: config.command,
        args: config.args ?? [],
        env: config.env,
      });
    } else if (config.type === 'sse' && config.url) {
      transport = new StreamableHTTPClientTransport(new URL(config.url));
    } else {
      throw new Error(`Invalid MCP config for server "${serverName}"`);
    }

    await client.connect(transport);
    console.log(`[registry] MCP server "${serverName}" connected`);

    const { tools } = await client.listTools();
    const registeredNames: string[] = [];

    for (const tool of tools) {
      const fullName = `mcp_${serverName}_${tool.name}`;

      // Convert MCP JSON Schema to Gemini Schema (best-effort)
      const geminiParams = mcpSchemaToGemini(tool.inputSchema, SchemaType);

      this.register(fullName, {
        tools: {
          functionDeclarations: [
            {
              name: fullName,
              description: tool.description ?? `MCP tool: ${tool.name} from ${serverName}`,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              parameters: geminiParams as any,
            },
          ],
        },
        async handle(args, ctx) {
          // Only resolve caller_name for phone call tools — avoids a DB hit on every tool dispatch
          const needsCallerName = tool.name === 'make_phone_call' && !args['caller_name'];
          let callerName: string | undefined;
          if (needsCallerName && ctx.userId) {
            try {
              const { User } = await import('../models/User.js');
              const user = await User.findById(ctx.userId).lean();
              if (user?.name) {
                callerName = user.name;
              } else if (user?.email) {
                const prefix = user.email.split('@')[0] ?? '';
                callerName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
              }
            } catch {
              /* non-fatal — MCP server falls back to CALLER_NAME env var */
            }
          }

          const enriched: Record<string, unknown> = {
            ...args,
            ...(callerName ? { caller_name: callerName } : {}),
          };

          if (tool.name === 'make_phone_call') {
            const recipient = String(enriched['recipient_name'] ?? 'contact');
            const objective = String(enriched['objective'] ?? '').slice(0, 120);
            await ctx.reportStep({
              type: 'calling',
              content: `Calling ${recipient}: ${objective}`,
              timestamp: Date.now(),
            });
          }

          // Phone calls poll for up to 12 minutes — override the MCP SDK default 60s timeout.
          const callOptions =
            tool.name === 'make_phone_call' ? { timeout: 13 * 60 * 1000 } : undefined;
          const result = await client.callTool(
            { name: tool.name, arguments: enriched },
            undefined,
            callOptions,
          );

          // MCP returns content blocks — extract text
          const content = result.content as Array<{ type: string; text?: string }>;
          const text = content
            .filter(c => c.type === 'text')
            .map(c => c.text ?? '')
            .join('\n');
          const resultText = text || JSON.stringify(content);

          if (tool.name === 'make_phone_call') {
            // Extract AI-generated summary from the formatted call output
            const summaryMatch = resultText.match(/📋 SUMMARY:\n([\s\S]*?)(?:\n\n|$)/);
            const summary = summaryMatch?.[1]?.trim() ?? resultText.slice(0, 200);
            await ctx.reportStep({
              type: 'result',
              content: summary,
              timestamp: Date.now(),
            });
          }

          return resultText;
        },
      });

      registeredNames.push(fullName);
      console.log(`[registry] Registered MCP tool: ${fullName}`);
    }

    // Return cleanup function
    return () => {
      registeredNames.forEach(n => this.unregister(n));
      client.close().catch(() => {});
      console.log(
        `[registry] MCP server "${serverName}" disconnected, ${registeredNames.length} tools removed`,
      );
    };
  }
}

/** Best-effort conversion of MCP JSON Schema → Gemini Schema object */
function mcpSchemaToGemini(
  schema: Record<string, unknown>,
  SchemaType: Record<string, string>,
): Record<string, unknown> {
  if (!schema || schema.type !== 'object') {
    return { type: SchemaType['OBJECT'], properties: {} };
  }

  const convertType = (t: string): string =>
    ({
      string: SchemaType['STRING'],
      number: SchemaType['NUMBER'],
      boolean: SchemaType['BOOLEAN'],
      array: SchemaType['ARRAY'],
      object: SchemaType['OBJECT'],
    })[t] ?? SchemaType['STRING'];

  const convertProps = (props: Record<string, unknown>): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(props)) {
      const v = val as Record<string, unknown>;
      out[key] = {
        type: convertType((v.type as string | undefined) ?? 'string'),
        description: v.description ?? '',
        ...(v.enum ? { format: 'enum', enum: v.enum } : {}),
      };
    }
    return out;
  };

  return {
    type: SchemaType['OBJECT'],
    properties: convertProps((schema.properties as Record<string, unknown>) ?? {}),
    required: schema.required ?? [],
  };
}

export const registry = new ToolRegistry();
