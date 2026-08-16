/**
 * SubAgent — a focused, single-task agent with a restricted tool set.
 * Spawned by the OrchestratorAgent to run a specific workstream in parallel.
 * Powered by LangChain ChatOpenAI (NVIDIA NIM / OpenRouter).
 */

import { SystemMessage, HumanMessage, ToolMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { registry } from './registry';
import { buildSubAgentPrompt } from './prompts';
import { createLLMClient } from './llm.factory';
import type { AgentContext, SubAgentResult } from './context';

const MAX_ITERATIONS = 10;

export class SubAgent {
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

  private async _execute(): Promise<string> {
    const subCtx = {
      ...this.ctx,
      reportStep: async (step: import('./context').AgentStep) => {
        await this.ctx.reportStep({ ...step, agentLabel: this.agentName });
      },
    };

    const allowed = ['web_search', 'map_search', ...this.allowedToolNames];
    const lcTools = registry.asLangChainTools(subCtx, allowed);

    const systemPrompt = buildSubAgentPrompt(
      this.ctx.user,
      this.agentName,
      this.task,
      this.allowedToolNames,
    );

    const model = createLLMClient(0.2);
    const modelWithTools = lcTools.length > 0 ? model.bindTools(lcTools) : model;

    const messages: BaseMessage[] = [
      new SystemMessage(systemPrompt),
      new HumanMessage(this.task),
    ];

    let iterations = 0;
    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const response = await modelWithTools.invoke(messages);
      messages.push(response);

      const toolCalls = (response as AIMessage).tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        break;
      }

      // Execute sub-agent tool calls concurrently
      const toolResults = await Promise.all(
        toolCalls.map(async call => {
          try {
            const output = await registry.dispatch(call.name, call.args, subCtx);
            return new ToolMessage({
              content: output,
              tool_call_id: call.id || call.name,
            });
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : 'Tool execution failed';
            return new ToolMessage({
              content: `Error: ${errMsg}`,
              tool_call_id: call.id || call.name,
            });
          }
        }),
      );

      messages.push(...toolResults);
    }

    const lastMsg = messages[messages.length - 1];
    return typeof lastMsg.content === 'string'
      ? lastMsg.content
      : JSON.stringify(lastMsg.content);
  }
}
