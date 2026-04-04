import { GoogleGenerativeAI, Content, Part, FunctionResponsePart } from '@google/generative-ai';
import { SchemaType } from '@google/generative-ai';
import { NotificationAgent } from './notification.agent';
import { waitForApproval } from '../services/approval.service';
import { registry } from './registry';
import * as db from '../services/db.service';
import { env } from '../config/env';
import { AgentStep } from './types';
import { broadcastStep } from '../services/sse.service';
import { registerCoreTools } from './manifest';

// ── Tool registration ─────────────────────────────────────────────────────────
// Core tools registered once — idempotent, safe to call multiple times
registerCoreTools();

registry.register('request_user_approval', {
  tools: {
    functionDeclarations: [{
      name: 'request_user_approval',
      description:
        'Pause execution and present 2–4 concrete, mutually exclusive options for the user to choose from. ' +
        'Resumes only when the user selects one. ' +
        'ONLY use when: options are confirmed and meaningfully different, and a commitment is imminent. ' +
        'Do NOT use for check-ins or progress updates — use send_notification for those.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          summary: {
            type: SchemaType.STRING,
            description: 'What was found and what the user needs to decide.',
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
            description: '2–4 mutually exclusive options.',
          },
        },
        required: ['summary', 'options'],
      },
    }],
  },
  async handle(args, ctx) {
    const notifier = new NotificationAgent(ctx.threadId);
    const options = args.options as Array<{ label: string; details: string; price?: string; recommended?: boolean }>;

    await ctx.reportStep({ type: 'waiting_approval', content: args.summary as string, timestamp: Date.now() });
    await notifier.sendApprovalRequest(args.summary as string, options);

    const selectedIndex = await waitForApproval(ctx.threadId);
    const selected = options[selectedIndex];
    return `User selected option ${selectedIndex + 1}: "${selected.label}". ${selected.details}`;
  },
});

// ── System prompt builder ─────────────────────────────────────────────────────

function buildSystemPrompt(callerName: string): string {
  return `You are Byte — the personal AI agent of ${callerName}. You act as a direct extension of ${callerName}, executing real-world tasks with precision. You are not a chatbot; you take action.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHO YOU ARE WORKING FOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Your owner: ${callerName}
When making phone calls, you speak AS ${callerName} — first person, naturally, as if it were them calling directly.
When writing messages or summaries, you report back to ${callerName} in first person ("I called...", "I found...", "I booked...").

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOOLS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

web_search
  Returns numbered Google results [title, URL, snippet].
  Use for: phone numbers, prices, addresses, hours, availability, any factual lookup.
  Rule: run multiple independent searches in the SAME turn (parallel). Do not chain searches one at a time.
  Rule: if the user already provided a phone number, do NOT search for it.

mcp_phonecall_make_phone_call
  Initiates an outbound AI voice call. The voice agent speaks AS ${callerName}, not "on behalf of".
  Returns: call transcript + summary.
  caller_name: always pass "${callerName}" — it is already known, do not ask.
  objective: be specific. Include dates, amounts, what to confirm, what to ask. One clear sentence.
  context: include relationship to ${callerName}, prior conversation, any constraints.
  Rule: calls are SEQUENTIAL — never fire two calls in the same turn.
  Rule: call directly when a number is given. Only search first when you need to find the number.

request_user_approval
  Pauses execution until ${callerName} picks an option.
  Use ONLY when: you have 2–4 confirmed, meaningfully different options AND a commitment is about to be made.
  Never use to check in or ask questions — use send_notification for that.

send_notification
  Sends a live status update to the chat. Does not pause execution.
  Use between long steps. Be specific: name the business, price, action taken, or outcome.
  Types: "info" (in progress), "success" (done), "error" (failed), "waiting" (paused).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXECUTION MODEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Follow this sequence for every task:

1. PARSE      — Extract the exact intent. Identify what is given vs. what needs to be found.
2. PLAN       — Decide which tools are needed and in what order. Run independent lookups in parallel.
3. RESEARCH   — web_search for any missing facts. Skip entirely if all info is provided.
4. NOTIFY     — send_notification("info") with what you found and what you'll do next.
5. ACT        — Execute: call, book, confirm, send. One action at a time for sequential tools.
6. GATE       — request_user_approval before any irreversible commitment (booking, payment, agreement).
7. FINISH     — send_notification("success") + write final summary.

PARALLEL RULE: web_search calls can always run in parallel. mcp_phonecall_make_phone_call and request_user_approval are always sequential.

PHONE CALL RULES — STRICT:
- Call each number AT MOST ONCE per task. Do not call the same number again even if the transcript looks short or empty.
- A call that returns a transcript (even 1 turn) is COMPLETE — summarise it and finish.
- A call that returns "no transcript available" means the recipient did not answer — tell ${callerName} and stop. Do not retry.
- Never initiate a new call unless ${callerName} explicitly asks for it in a follow-up message.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ERROR RECOVERY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Search returned nothing useful → refine query (add city/name/"phone number") and retry ONCE.
- Phone call returned an API error (not a transcript) → report the error, do not retry the call.
- No good options for approval → do more research before presenting.
- Two consecutive failures at the same step → send_notification("error") and explain in the final message.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXT STABILITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Never lose track of what was asked. If a tool result is long, extract the key facts before moving on.
- If you are mid-task and the user sends a follow-up, finish the current task or acknowledge the interruption before switching.
- Do not re-ask for information that was already provided in the conversation.
- Do not hallucinate phone numbers, prices, or availability. Only use what was returned by tools.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINAL RESPONSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Write a concise summary that:
- States exactly what was done (or why it couldn't be done)
- Surfaces key facts: names, prices, dates, outcomes, confirmed details
- Lists any next steps ${callerName} needs to take personally
- Uses **bold** for important values (prices, dates, names, numbers)

Do not narrate your thought process. Speak to ${callerName} directly. Be brief.`;
}

// ── Agent class ───────────────────────────────────────────────────────────────

export class PersonalAgent {
  private steps: AgentStep[] = [];
  private stepCount = 0; // tracks DB write ordering to prevent stale writes overwriting 'done'
  private genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

  constructor(
    private readonly threadId: string,
    private readonly agentMessageId: string | null = null,
    private readonly userId: string = ''
  ) {}

  /**
   * Returns the user's name if stored, null if unknown.
   * If userMessage looks like a name response, saves it to the User record.
   */
  private async resolveCallerName(userMessage: string): Promise<string | null> {
    if (!this.userId) return process.env['CALLER_NAME'] ?? null;
    try {
      const { User } = await import('../models/User.js');
      const user = await User.findById(this.userId);
      if (user?.name) return user.name;

      // Detect if the message IS the user's name (response to our question)
      const nameMatch =
        userMessage.match(/^(?:my name is|i(?:'m| am)|call me)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i) ??
        userMessage.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\.?$/);

      if (nameMatch) {
        const name = nameMatch[1].trim();
        await User.findByIdAndUpdate(this.userId, { name });
        return name;
      }
    } catch { /* non-fatal */ }
    return null;
  }

  private async reportStep(step: AgentStep): Promise<void> {
    this.steps.push(step);
    const writeSeq = ++this.stepCount;
    console.log(`[byte:${this.threadId}] ${step.type}: ${step.content}`);

    if (this.agentMessageId === null) return;

    // Emit over SSE instantly — no DB wait
    broadcastStep(this.threadId, this.agentMessageId, step);

    // Persist async — attach sequence number so a late write can't overwrite a newer state
    const snapshot = [...this.steps];
    db.updateMessageMetadata(this.agentMessageId, {
      type: 'thinking',
      steps: snapshot,
      seq: writeSeq,
    }).catch(err => console.warn('[byte] step persist failed:', err));
  }

  async run(userMessage: string): Promise<string> {
    const callerName = await this.resolveCallerName(userMessage);

    // If we don't know the user's name yet, ask and stop — don't proceed with any task.
    if (!callerName) {
      const text = "Hi! Before we get started, what's your name? I'll use it when making calls or taking actions on your behalf.";
      await db.insertMessage(this.threadId, 'agent', text, { type: 'final' });
      if (this.agentMessageId) {
        await db.updateMessageMetadata(this.agentMessageId, { type: 'done', steps: [] });
      }
      return text;
    }

    const FALLBACK_MODEL = 'gemma-4-31b-it';
    const tools = registry.allTools();
    const systemInstruction = buildSystemPrompt(callerName);

    // gemma-4-31b-it does not support function calling — omit tools when using it as fallback
    const getModel = (modelName: string) =>
      this.genAI.getGenerativeModel({
        model: modelName,
        ...(modelName === FALLBACK_MODEL ? {} : { tools }),
        systemInstruction,
      });

    const history = await this.buildHistory();

    await this.reportStep({ type: 'thinking', content: 'Analyzing your request...', timestamp: Date.now() });

    const ctx = {
      threadId: this.threadId,
      userId: this.userId,
      agentMessageId: this.agentMessageId,
      reportStep: this.reportStep.bind(this),
    };

    // Try primary model, fall back to gemini-2.5-flash on 503 Service Unavailable
    let activeModel = env.GEMINI_MODEL;
    let chat = getModel(activeModel).startChat({ history });
    let response = await chat.sendMessage(userMessage).catch(async (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('overloaded')) {
        console.warn(`[byte] ${activeModel} unavailable, falling back to ${FALLBACK_MODEL}`);
        activeModel = FALLBACK_MODEL;
        chat = getModel(FALLBACK_MODEL).startChat({ history });
        return chat.sendMessage(userMessage);
      }
      throw err;
    });

    let iterations = 0;
    const MAX_ITERATIONS = 20;

    while (iterations < MAX_ITERATIONS) {
      iterations++;
      const parts: Part[] = response.response.candidates?.[0]?.content?.parts ?? [];

      const callParts = parts.filter(p => p.functionCall);
      if (callParts.length === 0) break;

      // Enforce sequencing: phone calls and approvals must run one at a time.
      // Web searches can run in parallel.
      const isSequential = (name: string) =>
        name === 'mcp_phonecall_make_phone_call' || name === 'request_user_approval';

      let results: FunctionResponsePart[];

      if (callParts.some(p => isSequential(p.functionCall!.name))) {
        // Run all calls sequentially when any sequential tool is present
        results = [];
        for (const part of callParts) {
          const { name, args } = part.functionCall!;
          try {
            const result = await registry.dispatch(name, args as Record<string, unknown>, ctx);
            results.push({ functionResponse: { name, response: { result } } });
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : 'Tool call failed';
            results.push({ functionResponse: { name, response: { error: errMsg } } });
          }
        }
      } else {
        // All parallel-safe (web_search etc.) — run concurrently
        const settled = await Promise.allSettled(
          callParts.map(async part => {
            const { name, args } = part.functionCall!;
            const result = await registry.dispatch(name, args as Record<string, unknown>, ctx);
            return { functionResponse: { name, response: { result } } } as FunctionResponsePart;
          })
        );
        results = settled.map((r, i) =>
          r.status === 'fulfilled'
            ? r.value
            : { functionResponse: { name: callParts[i].functionCall!.name, response: { error: r.reason instanceof Error ? r.reason.message : 'Tool call failed' } } }
        );
      }

      response = await chat.sendMessage(results as Part[]).catch(async (err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        if ((msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('overloaded')) && activeModel !== FALLBACK_MODEL) {
          console.warn(`[byte] ${activeModel} unavailable mid-loop, switching to ${FALLBACK_MODEL}`);
          activeModel = FALLBACK_MODEL;
          chat = getModel(FALLBACK_MODEL).startChat({ history });
          return chat.sendMessage(results as Part[]);
        }
        throw err;
      });
    }

    const finalText = response.response.text();

    // Mark placeholder done — use current stepCount so this write is always newest
    if (this.agentMessageId) {
      await db.updateMessageMetadata(this.agentMessageId, {
        type: 'done',
        steps: this.steps,
        seq: this.stepCount + 1,
      });
    }

    const text = finalText || 'Task completed.';
    await db.insertMessage(this.threadId, 'agent', text, { type: 'final' });

    return text;
  }

  private async buildHistory(): Promise<Content[]> {
    try {
      const messages = await db.getMessagesByThread(this.threadId);
      const raw: Content[] = [];

      for (const msg of messages) {
        // Skip the current in-progress placeholder and empty messages
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
      // Deduplicate consecutive same-role entries, then drop trailing model turn
      const deduped: Content[] = [];
      for (const turn of raw) {
        if (deduped.length > 0 && deduped[deduped.length - 1].role === turn.role) continue;
        deduped.push(turn);
      }
      while (deduped.length > 0 && deduped[deduped.length - 1].role === 'model') {
        deduped.pop();
      }

      return deduped;
    } catch {
      return [];
    }
  }
}
