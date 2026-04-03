import { useTable } from 'spacetimedb/react';
import { tables } from '../module_bindings';
import type { Infer } from 'spacetimedb';
import type MessageRow from '../module_bindings/message_table';

export type Message = Infer<typeof MessageRow>;

export function useThread(threadId: string | undefined) {
  const [allMessages, isReady] = useTable(tables.Message);

  const messages = threadId
    ? (allMessages as Message[])
        .filter((m) => m.threadId.toString() === threadId)
        .sort((a, b) =>
          Number(a.createdAt.microsSinceUnixEpoch - b.createdAt.microsSinceUnixEpoch)
        )
    : [];

  return { messages, isReady };
}
