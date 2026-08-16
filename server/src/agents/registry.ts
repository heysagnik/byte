import type { Tool } from '@google/generative-ai';
import { DynamicStructuredTool, StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { AgentStep } from './context';

export interface ToolContext {
  threadId: string;
  userId: string;
  agentMessageId: string | null;
  user?: import('./context').UserProfile;
  reportStep: (step: AgentStep) => Promise<void>;
}

export interface ToolHandler {
  name?: string;
  description?: string;
  schema?: z.ZodObject<z.ZodRawShape>;
  /** Gemini tool declaration(s) (backward compatibility) */
  tools?: Tool;
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
   */
  register(name: string, handler: ToolHandler): void {
    if (this.handlers.has(name)) return;
    this.handlers.set(name, { ...handler, name: handler.name ?? name });
  }

  /** Remove a tool from the registry (used for dynamic MCP tools on disconnect) */
  unregister(name: string): void {
    this.handlers.delete(name);
  }

  /** Get registered tool names */
  getToolNames(): string[] {
    return [...this.handlers.keys()];
  }

  /** All Gemini Tool objects — legacy backward compatibility */
  allTools(): Tool[] {
    return [...this.handlers.values()]
      .map(h => h.tools)
      .filter((t): t is Tool => Boolean(t));
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
   * Convert registered handlers into LangChain StructuredTools bound to a ToolContext.
   */
  asLangChainTools(ctx: ToolContext, allowedNames?: string[]): StructuredTool[] {
    const tools: StructuredTool[] = [];

    for (const [name, handler] of this.handlers.entries()) {
      if (allowedNames && allowedNames.length > 0 && !allowedNames.includes(name)) {
        continue;
      }

      let description = handler.description ?? name;
      let schema: z.ZodObject<z.ZodRawShape> =
        handler.schema ?? z.object({ query: z.string().optional() });

      const funcDecls = (
        handler.tools as { functionDeclarations?: Array<{ description?: string }> } | undefined
      )?.functionDeclarations;
      if (!handler.schema && funcDecls?.[0]) {
        const decl = funcDecls[0];
        description = decl.description ?? description;
      }

      const lcTool = new DynamicStructuredTool({
        name,
        description,
        schema,
        func: async (args: Record<string, unknown>) => {
          return handler.handle(args, ctx);
        },
      });

      tools.push(lcTool);
    }

    return tools;
  }

  /**
   * Connect to an MCP server and register all its tools dynamically.
   * Each tool is prefixed with the server name: mcp_{serverName}_{toolName}.
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
        env: { ...process.env, ...(config.env ?? {}) } as Record<string, string>,
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
      const geminiParams = mcpSchemaToGemini(tool.inputSchema, SchemaType);
      const zodSchema = jsonSchemaToZod(tool.inputSchema as Record<string, unknown>);

      this.register(fullName, {
        name: fullName,
        description: tool.description ?? `MCP tool: ${tool.name} from ${serverName}`,
        schema: zodSchema,
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
              /* non-fatal */
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

          const callOptions =
            tool.name === 'make_phone_call' ? { timeout: 13 * 60 * 1000 } : undefined;
          const result = await client.callTool(
            { name: tool.name, arguments: enriched },
            undefined,
            callOptions,
          );

          const content = result.content as Array<{ type: string; text?: string }>;
          const text = content
            .filter(c => c.type === 'text')
            .map(c => c.text ?? '')
            .join('\n');
          const resultText = text || JSON.stringify(content);

          if (tool.name === 'make_phone_call') {
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

    return () => {
      registeredNames.forEach(n => this.unregister(n));
      client.close().catch(() => {});
      console.log(
        `[registry] MCP server "${serverName}" disconnected, ${registeredNames.length} tools removed`,
      );
    };
  }
}

/** Convert JSON Schema object to Zod Object schema */
function jsonSchemaToZod(schema: Record<string, unknown>): z.ZodObject<z.ZodRawShape> {
  if (!schema || schema.type !== 'object' || !schema.properties) {
    return z.object({});
  }

  const shape: Record<string, z.ZodTypeAny> = {};
  const required = new Set<string>(
    Array.isArray(schema.required) ? (schema.required as string[]) : [],
  );

  for (const [key, val] of Object.entries(
    schema.properties as Record<string, Record<string, unknown>>,
  )) {
    let fieldZod: z.ZodTypeAny;
    const type = val.type ?? 'string';

    if (type === 'number' || type === 'integer') {
      fieldZod = z.number();
    } else if (type === 'boolean') {
      fieldZod = z.boolean();
    } else if (type === 'array') {
      fieldZod = z.array(z.string());
    } else if (type === 'object') {
      fieldZod = z.record(z.any());
    } else {
      fieldZod = z.string();
    }

    if (val.description && typeof val.description === 'string') {
      fieldZod = fieldZod.describe(val.description);
    }

    if (!required.has(key)) {
      fieldZod = fieldZod.optional();
    }

    shape[key] = fieldZod;
  }

  return z.object(shape);
}

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
