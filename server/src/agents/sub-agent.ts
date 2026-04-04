/**
 * SubAgent — a focused, single-task agent with a restricted tool set.
 *
 * Spawned by the OrchestratorAgent to run a specific workstream in parallel.
 * Returns a plain string result that the orchestrator merges into its context.
 */

import { GoogleGenerativeAI, Part, FunctionResponsePart } from '@google/generative-ai';
import type { Tool } from '@google/generative-ai';
import { registry } from './registry';
import { buildSubAgentPrompt } from './prompts';
import { geminiLimiter } from './rate-limiter';
import { env } from '../config/env';
import type { AgentContext, SubAgentResult } from './context';

const MAX_ITERATIONS = 10;

export class SubAgent {
  private genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

  constructor(
    private readonly agentName: string,
    private readonly task: string,
    private readonly allowedToolNames: string[],
    private readonly ctx: AgentContext,
  ) {}

  async run(): Promise<SubAgentResult> {
    await this.ctx.reportStep({
      type: 'agent_spawn',
      content: `${this.agentName}: ${this.task.slice(0, 120)}`,
      agentLabel: this.agentName,
      timestamp: Date.now(),
    });

    try {
      const result = await this._execute();
      await this.ctx.reportStep({
        type: 'agent_done',
        content: `${this.agentName} completed`,
        agentLabel: this.agentName,
        timestamp: Date.now(),
      });
      return { agentName: this.agentName, task: this.task, result };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      await this.ctx.reportStep({
        type: 'error',
        content: `${this.agentName} failed: ${error}`,
        agentLabel: this.agentName,
        timestamp: Date.now(),
      });
      return { agentName: this.agentName, task: this.task, result: '', error };
    }
  }

  private buildTools(): Tool[] {
    // Always include web_search so sub-agents can do real-time lookups
    const alwaysInclude = ['web_search', ...this.allowedToolNames];

    return registry.allTools().filter(tool => {
      const decls = (tool as { functionDeclarations?: Array<{ name: string }> }).functionDeclarations;
      return decls?.some(d => alwaysInclude.includes(d.name));
    });
  }

  private async _execute(): Promise<string> {
    const tools = this.buildTools();
    const systemInstruction = buildSubAgentPrompt(
      this.ctx.user,
      this.agentName,
      this.task,
      this.allowedToolNames,
    );

    const model = this.genAI.getGenerativeModel({ model: env.GEMINI_MODEL, tools, systemInstruction });
    const chat = model.startChat({ history: [] });

    // Sub-agent starts fresh — no conversation history, just the task
    let response = await geminiLimiter.schedule(() => chat.sendMessage(this.task));

    let iterations = 0;
    while (iterations < MAX_ITERATIONS) {
      iterations++;
      const parts: Part[] = response.response.candidates?.[0]?.content?.parts ?? [];
      const callParts = parts.filter(p => p.functionCall);

      if (callParts.length === 0) break;

      const subCtx = {
        ...this.ctx,
        reportStep: async (step: import('./context').AgentStep) => {
          // Tag sub-agent steps with the agent label
          await this.ctx.reportStep({ ...step, agentLabel: this.agentName });
        },
      };

      // Sub-agents run all their tool calls in parallel (no sequential constraints)
      const settled = await Promise.allSettled(
        callParts.map(async part => {
          const { name, args } = part.functionCall!;
          const result = await registry.dispatch(name, args as Record<string, unknown>, subCtx);
          return { functionResponse: { name, response: { result } } } as FunctionResponsePart;
        })
      );

      const results: FunctionResponsePart[] = settled.map((r, i) => {
        if (r.status === 'fulfilled') return r.value;
        const name = callParts[i].functionCall!.name;
        const errMsg = r.reason instanceof Error ? r.reason.message : 'Tool failed';
        return { functionResponse: { name, response: { error: errMsg } } } as FunctionResponsePart;
      });

      response = await geminiLimiter.schedule(() => chat.sendMessage(results as Part[]));
    }

    let text = '';
    try { text = response.response.text(); } catch { /* no text part */ }
    return text || 'No result returned.';
  }
}
