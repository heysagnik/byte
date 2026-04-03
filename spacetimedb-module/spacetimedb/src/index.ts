import spacetimedb from './schema';
import { t } from 'spacetimedb/server';
import { SenderError } from 'spacetimedb/server';

export { default } from './schema';

// ─── LIFECYCLE ───────────────────────────────────────────────────────────────

export const onConnect = spacetimedb.clientConnected((_ctx) => {
  // Client connected
});

export const onDisconnect = spacetimedb.clientDisconnected((_ctx) => {
  // Client disconnected
});

// ─── REDUCERS ────────────────────────────────────────────────────────────────

export const createUser = spacetimedb.reducer(
  { email: t.string(), passwordHash: t.string() },
  (ctx, { email, passwordHash }) => {
    const existing = ctx.db.User.email.find(email);
    if (existing) throw new SenderError(`Email already registered: ${email}`);
    ctx.db.User.insert({ id: 0n, email, passwordHash, createdAt: ctx.timestamp });
  }
);

export const createThread = spacetimedb.reducer(
  { userId: t.u64(), title: t.string() },
  (ctx, { userId, title }) => {
    ctx.db.Thread.insert({ id: 0n, userId, title, createdAt: ctx.timestamp });
  }
);

export const insertMessage = spacetimedb.reducer(
  { threadId: t.u64(), role: t.string(), content: t.string(), metadata: t.string() },
  (ctx, { threadId, role, content, metadata }) => {
    ctx.db.Message.insert({ id: 0n, threadId, role, content, metadata, createdAt: ctx.timestamp });
  }
);

export const updateMessageMetadata = spacetimedb.reducer(
  { messageId: t.u64(), metadata: t.string() },
  (ctx, { messageId, metadata }) => {
    const existing = ctx.db.Message.id.find(messageId);
    if (!existing) throw new SenderError(`Message not found: ${messageId}`);
    ctx.db.Message.id.update({ ...existing, metadata });
  }
);

export const deleteThread = spacetimedb.reducer(
  { threadId: t.u64() },
  (ctx, { threadId }) => {
    ctx.db.Thread.id.delete(threadId);
  }
);
