import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as stdb from '../services/spacetimedb.service';
import { resolveApproval, hasPendingApproval } from '../services/approval.service';
import { OrchestratorAgent } from '../agents/orchestrator.agent';

const CreateThreadSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

const SendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
});

const ApproveSchema = z.object({
  optionIndex: z.number().int().min(0),
});

export async function createThread(req: AuthRequest, res: Response): Promise<void> {
  const parse = CreateThreadSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const userId = req.user!.userId;
  const title = parse.data.title ?? 'New conversation';

  try {
    await stdb.createThread(userId, title);
    const thread = await stdb.getLatestThread(userId);
    if (!thread) {
      res.status(500).json({ error: 'Failed to create thread' });
      return;
    }
    res.status(201).json({ id: thread.id, title: thread.title });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create thread';
    res.status(500).json({ error: message });
  }
}

export async function getThreads(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  try {
    const threads = await stdb.getThreadsByUser(userId);
    res.json({ threads });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch threads';
    res.status(500).json({ error: message });
  }
}

export async function sendMessage(req: AuthRequest, res: Response): Promise<void> {
  const threadId = parseInt(req.params['id'] as string, 10);
  if (isNaN(threadId)) {
    res.status(400).json({ error: 'Invalid thread ID' });
    return;
  }

  const parse = SendMessageSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const { content } = parse.data;

  try {
    // Insert user message
    await stdb.insertMessage(threadId, 'user', content, {});

    // Create a placeholder agent message that will be updated with steps
    await stdb.insertMessage(threadId, 'agent', '', {
      type: 'thinking',
      steps: [],
    });

    // Get the placeholder message ID for live step updates
    const agentMsg = await stdb.getLatestMessage(threadId, 'agent');
    const agentMessageId = agentMsg?.id ?? null;

    // Fire orchestrator in the background (don't await)
    void (async () => {
      const orchestrator = new OrchestratorAgent(threadId, agentMessageId);
      try {
        await orchestrator.run(content);
      } catch (err) {
        console.error(`[orchestrator] Error in thread ${threadId}:`, err);
        const errMsg = err instanceof Error ? err.message : 'Agent encountered an error';
        await stdb.insertMessage(threadId, 'system', `Error: ${errMsg}`, { type: 'error' });
      }
    })();

    res.json({ status: 'processing', agentMessageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send message';
    res.status(500).json({ error: message });
  }
}

export async function approveOption(req: AuthRequest, res: Response): Promise<void> {
  const threadId = parseInt(req.params['id'] as string, 10);
  if (isNaN(threadId)) {
    res.status(400).json({ error: 'Invalid thread ID' });
    return;
  }

  if (!hasPendingApproval(threadId)) {
    res.status(404).json({ error: 'No pending approval for this thread' });
    return;
  }

  const parse = ApproveSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  resolveApproval(threadId, parse.data.optionIndex);
  res.json({ status: 'approved', optionIndex: parse.data.optionIndex });
}

export async function getMessages(req: AuthRequest, res: Response): Promise<void> {
  const threadId = parseInt(req.params['id'] as string, 10);
  if (isNaN(threadId)) {
    res.status(400).json({ error: 'Invalid thread ID' });
    return;
  }

  try {
    const messages = await stdb.getMessagesByThread(threadId);
    res.json({ messages });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch messages';
    res.status(500).json({ error: message });
  }
}
