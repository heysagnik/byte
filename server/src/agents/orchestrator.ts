/**
 * OrchestratorAgent — the master agent that plans, delegates, and synthesizes.
 *
 * Responsibilities:
 *  - Resolve user profile (name + location from IP)
 *  - Build conversation history for Gemini
 *  - Expose spawn_agent tool so it can launch SubAgents in parallel
 *  - Enforce sequential constraints (phone calls, approval gates)
 *  - Persist steps to DB and broadcast over SSE
 */

import { GoogleGenerativeAI, Content, Part, FunctionResponsePart, SchemaType } from '@google/generative-ai';
import type { Tool } from '@google/generative-ai';
import { registry } from './registry';
import { SubAgent } from './sub-agent';
import { buildOrchestratorPrompt } from './prompts';
import { resolveUserProfile } from './user-profile';
import { geminiLimiter } from './rate-limiter';
import { broadcastStep } from '../services/sse.service';
import * as db from '../services/db.service';
import { env } from '../config/env';
import type { AgentStep, AgentContext, SubAgentResult } from './context';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_ITERATIONS = 25;

// Tools that must run sequentially (one at a time)
const SEQUENTIAL_TOOLS = new Set([
  'mcp_phonecall_make_phone_call',
  'request_user_approval',
]);

// ─── spawn_agent tool declaration ─────────────────────────────────────────────

const SPAWN_AGENT_TOOL: Tool = {
  functionDeclarations: [{
    name: 'spawn_agent',
    description:
      'Launch one or more specialized sub-agents to handle focused subtasks in parallel. ' +
      'Each sub-agent runs independently with its own tool set and returns a result. ' +
      'Spawn multiple agents in a SINGLE turn to run them concurrently. ' +
      'Do NOT spawn agents for: request_user_approval (run directly in orchestrator).',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        agent_name: {
          type: SchemaType.STRING,
          description: 'Short human-readable label shown in the UI. E.g. "Research Agent", "Call Agent", "Draft Agent".',
        },
        task: {
          type: SchemaType.STRING,
          description:
            'Complete, self-contained instruction for the sub-agent. ' +
            'Include all context it needs — it has no access to the conversation history.',
        },
        tools: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description:
            'Tool names the sub-agent may use. Available: "mcp_phonecall_make_phone_call", "send_notification". ' +
            'Google Search grounding is always available. Omit for research-only agents.',
        },
      },
      required: ['agent_name', 'task'],
    },
  }],
};

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
  private genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  private abortSignal!: AbortSignal;

  constructor(
    private readonly threadId: string,
    private readonly agentMessageId: string | null = null,
    private readonly userId: string = '',
    private readonly clientIp?: string,
  ) {}

  // ── Public entry point ──────────────────────────────────────────────────────

  async run(userMessage: string, images?: Array<{ dataUrl: string; mimeType: string; name: string }>): Promise<string> {
    const ctrl = new AbortController();
    this.abortSignal = ctrl.signal;
    cancelControllers.set(this.threadId, ctrl);

    try {
      const userProfile = await resolveUserProfile(this.userId, userMessage, this.clientIp);

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
          await db.updateMessageMetadata(this.agentMessageId, {
            type: 'done',
            steps: this.steps,
            seq: this.stepSeq + 1,
          }).catch(() => {});
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
    const tools = this.buildTools();
    const systemInstruction = buildOrchestratorPrompt(ctx.user);
    const history = await this.buildHistory();

    await this.reportStep({ type: 'thinking', content: 'Planning...', timestamp: Date.now() });

    const model = this.genAI.getGenerativeModel({ model: env.GEMINI_MODEL, tools, systemInstruction });
    const chat = model.startChat({ history });

    // Build multimodal parts if images are present
    const firstTurnParts: Part[] = [{ text: userMessage }];
    if (images && images.length > 0) {
      for (const img of images) {
        const base64 = img.dataUrl.split(',')[1] ?? img.dataUrl;
        firstTurnParts.push({ inlineData: { mimeType: img.mimeType, data: base64 } });
      }
    }
    const firstTurn: string | Part[] = firstTurnParts.length > 1 ? firstTurnParts : userMessage;

    let response = await geminiLimiter.schedule(() => chat.sendMessage(firstTurn)).catch(err => {
      this.reportStep({ type: 'error', content: `AI unreachable: ${String(err)}`, timestamp: Date.now() });
      throw err;
    });

    let iterations = 0;

    while (iterations < MAX_ITERATIONS) {
      if (this.abortSignal.aborted) throw new Error('cancelled');
      iterations++;
      const parts: Part[] = response.response.candidates?.[0]?.content?.parts ?? [];
      const callParts = parts.filter(p => p.functionCall);

      if (callParts.length === 0) break;

      const results = await this.dispatchTools(callParts, ctx);

      if (this.abortSignal.aborted) throw new Error('cancelled');
      await this.reportStep({ type: 'thinking', content: 'Synthesizing results...', timestamp: Date.now() });

      response = await geminiLimiter.schedule(() => chat.sendMessage(results as Part[])).catch(err => {
        this.reportStep({ type: 'error', content: `AI error: ${String(err)}`, timestamp: Date.now() });
        throw err;
      });
    }

    if (iterations >= MAX_ITERATIONS) {
      await this.reportStep({ type: 'error', content: 'Max steps reached — stopping.', timestamp: Date.now() });
    }

    let finalText = '';
    try { finalText = response.response.text(); } catch { /* empty */ }

    await this.finalize(finalText || 'Task completed.');
    return finalText || 'Task completed.';
  }

  // ── Tool dispatch ───────────────────────────────────────────────────────────

  private async dispatchTools(
    callParts: Part[],
    ctx: AgentContext,
  ): Promise<FunctionResponsePart[]> {
    const hasSequential = callParts.some(p => SEQUENTIAL_TOOLS.has(p.functionCall!.name));

    if (hasSequential) {
      return this.dispatchSequential(callParts, ctx);
    }

    const spawnCalls = callParts.filter(p => p.functionCall!.name === 'spawn_agent');
    const regularCalls = callParts.filter(p => p.functionCall!.name !== 'spawn_agent');

    const [spawnResults, regularResults] = await Promise.all([
      spawnCalls.length > 0 ? this.dispatchSubAgents(spawnCalls, ctx) : Promise.resolve([]),
      regularCalls.length > 0
        ? Promise.all(regularCalls.map(p => this.callTool(p, ctx)))
        : Promise.resolve([]),
    ]);

    return [...spawnResults, ...regularResults];
  }

  private async dispatchSequential(callParts: Part[], ctx: AgentContext): Promise<FunctionResponsePart[]> {
    const results: FunctionResponsePart[] = [];
    for (const part of callParts) {
      if (part.functionCall!.name === 'spawn_agent') {
        const r = await this.dispatchSubAgents([part], ctx);
        results.push(...r);
      } else {
        results.push(await this.callTool(part, ctx));
      }
    }
    return results;
  }

  /** Run all spawn_agent calls concurrently — each becomes a SubAgent */
  private async dispatchSubAgents(spawnCalls: Part[], ctx: AgentContext): Promise<FunctionResponsePart[]> {
    const agents = spawnCalls.map(part => {
      const args = part.functionCall!.args as Record<string, unknown>;
      const agentName = String(args['agent_name'] ?? 'Sub-Agent');
      const task = String(args['task'] ?? '');
      const tools = Array.isArray(args['tools']) ? (args['tools'] as unknown[]).map(String) : [];
      return { part, agent: new SubAgent(agentName, task, tools, ctx) };
    });

    const results: SubAgentResult[] = await Promise.all(agents.map(({ agent }) => agent.run()));

    return results.map((result, i) => {
      const name = spawnCalls[i].functionCall!.name;
      const response = result.error
        ? { error: result.error, agent: result.agentName }
        : { result: `[${result.agentName}]\n${result.result}` };
      return { functionResponse: { name, response } } as FunctionResponsePart;
    });
  }

  /** Dispatch a single tool call (registry) */
  private async callTool(part: Part, ctx: AgentContext): Promise<FunctionResponsePart> {
    const { name, args } = part.functionCall!;
    try {
      const result = await registry.dispatch(name, args as Record<string, unknown>, ctx);
      return { functionResponse: { name, response: { result } } };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Tool call failed';
      await this.reportStep({ type: 'error', content: `${name}: ${errMsg}`, timestamp: Date.now() });
      return { functionResponse: { name, response: { error: errMsg } } };
    }
  }

  // ── Tool list ───────────────────────────────────────────────────────────────

  private buildTools(): Tool[] {
    return [
      SPAWN_AGENT_TOOL,
      ...registry.allTools(),
    ];
  }

  // ── Finalization ────────────────────────────────────────────────────────────

  private async finalizeCancelled(): Promise<void> {
    await this.reportStep({ type: 'error', content: 'Stopped by user.', timestamp: Date.now() });
    if (this.agentMessageId) {
      await db.updateMessageMetadata(this.agentMessageId, {
        type: 'done',
        steps: this.steps,
        seq: this.stepSeq + 1,
      }).catch(() => {});
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
    console.log(`[byte:${this.threadId}]${step.agentLabel ? ` [${step.agentLabel}]` : ''} ${step.type}: ${step.content}`);

    if (!this.agentMessageId) return;

    broadcastStep(this.threadId, this.agentMessageId, step);

    const snapshot = [...this.steps];
    db.updateMessageMetadata(this.agentMessageId, { type: 'thinking', steps: snapshot, seq })
      .catch(err => console.warn('[byte] step persist failed:', err));
  }

  // ── Name prompt ─────────────────────────────────────────────────────────────

  private async promptForName(): Promise<string> {
    const text = "Hi! Before we get started, what's your name? I'll use it when making calls or acting on your behalf.";
    await db.insertMessage(this.threadId, 'agent', text, { type: 'final' });
    if (this.agentMessageId) {
      await db.updateMessageMetadata(this.agentMessageId, { type: 'done', steps: [] });
    }
    return text;
  }

  // ── Conversation history ────────────────────────────────────────────────────

  private async buildHistory(): Promise<Content[]> {
    try {
      const messages = await db.getMessagesByThread(this.threadId);
      const raw: Content[] = [];

      for (const msg of messages) {
        if (this.agentMessageId && msg._id.toString() === this.agentMessageId) continue;
        if (msg.role === 'system') continue;
        if (!msg.content) continue;

        if (msg.role === 'user') {
          raw.push({ role: 'user', parts: [{ text: msg.content }] });
        } else if (msg.role === 'agent') {
          raw.push({ role: 'model', parts: [{ text: msg.content }] });
        }
      }

      // Gemini requires strict user/model alternation
      const deduped: Content[] = [];
      for (const turn of raw) {
        if (deduped.length > 0 && deduped.at(-1)!.role === turn.role) continue;
        deduped.push(turn);
      }
      while (deduped.length > 0 && deduped.at(-1)!.role === 'model') deduped.pop();

      return deduped;
    } catch {
      return [];
    }
  }
}
