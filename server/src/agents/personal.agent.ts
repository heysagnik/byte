import { GoogleGenerativeAI, Content, Part, FunctionResponsePart } from '@google/generative-ai';
import { NotificationAgent } from './notification.agent';
import { waitForApproval } from '../services/approval.service';
import { registry } from './registry';
import * as db from '../services/db.service';
import { env } from '../config/env';
import { AGENT_SYSTEM_PROMPT } from './tools';
import { AgentStep } from './types';
import { SchemaType } from '@google/generative-ai';

import { registerCoreTools } from './manifest';
import { broadcastStep } from '../services/sse.service';

// Register all built-in tools once at module load
registerCoreTools();

// ── request_user_approval lives here because it is agent-level orchestration
// (blocks on waitForApproval) rather than an external tool call.
registry.register('request_user_approval', {
  tools: {
    functionDeclarations: [
      {
        name: 'request_user_approval',
        description:
          'Pause execution and present 2–4 concrete, mutually exclusive options to the user. Resumes only when the user selects one. ' +
          'Use ONLY when: (a) you have confirmed options from research/calls, (b) the options are meaningfully different, and (c) a commitment is about to be made. ' +
          'Do NOT use as a check-in or progress report — use send_notification for that.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            summary: {
              type: SchemaType.STRING,
              description: 'Clear summary of what was found and what decision the user needs to make.',
            },
            options: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  label:       { type: SchemaType.STRING,  description: 'Short option label' },
                  details:     { type: SchemaType.STRING,  description: 'Full details of this option' },
                  price:       { type: SchemaType.STRING,  description: 'Cost if applicable' },
                  recommended: { type: SchemaType.BOOLEAN, description: 'Whether this is the recommended option' },
                },
              },
              description: 'Array of 2–4 mutually exclusive options for the user to choose from.',
            },
          },
          required: ['summary', 'options'],
        },
      },
    ],
  },
  async handle(args, ctx) {
    const notifier = new NotificationAgent(ctx.threadId);
    const options = args.options as Array<{ label: string; details: string; price?: string; recommended?: boolean }>;

    await ctx.reportStep({
      type: 'waiting_approval',
      content: args.summary as string,
      timestamp: Date.now(),
    });

    await notifier.sendApprovalRequest(args.summary as string, options);
    const selectedIndex = await waitForApproval(ctx.threadId);
    const selected = options[selectedIndex];

    return `User selected option ${selectedIndex + 1}: "${selected.label}". ${selected.details}`;
  },
});

export class PersonalAgent {
  private steps: AgentStep[] = [];
  private genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

  constructor(
    private readonly threadId: string,
    private readonly agentMessageId: string | null = null,
    private readonly userId: string = ''
  ) {}

  private async reportStep(step: AgentStep): Promise<void> {
    this.steps.push(step);
    console.log(`[byte:${this.threadId}] ${step.type}: ${step.content}`);

    // 1. Emit instantly over SSE — no DB round-trip, frontend gets it immediately
    if (this.agentMessageId !== null) {
      broadcastStep(this.threadId, this.agentMessageId, step);
    }

    // 2. Persist to DB asynchronously — don't await, never block the agent loop
    if (this.agentMessageId !== null) {
      db.updateMessageMetadata(this.agentMessageId, {
        type: 'thinking',
        steps: this.steps,
        lastUpdated: Date.now(),
      }).catch(err => console.warn('[byte] Failed to persist step metadata:', err));
    }
  }

  async run(userMessage: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: env.GEMINI_MODEL,
      tools: registry.allTools(),
      systemInstruction: AGENT_SYSTEM_PROMPT,
    });

    const history = await this.buildHistory();

    await this.reportStep({
      type: 'thinking',
      content: 'Analyzing your request...',
      timestamp: Date.now(),
    });

    const ctx = {
      threadId: this.threadId,
      userId: this.userId,
      agentMessageId: this.agentMessageId,
      reportStep: this.reportStep.bind(this),
    };

    const chat = model.startChat({ history });
    let response = await chat.sendMessage(userMessage);

    let iterations = 0;
    const MAX_ITERATIONS = 20;

    while (iterations < MAX_ITERATIONS) {
      iterations++;
      const candidate = response.response.candidates?.[0];
      const parts: Part[] = candidate?.content?.parts ?? [];

      const functionCallParts = parts.filter(p => p.functionCall);
      if (functionCallParts.length === 0) break;

      const functionResults = await Promise.allSettled(
        functionCallParts.map(async (part) => {
          const { name, args } = part.functionCall!;
          try {
            const result = await registry.dispatch(name, args as Record<string, unknown>, ctx);
            return { functionResponse: { name, response: { result } } } as FunctionResponsePart;
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : 'Tool call failed';
            return { functionResponse: { name, response: { error: errMsg } } } as FunctionResponsePart;
          }
        })
      );

      const results: Part[] = functionResults.map(r =>
        r.status === 'fulfilled'
          ? r.value
          : ({ functionResponse: { name: 'unknown', response: { error: 'Failed' } } } as FunctionResponsePart)
      );

      response = await chat.sendMessage(results);
    }

    const finalText = response.response.text();

    if (this.agentMessageId) {
      await db.updateMessageMetadata(this.agentMessageId, { type: 'done', steps: this.steps });
    }

    const text = finalText || 'Task completed.';
    await db.insertMessage(this.threadId, 'agent', text, { type: 'final' });

    return text;
  }

  private async buildHistory(): Promise<Content[]> {
    try {
      const messages = await db.getMessagesByThread(this.threadId);
      const history: Content[] = [];

      for (const msg of messages) {
        if (this.agentMessageId && msg._id.toString() === this.agentMessageId) continue;
        if (msg.role === 'system') continue;
        if (!msg.content) continue;

        if (msg.role === 'user') {
          history.push({ role: 'user', parts: [{ text: msg.content }] });
        } else if (msg.role === 'agent') {
          history.push({ role: 'model', parts: [{ text: msg.content }] });
        }
      }

      // Gemini requires strict user/model alternation — drop trailing model turns
      while (history.length > 0 && history[history.length - 1].role === 'model') {
        history.pop();
      }

      // Collapse consecutive same-role entries
      const deduped: Content[] = [];
      for (const turn of history) {
        if (deduped.length > 0 && deduped[deduped.length - 1].role === turn.role) continue;
        deduped.push(turn);
      }

      return deduped;
    } catch {
      return [];
    }
  }
}
