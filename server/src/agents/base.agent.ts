import * as db from '../services/db.service';

export interface AgentStep {
  type: 'thinking' | 'searching' | 'calling' | 'result' | 'waiting_approval' | 'error';
  content: string;
  timestamp: number;
}

export abstract class BaseAgent<TInput = string> {
  protected steps: AgentStep[] = [];

  constructor(
    protected readonly threadId: string,
    protected readonly agentMessageId: string | null = null
  ) {}

  abstract run(input: TInput): Promise<string>;

  protected async reportStep(step: AgentStep): Promise<void> {
    this.steps.push(step);
    console.log(`[agent:${this.threadId}] ${step.type}: ${step.content}`);

    if (this.agentMessageId !== null) {
      try {
        await db.updateMessageMetadata(this.agentMessageId, {
          steps: this.steps,
          lastUpdated: Date.now(),
        });
      } catch (err) {
        console.warn('[agent] Failed to update message metadata:', err);
      }
    }
  }
}
