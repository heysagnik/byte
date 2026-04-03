import { GoogleGenerativeAI, Content, Part, FunctionResponsePart } from '@google/generative-ai';
import { BaseAgent } from './base.agent';
import { WebSearchAgent } from './websearch.agent';
import { PhoneCallAgent } from './phonecall.agent';
import { NotificationAgent } from './notification.agent';
import { waitForApproval } from '../services/approval.service';
import * as db from '../services/db.service';
import { env } from '../config/env';
import { ORCHESTRATOR_TOOLS, ORCHESTRATOR_SYSTEM_PROMPT } from './tools';

export class OrchestratorAgent extends BaseAgent {
  private genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  private notifier: NotificationAgent;

  constructor(threadId: string, agentMessageId: string | null = null) {
    super(threadId, agentMessageId);
    this.notifier = new NotificationAgent(threadId);
  }

  async run(userMessage: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      tools: ORCHESTRATOR_TOOLS,
      systemInstruction: ORCHESTRATOR_SYSTEM_PROMPT,
    });

    const history = await this.buildHistory(userMessage);

    await this.reportStep({
      type: 'thinking',
      content: 'Analyzing your request...',
      timestamp: Date.now(),
    });

    const chat = model.startChat({ history: history.slice(0, -1) });
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
            const result = await this.dispatchTool(name, args as Record<string, unknown>);
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

    if (finalText) {
      await db.insertMessage(this.threadId, 'agent', finalText, { type: 'final' });
    }

    return finalText;
  }

  private async dispatchTool(name: string, args: Record<string, unknown>): Promise<string> {
    switch (name) {
      case 'web_search': {
        const agent = new WebSearchAgent(this.threadId, this.agentMessageId);
        return agent.run(args.query as string, (args.num_results as number) ?? 5);
      }

      case 'make_phone_call': {
        const agent = new PhoneCallAgent(this.threadId, this.agentMessageId);
        return agent.run(args as { phone_number: string; business_name: string; objective: string; context?: string });
      }

      case 'request_user_approval': {
        await this.reportStep({
          type: 'waiting_approval',
          content: args.summary as string,
          timestamp: Date.now(),
        });

        const options = args.options as Array<{ label: string; details: string; price?: string; recommended?: boolean }>;
        await this.notifier.sendApprovalRequest(args.summary as string, options);

        const selectedIndex = await waitForApproval(this.threadId);
        const selected = options[selectedIndex];

        return `User approved option ${selectedIndex + 1}: "${selected.label}". ${selected.details}`;
      }

      case 'send_notification': {
        return this.notifier.send(
          args.message as string,
          args.type as 'info' | 'success' | 'error' | 'waiting'
        );
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async buildHistory(latestMessage: string): Promise<Content[]> {
    try {
      const messages = await db.getMessagesByThread(this.threadId);
      const history: Content[] = [];

      for (const msg of messages) {
        if (msg.role === 'user') {
          history.push({ role: 'user', parts: [{ text: msg.content }] });
        } else if (msg.role === 'agent' && msg.content) {
          history.push({ role: 'model', parts: [{ text: msg.content }] });
        }
      }

      history.push({ role: 'user', parts: [{ text: latestMessage }] });
      return history;
    } catch {
      return [{ role: 'user', parts: [{ text: latestMessage }] }];
    }
  }
}
