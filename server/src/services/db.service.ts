import { Types } from 'mongoose';
import { User, IUser } from '../models/User';
import { Thread, IThread } from '../models/Thread';
import { Message, IMessage, IMessageImage, MessageRole } from '../models/Message';
import { broadcastToThread } from './sse.service';

// ─── User ────────────────────────────────────────────────────────────────────

export async function findUserByEmail(email: string): Promise<IUser | null> {
  return User.findOne({ email: email.toLowerCase().trim() });
}

export async function createUser(email: string, passwordHash: string): Promise<IUser> {
  return User.create({ email, passwordHash });
}

// ─── Thread ──────────────────────────────────────────────────────────────────

export async function createThread(userId: string, title: string): Promise<IThread> {
  return Thread.create({ userId: new Types.ObjectId(userId), title });
}

export async function getThreadsByUser(userId: string): Promise<IThread[]> {
  return Thread.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 });
}

export async function getThreadById(threadId: string): Promise<IThread | null> {
  return Thread.findById(threadId);
}

// ─── Message ─────────────────────────────────────────────────────────────────

export async function insertMessage(
  threadId: string,
  role: MessageRole,
  content: string,
  metadata: Record<string, unknown> = {},
  images?: IMessageImage[]
): Promise<IMessage> {
  const msg = await Message.create({
    threadId: new Types.ObjectId(threadId),
    role,
    content,
    metadata,
    ...(images && images.length > 0 ? { images } : {}),
  });

  broadcastToThread(threadId, 'message:new', serializeMessage(msg));

  return msg;
}

export async function updateMessageMetadata(
  messageId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const msg = await Message.findByIdAndUpdate(
    messageId,
    { $set: { metadata } },
    { returnDocument: 'after' }
  );
  if (msg) {
    broadcastToThread(msg.threadId.toString(), 'message:update', serializeMessage(msg));
  }
}

export async function updateMessageContent(
  messageId: string,
  content: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const update: Record<string, unknown> = { content };
  if (metadata !== undefined) update.metadata = metadata;
  const msg = await Message.findByIdAndUpdate(messageId, { $set: update }, { returnDocument: 'after' });
  if (msg) {
    broadcastToThread(msg.threadId.toString(), 'message:update', serializeMessage(msg));
  }
}

export async function getMessagesByThread(threadId: string): Promise<IMessage[]> {
  return Message.find({ threadId: new Types.ObjectId(threadId) }).sort({ createdAt: 1 });
}

export async function deleteThread(threadId: string): Promise<void> {
  await Promise.all([
    Thread.findByIdAndDelete(threadId),
    Message.deleteMany({ threadId: new Types.ObjectId(threadId) }),
  ]);
}

export async function getLatestMessage(
  threadId: string,
  role: MessageRole
): Promise<IMessage | null> {
  return Message.findOne({ threadId: new Types.ObjectId(threadId), role }).sort({ createdAt: -1 });
}

// ─── Serialization (for socket payloads and API responses) ───────────────────

export function serializeMessage(msg: IMessage) {
  return {
    id: msg._id.toString(),
    threadId: msg.threadId.toString(),
    role: msg.role,
    content: msg.content,
    images: msg.images,
    metadata: msg.metadata,
    createdAt: msg.createdAt,
  };
}

export function serializeThread(thread: IThread) {
  return {
    id: thread._id.toString(),
    userId: thread.userId.toString(),
    title: thread.title,
    createdAt: thread.createdAt,
  };
}
