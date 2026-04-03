import * as stdb from '../services/spacetimedb.service';

export class NotificationAgent {
  constructor(private readonly threadId: number) {}

  async send(message: string, type: 'info' | 'success' | 'error' | 'waiting'): Promise<string> {
    await stdb.insertMessage(this.threadId, 'system', message, { type });
    return `Notification sent: ${message}`;
  }

  async sendApprovalRequest(
    summary: string,
    options: Array<{ label: string; details: string; price?: string; recommended?: boolean }>
  ): Promise<string> {
    await stdb.insertMessage(this.threadId, 'system', summary, {
      type: 'waiting_approval',
      options,
    });
    return `Approval request sent with ${options.length} options`;
  }
}
