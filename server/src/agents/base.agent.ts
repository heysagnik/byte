import * as stdb from '../services/spacetimedb.service';

export interface AgentStep {
  type: 'thinking' | 'searching' | 'calling' | 'result' | 'waiting_approval' | 'error';
  content: string;
  timestamp: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export abstract class BaseAgent<TInput = string> {
  protected steps: AgentStep[] = [];

  constructor(
    protected readonly threadId: number,
    protected readonly agentMessageId: number | null = null
  ) {}

  abstract run(input: TInput): Promise<string>;

  protected async reportStep(step: AgentStep): Promise<void> {
    this.steps.push(step);
    console.log(`[agent:${this.threadId}] ${step.type}: ${step.content}`);

    if (this.agentMessageId !== null) {
      try {
        await stdb.updateMessageMetadata(this.agentMessageId, {
          steps: this.steps,
          lastUpdated: Date.now(),
        });
      } catch (err) {
        console.warn('[agent] Failed to update message metadata:', err);
      }
    }
  }
}
