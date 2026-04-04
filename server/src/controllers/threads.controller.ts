import { Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware';
import * as db from '../services/db.service';
import { resolveApproval, hasPendingApproval } from '../services/approval.service';
import { addSSEClient } from '../services/sse.service';
import { PersonalAgent } from '../agents/personal.agent';
import { cancelThread, isThreadRunning } from '../agents/orchestrator';
import { Groq } from 'groq-sdk';
import { env } from '../config/env';

const groq = env.GROQ_API_KEY ? new Groq({ apiKey: env.GROQ_API_KEY }) : null;

const CreateThreadSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  initialMessage: z.string().optional(),
});

const ImageSchema = z.object({
  dataUrl: z.string().min(1),
  mimeType: z.string().min(1),
  name: z.string().min(1),
});

const SendMessageSchema = z.object({
  content: z.string().max(10000).default(''),
  images: z.array(ImageSchema).max(4).optional(),
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
  let title = parse.data.title ?? 'New conversation';

  const initialMessage = parse.data.initialMessage;

  if (initialMessage && groq) {
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: "You are an AI assistant that generates a concise, descriptive title for a conversation based on the user's first message. Return ONLY the title (maximum 6 words). Do not put it in quotes."
          },
          {
            role: 'user',
            content: initialMessage,
          }
        ],
        model: 'llama-3.3-70b-versatile',
        max_tokens: 15,
        temperature: 0.5,
      });
      const generatedTitle = chatCompletion.choices[0]?.message?.content?.trim();
      if (generatedTitle) {
        title = generatedTitle.replace(/^["']|["']$/g, '');
      }
    } catch (err) {
      console.error('[groq] Failed to generate title:', err);
    }
  }

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

  const { content, images } = parse.data;

  try {
    // Insert user message
    await db.insertMessage(threadId, 'user', content, {}, images);

    // Insert placeholder agent message
    const agentMsg = await db.insertMessage(threadId, 'agent', '', {
      type: 'thinking',
      steps: [],
    });
    const agentMessageId = agentMsg._id.toString();

    const userId = req.user!.userId;
    const clientIp =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
      req.socket.remoteAddress ??
      undefined;

    // Fire personal agent in background
    void (async () => {
      const agent = new PersonalAgent(threadId, agentMessageId, userId, clientIp);
      try {
        await agent.run(content, images);
      } catch (err) {
        console.error(`[agent] Error in thread ${threadId}:`, err);
        const errMsg = err instanceof Error ? err.message : 'Agent encountered an error';
        // Agent already marked the placeholder done and preserved its steps — just surface the error
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

export async function deleteThread(req: AuthRequest, res: Response): Promise<void> {
  const threadId = req.params['id'] as string;
  if (!isValidObjectId(threadId)) {
    res.status(400).json({ error: 'Invalid thread ID' });
    return;
  }
  try {
    const thread = await db.getThreadById(threadId);
    if (!thread || thread.userId.toString() !== req.user!.userId) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }
    await db.deleteThread(threadId);
    res.json({ status: 'deleted' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete thread';
    res.status(500).json({ error: message });
  }
}

export async function getMessages(req: AuthRequest, res: Response): Promise<void> {
  const threadId = req.params['id'] as string;
  if (!isValidObjectId(threadId)) {
    res.status(400).json({ error: 'Invalid thread ID' });
    return;
  }

  try {
    const thread = await db.getThreadById(threadId);
    if (!thread || thread.userId.toString() !== req.user!.userId) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }
    const messages = await db.getMessagesByThread(threadId);
    res.json({ messages: messages.map(db.serializeMessage) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch messages';
    res.status(500).json({ error: message });
  }
}

export async function streamThread(req: AuthRequest, res: Response): Promise<void> {
  const threadId = req.params['id'] as string;
  if (!isValidObjectId(threadId)) {
    res.status(400).end();
    return;
  }

  const thread = await db.getThreadById(threadId);
  if (!thread || thread.userId.toString() !== req.user!.userId) {
    res.status(404).end();
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write('event: connected\ndata: {}\n\n');

  const cleanup = addSSEClient(threadId, res);

  // Keep-alive ping every 25s to prevent proxy/browser timeouts
  const ping = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(ping);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(ping);
    cleanup();
  });
}

export async function cancelRun(req: AuthRequest, res: Response): Promise<void> {
  const threadId = req.params['id'] as string;
  if (!isValidObjectId(threadId)) {
    res.status(400).json({ error: 'Invalid thread ID' });
    return;
  }
  if (!isThreadRunning(threadId)) {
    res.status(404).json({ error: 'No active run for this thread' });
    return;
  }
  cancelThread(threadId);
  res.json({ status: 'cancelled' });
}
