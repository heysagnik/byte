import { schema, table, t } from 'spacetimedb/server';

// ─── TABLES ─────────────────────────────────────────────────────────────────

const User = table(
  { name: 'user', public: false },
  {
    id: t.u64().primaryKey().autoInc(),
    email: t.string().unique(),
    passwordHash: t.string(),
    createdAt: t.timestamp(),
  }
);

const Thread = table(
  {
    name: 'thread',
    public: true,
    indexes: [{ accessor: 'thread_user_id', algorithm: 'btree', columns: ['userId'] }],
  },
  {
    id: t.u64().primaryKey().autoInc(),
    userId: t.u64(),
    title: t.string(),
    createdAt: t.timestamp(),
  }
);

const Message = table(
  {
    name: 'message',
    public: true,
    indexes: [{ accessor: 'message_thread_id', algorithm: 'btree', columns: ['threadId'] }],
  },
  {
    id: t.u64().primaryKey().autoInc(),
    threadId: t.u64(),
    role: t.string(),     // "user" | "agent" | "system"
    content: t.string(),
    metadata: t.string(), // JSON: agent steps, approval options, type
    createdAt: t.timestamp(),
  }
);

// ─── SCHEMA ─────────────────────────────────────────────────────────────────

const spacetimedb = schema({ User, Thread, Message });
export default spacetimedb;
