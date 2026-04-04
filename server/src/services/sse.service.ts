import { Response } from 'express';

// threadId → active SSE response objects
const clients = new Map<string, Set<Response>>();

export function addSSEClient(threadId: string, res: Response): () => void {
  if (!clients.has(threadId)) clients.set(threadId, new Set());
  clients.get(threadId)!.add(res);

  return () => {
    clients.get(threadId)?.delete(res);
    if (clients.get(threadId)?.size === 0) clients.delete(threadId);
  };
}

/** Broadcast a single agent step instantly — no DB write, pure SSE push */
export function broadcastStep(threadId: string, agentMessageId: string, step: unknown): void {
  broadcastToThread(threadId, 'step:new', { agentMessageId, step });
}

export function broadcastToThread(threadId: string, event: string, data: unknown): void {
  const threadClients = clients.get(threadId);
  if (!threadClients || threadClients.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  for (const res of threadClients) {
    try {
      res.write(payload);
    } catch {
      threadClients.delete(res);
    }
  }
}
