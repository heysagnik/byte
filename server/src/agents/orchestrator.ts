/**
 * OrchestratorAgent — master agent graph using LangChain & NVIDIA NIM / OpenRouter.
 *
 * Responsibilities:
 *  - Resolve user profile (name + location from IP)
 *  - Build conversation history using LangChain BaseMessage objects
 *  - Expose spawn_agent tool so it can launch SubAgents in parallel
 *  - Execute registered tools (web_search, map_search, phone call, approvals, notifications)
 *  - Persist steps to DB and broadcast over SSE
 */

import {
  BaseMessage,
  SystemMessage,
  HumanMessage,
  AIMessage,
  ToolMessage,
} from '@langchain/core/messages';
import { DynamicStructuredTool, StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { registry } from './registry';
import { SubAgent } from './sub-agent';
import { buildOrchestratorPrompt } from './prompts';
import { resolveUserProfile } from './user-profile';
import { createLLMClient } from './llm.factory';
import { broadcastStep } from '../services/sse.service';
import * as db from '../services/db.service';
import type { AgentStep, AgentContext, SubAgentResult } from './context';

const MAX_ITERATIONS = 25;

// Tools that must run sequentially (one at a time)
const SEQUENTIAL_TOOLS = new Set(['mcp_phonecall_make_phone_call', 'request_user_approval']);

// ─── Per-thread cancel registry ───────────────────────────────────────────────

const cancelControllers = new Map<string, AbortController>();

export function cancelThread(threadId: string): boolean {
  const ctrl = cancelControllers.get(threadId);
  if (!ctrl) return false;
  ctrl.abort();
  return true;
}

export function isThreadRunning(threadId: string): boolean {
  return cancelControllers.has(threadId);
}

// ─── OrchestratorAgent ────────────────────────────────────────────────────────

export class OrchestratorAgent {
  private steps: AgentStep[] = [];
  private stepSeq = 0;
  private abortSignal!: AbortSignal;

  constructor(
    private readonly threadId: string,
    private readonly agentMessageId: string | null = null,
    private readonly userId: string = '',
    private readonly clientIp?: string,
  ) {}

  // ── Public entry point ──────────────────────────────────────────────────────

  async run(
    userMessage: string,
    images?: Array<{ dataUrl: string; mimeType: string; name: string }>,
  ): Promise<string> {
    const ctrl = new AbortController();
    this.abortSignal = ctrl.signal;
    cancelControllers.set(this.threadId, ctrl);

    try {
      const userProfile = await resolveUserProfile(
        this.userId,
        userMessage,
        this.clientIp,
        this.threadId,
      );

      if (!userProfile) {
        return this.promptForName();
      }

      const ctx: AgentContext = {
        threadId: this.threadId,
        userId: this.userId,
        agentMessageId: this.agentMessageId,
        user: userProfile,
        reportStep: this.reportStep.bind(this),
      };

      try {
        return await this._execute(userMessage, ctx, images);
      } catch (err) {
        if (this.abortSignal.aborted) {
          await this.finalizeCancelled();
          return 'Cancelled.';
        }
        if (this.agentMessageId) {
          await db
            .updateMessageMetadata(this.agentMessageId, {
              type: 'done',
              steps: this.steps,
              seq: this.stepSeq + 1,
            })
            .catch(() => {});
        }
        throw err;
      }
    } finally {
      cancelControllers.delete(this.threadId);
    }
  }

  // ── Core execution loop ─────────────────────────────────────────────────────

  private async _execute(
    userMessage: string,
    ctx: AgentContext,
    images?: Array<{ dataUrl: string; mimeType: string; name: string }>,
  ): Promise<string> {
    const registeredTools = registry.asLangChainTools(ctx);
    const spawnTool = this.createSpawnAgentTool(ctx);
    const allTools: StructuredTool[] = [spawnTool, ...registeredTools];

    const systemPrompt = buildOrchestratorPrompt(ctx.user);
    const history = await this.buildHistory();

    const model = createLLMClient(0.2);
    const modelWithTools = model.bindTools(allTools);

    let contentInput: string | Array<Record<string, unknown>> = userMessage;
    if (images && images.length > 0) {
      const parts: Array<Record<string, unknown>> = [{ type: 'text', text: userMessage }];
      for (const img of images) {
        parts.push({
          type: 'image_url',
          image_url: { url: img.dataUrl },
        });
      }
      contentInput = parts;
    }

    const messages: BaseMessage[] = [
      new SystemMessage(systemPrompt),
      ...history,
      new HumanMessage({ content: contentInput as unknown as string }),
    ];

    let iterations = 0;

    while (iterations < MAX_ITERATIONS) {
      if (this.abortSignal.aborted) throw new Error('cancelled');
      iterations++;

      const response = await modelWithTools.invoke(messages);
      messages.push(response);

      const toolCalls = (response as AIMessage).tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        break;
      }

      const results = await this.dispatchToolCalls(toolCalls, ctx);

      if (this.abortSignal.aborted) throw new Error('cancelled');
      await this.reportStep({
        type: 'thinking',
        content: 'Synthesizing results...',
        timestamp: Date.now(),
      });

      messages.push(...results);
    }

    if (iterations >= MAX_ITERATIONS) {
      await this.reportStep({
        type: 'error',
        content: 'Max steps reached — stopping.',
        timestamp: Date.now(),
      });
    }

    const lastMsg = messages[messages.length - 1];
    const finalText = typeof lastMsg.content === 'string' ? lastMsg.content : 'Task completed.';

    await this.finalize(finalText || 'Task completed.');
    return finalText || 'Task completed.';
  }

  // ── Tool dispatching ────────────────────────────────────────────────────────

  private async dispatchToolCalls(
    toolCalls: Array<{ name: string; args: Record<string, unknown>; id?: string }>,
    ctx: AgentContext,
  ): Promise<ToolMessage[]> {
    const hasSequential = toolCalls.some(c => SEQUENTIAL_TOOLS.has(c.name));

    if (hasSequential) {
      const results: ToolMessage[] = [];
      for (const call of toolCalls) {
        results.push(await this.executeSingleToolCall(call, ctx));
      }
      return results;
    }

    // Parallel tool dispatch
    return Promise.all(toolCalls.map(call => this.executeSingleToolCall(call, ctx)));
  }

  private async executeSingleToolCall(
    call: { name: string; args: Record<string, unknown>; id?: string },
    ctx: AgentContext,
  ): Promise<ToolMessage> {
    const callId = call.id || call.name;

    if (call.name === 'spawn_agent') {
      const agentName = String(call.args['agent_name'] ?? 'Sub-Agent');
      const task = String(call.args['task'] ?? '');
      const tools = Array.isArray(call.args['tools']) ? (call.args['tools'] as unknown[]).map(String) : [];

      const subAgent = new SubAgent(agentName, task, tools, ctx);
      const res: SubAgentResult = await subAgent.run();

      const outputText = res.error
        ? `Error in ${res.agentName}: ${res.error}`
        : `[${res.agentName}]\n${res.result}`;

      return new ToolMessage({ content: outputText, tool_call_id: callId });
    }

    try {
      const result = await registry.dispatch(call.name, call.args, ctx);
      return new ToolMessage({ content: result, tool_call_id: callId });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Tool call failed';
      await this.reportStep({
        type: 'error',
        content: `${call.name}: ${errMsg}`,
        timestamp: Date.now(),
      });
      return new ToolMessage({ content: `Error: ${errMsg}`, tool_call_id: callId });
    }
  }

  // ── Dynamic spawn_agent tool declaration ─────────────────────────────────────

  private createSpawnAgentTool(ctx: AgentContext): StructuredTool {
    return new DynamicStructuredTool({
      name: 'spawn_agent',
      description:
        'Launch one or more specialized sub-agents to handle focused subtasks in parallel. ' +
        'Each sub-agent runs independently with its own tool set and returns a result. ' +
        'Spawn multiple agents in a SINGLE turn to run them concurrently. ' +
        'Do NOT spawn agents for: request_user_approval (run directly in orchestrator).',
      schema: z.object({
        agent_name: z
          .string()
          .describe('Short human-readable label shown in UI (e.g. "Research Agent", "Map Agent").'),
        task: z.string().describe('Complete, self-contained instruction for the sub-agent.'),
        tools: z
          .array(z.string())
          .optional()
          .describe('Optional allowed tool names for the sub-agent (e.g. "web_search", "map_search").'),
      }),
      func: async (args: { agent_name: string; task: string; tools?: string[] }) => {
        const subAgent = new SubAgent(args.agent_name, args.task, args.tools ?? [], ctx);
        const res = await subAgent.run();
        return res.error ? `Error: ${res.error}` : res.result;
      },
    });
  }

  // ── Finalization ────────────────────────────────────────────────────────────

  private async finalizeCancelled(): Promise<void> {
    await this.reportStep({ type: 'error', content: 'Stopped by user.', timestamp: Date.now() });
    if (this.agentMessageId) {
      await db
        .updateMessageMetadata(this.agentMessageId, {
          type: 'done',
          steps: this.steps,
          seq: this.stepSeq + 1,
        })
        .catch(() => {});
    }
  }

  private async finalize(text: string): Promise<void> {
    if (this.agentMessageId) {
      await db.updateMessageMetadata(this.agentMessageId, {
        type: 'done',
        steps: this.steps,
        seq: this.stepSeq + 1,
      });
    }
    await db.insertMessage(this.threadId, 'agent', text, { type: 'final' });
  }

  // ── Step reporting ──────────────────────────────────────────────────────────

  private async reportStep(step: AgentStep): Promise<void> {
    this.steps.push(step);
    const seq = ++this.stepSeq;
    console.log(
      `[byte:${this.threadId}]${step.agentLabel ? ` [${step.agentLabel}]` : ''} ${step.type}: ${step.content}`,
    );

    if (!this.agentMessageId) return;

    broadcastStep(this.threadId, this.agentMessageId, step);

    const snapshot = [...this.steps];
    db.updateMessageMetadata(this.agentMessageId, { type: 'thinking', steps: snapshot, seq }).catch(
      err => console.warn('[byte] step persist failed:', err),
    );
  }

  // ── Name prompt ─────────────────────────────────────────────────────────────

  private async promptForName(): Promise<string> {
    const text =
      "Hi! Before we get started, what's your name? I'll use it when making calls or acting on your behalf.";
    await db.insertMessage(this.threadId, 'agent', text, { type: 'final' });
    if (this.agentMessageId) {
      await db.updateMessageMetadata(this.agentMessageId, { type: 'done', steps: [] });
    }
    return text;
  }

  // ── Conversation history ────────────────────────────────────────────────────

  private async buildHistory(): Promise<BaseMessage[]> {
    try {
      const messages = await db.getMessagesByThread(this.threadId);
      const history: BaseMessage[] = [];

      for (const msg of messages) {
        if (this.agentMessageId && msg._id.toString() === this.agentMessageId) continue;
        if (msg.role === 'system') continue;
        if (!msg.content) continue;

        if (msg.role === 'user') {
          history.push(new HumanMessage(msg.content));
        } else if (msg.role === 'agent') {
          history.push(new AIMessage(msg.content));
        }
      }

      return history;
    } catch {
      return [];
    }
  }
}
