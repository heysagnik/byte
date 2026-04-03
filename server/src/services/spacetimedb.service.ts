/**
 * SpacetimeDB HTTP service.
 * Calls reducers and queries tables via SpacetimeDB's REST API.
 */
import axios from 'axios';
import { env } from '../config/env';

const BASE_URL = `https://${env.SPACETIMEDB_HOST}`;
const MODULE = env.SPACETIMEDB_MODULE;

function authHeaders() {
  const token = env.SPACETIMEDB_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Call a reducer on the SpacetimeDB module.
 * POST /v1/database/:name/call/:reducer  — body is JSON args
 */
async function callReducer(reducerName: string, args: Record<string, unknown>): Promise<void> {
  const url = `${BASE_URL}/v1/database/${MODULE}/call/${reducerName}`;
  await axios.post(url, args, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
  });
}

/**
 * Run a SQL query against the SpacetimeDB module.
 * POST /v1/database/:name/sql  — body is plain text SQL
 * Response: [{ schema: { elements: [{name:{some:col}, ...}] }, rows: [[...]] }]
 */
async function query<T = unknown>(sql: string): Promise<T[]> {
  const url = `${BASE_URL}/v1/database/${MODULE}/sql`;
  const res = await axios.post(url, sql, {
    headers: {
      'Content-Type': 'text/plain',
      ...authHeaders(),
    },
  });

  // Response is an array of result sets
  const resultSets = res.data as Array<{
    schema: { elements: Array<{ name: { some: string } }> };
    rows: unknown[][];
  }>;

  if (!resultSets?.length || !resultSets[0].rows) return [];

  const { schema, rows } = resultSets[0];
  const columns = schema.elements.map(e => e.name.some);

  return rows.map(row => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as T;
  });
}

// ─── Typed reducer calls ──────────────────────────────────────────────────────

export async function createUser(email: string, passwordHash: string): Promise<void> {
  await callReducer('create_user', { email, passwordHash });
}

export async function createThread(userId: number, title: string): Promise<void> {
  await callReducer('create_thread', { userId, title });
}

export async function insertMessage(
  threadId: number,
  role: string,
  content: string,
  metadata: object
): Promise<void> {
  await callReducer('insert_message', {
    threadId,
    role,
    content,
    metadata: JSON.stringify(metadata),
  });
}

export async function updateMessageMetadata(messageId: number, metadata: object): Promise<void> {
  await callReducer('update_message_metadata', {
    messageId,
    metadata: JSON.stringify(metadata),
  });
}

// ─── Row types (snake_case matches DB column names) ───────────────────────────

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  created_at: unknown;
}

export interface ThreadRow {
  id: number;
  user_id: number;
  title: string;
  created_at: unknown;
}

export interface MessageRow {
  id: number;
  thread_id: number;
  role: string;
  content: string;
  metadata: string;
  created_at: unknown;
}

// ─── Typed queries ────────────────────────────────────────────────────────────

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const safe = email.replace(/'/g, "''");
  const rows = await query<UserRow>(`SELECT * FROM user WHERE email = '${safe}'`);
  return rows[0] ?? null;
}

export async function getThreadsByUser(userId: number): Promise<ThreadRow[]> {
  return query<ThreadRow>(`SELECT * FROM thread WHERE user_id = ${userId} ORDER BY created_at DESC`);
}

export async function getMessagesByThread(threadId: number): Promise<MessageRow[]> {
  return query<MessageRow>(`SELECT * FROM message WHERE thread_id = ${threadId} ORDER BY created_at ASC`);
}

export async function getLatestThread(userId: number): Promise<ThreadRow | null> {
  const rows = await query<ThreadRow>(
    `SELECT * FROM thread WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 1`
  );
  return rows[0] ?? null;
}

export async function getLatestMessage(threadId: number, role: string): Promise<MessageRow | null> {
  const safe = role.replace(/'/g, "''");
  const rows = await query<MessageRow>(
    `SELECT * FROM message WHERE thread_id = ${threadId} AND role = '${safe}' ORDER BY created_at DESC LIMIT 1`
  );
  return rows[0] ?? null;
}
