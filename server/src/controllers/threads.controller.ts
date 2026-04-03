import { Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware';
import * as db from '../services/db.service';
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

function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}

export async function createThread(req: AuthRequest, res: Response): Promise<void> {
  const parse = CreateThreadSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const userId = req.user!.userId;
  const title = parse.data.title ?? 'New conversation';

  try {
    const thread = await db.createThread(userId, title);
    res.status(201).json(db.serializeThread(thread));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create thread';
    res.status(500).json({ error: message });
  }
}

export async function getThreads(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  try {
    const threads = await db.getThreadsByUser(userId);
    res.json({ threads: threads.map(db.serializeThread) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch threads';
    res.status(500).json({ error: message });
  }
}

export async function sendMessage(req: AuthRequest, res: Response): Promise<void> {
  const threadId = req.params['id'] as string;
  if (!isValidObjectId(threadId)) {
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
    await db.insertMessage(threadId, 'user', content, {});

    // Insert placeholder agent message
    const agentMsg = await db.insertMessage(threadId, 'agent', '', {
      type: 'thinking',
      steps: [],
    });
    const agentMessageId = agentMsg._id.toString();

    // Fire orchestrator in background
    void (async () => {
      const orchestrator = new OrchestratorAgent(threadId, agentMessageId);
      try {
        await orchestrator.run(content);
      } catch (err) {
        console.error(`[orchestrator] Error in thread ${threadId}:`, err);
        const errMsg = err instanceof Error ? err.message : 'Agent encountered an error';
        await db.insertMessage(threadId, 'system', `Error: ${errMsg}`, { type: 'error' });
      }
    })();

    res.json({ status: 'processing', agentMessageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send message';
    res.status(500).json({ error: message });
  }
}

export async function approveOption(req: AuthRequest, res: Response): Promise<void> {
  const threadId = req.params['id'] as string;
  if (!isValidObjectId(threadId)) {
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
  const threadId = req.params['id'] as string;
  if (!isValidObjectId(threadId)) {
    res.status(400).json({ error: 'Invalid thread ID' });
    return;
  }

  try {
    const messages = await db.getMessagesByThread(threadId);
    res.json({ messages: messages.map(db.serializeMessage) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch messages';
    res.status(500).json({ error: message });
  }
}
