import { SchemaType } from '@google/generative-ai';
import type { ToolHandler } from './registry';
import * as db from '../services/db.service';

export class NotificationAgent {
  constructor(private readonly threadId: string) {}

  async send(message: string, type: 'info' | 'success' | 'error' | 'waiting'): Promise<string> {
    await db.insertMessage(this.threadId, 'system', message, { type });
    return `Notification sent: ${message}`;
  }

  async sendApprovalRequest(
    summary: string,
    options: Array<{ label: string; details: string; price?: string; recommended?: boolean }>,
  ): Promise<string> {
    await db.insertMessage(this.threadId, 'system', summary, { type: 'waiting_approval', options });
    return `Approval request sent with ${options.length} options`;
  }
}

export const notificationTool: ToolHandler = {
  tools: {
    functionDeclarations: [
      {
        name: 'send_notification',
        description:
          'Send a status update to the user thread without pausing execution. ' +
          'Use between steps to keep the user informed. Be specific — name what was found, done, or failed. ' +
          'Types: "info" = in-progress update, "success" = step or task complete, "error" = something failed, "waiting" = paused for external event.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            message: {
              type: SchemaType.STRING,
              description: 'The message content. Use markdown for formatting when helpful.',
            },
            type: {
              type: SchemaType.STRING,
              format: 'enum',
              enum: ['info', 'success', 'error', 'waiting'],
              description: 'Determines how the message is displayed in the UI.',
            },
          },
          required: ['message', 'type'],
        },
      },
    ],
  },
  async handle(args: Record<string, unknown>, ctx: import('./registry').ToolContext) {
    const agent = new NotificationAgent(ctx.threadId);
    return agent.send(
      args.message as string,
      args.type as 'info' | 'success' | 'error' | 'waiting',
    );
  },
};
