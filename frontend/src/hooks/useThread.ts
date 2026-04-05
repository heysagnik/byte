import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import { getToken } from '../lib/auth';

export interface AgentStep {
  type: 'thinking' | 'searching' | 'calling' | 'result' | 'waiting_approval' | 'error';
  content: string;
  timestamp: number;
}

export interface MessageImage {
  dataUrl: string;
  mimeType: string;
  name: string;
}

export interface Message {
  id: string;
  threadId: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  images?: MessageImage[];
  metadata: Record<string, unknown>;
  createdAt: string;
}

export function useThread(threadId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isReady, setIsReady] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const loadMessages = useCallback(async () => {
    if (!threadId) return;
    try {
      const res = await api.get<{ messages: Message[] }>(`/threads/${threadId}/messages`);
      const fetched = res.data.messages;
      // Merge with any real messages already received via SSE while the fetch was in-flight.
      // SSE messages take precedence (more up-to-date), but optimistic entries are always dropped
      // so loadMessages is always a ground-truth reconciliation.
      setMessages(prev => {
        const byId = new Map(fetched.map(m => [m.id, m]));
        for (const m of prev) {
          if (!m.id.startsWith('optimistic-')) byId.set(m.id, m);
        }
        return [...byId.values()].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      });
      setIsReady(true);
    } catch {
      setIsReady(false);
    }
  }, [threadId]);

  const addOptimisticMessages = useCallback(
    (userContent: string) => {
      const now = Date.now();
      const optimisticUser: Message = {
        id: `optimistic-user-${now}`,
        threadId: threadId ?? '',
        role: 'user',
        content: userContent,
        metadata: {},
        createdAt: new Date(now).toISOString(),
      };
      const optimisticAgent: Message = {
        id: `optimistic-agent-${now + 1}`,
        threadId: threadId ?? '',
        role: 'agent',
        content: '',
        metadata: { type: 'thinking', steps: [] },
        // +1ms ensures agent placeholder sorts after user message
        createdAt: new Date(now + 1).toISOString(),
      };
      setMessages(prev => [...prev, optimisticUser, optimisticAgent]);
    },
    [threadId],
  );

  const removeOptimisticMessages = useCallback(() => {
    setMessages(prev => prev.filter(m => !m.id.startsWith('optimistic-')));
  }, []);

  useEffect(() => {
    if (!threadId) return;

    setIsReady(false);
    setMessages([]);
    loadMessages();

    const token = getToken();
    const apiBase = import.meta.env.VITE_API_BASE ?? '/api';
    const es = new EventSource(`${apiBase}/threads/${threadId}/events?token=${token}`);
    esRef.current = es;

    es.addEventListener('message:new', (e: MessageEvent) => {
      const msg: Message = JSON.parse(e.data);
      setMessages(prev => {
        // Exact ID already present — true duplicate, ignore
        if (prev.find(m => m.id === msg.id)) return prev;

        // Replace optimistic user message — content must match for safety with rapid sends
        if (msg.role === 'user') {
          const idx = prev.findIndex(
            m => m.id.startsWith('optimistic-user') && m.content === msg.content,
          );
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = msg;
            return next;
          }
        }

        // Replace optimistic agent thinking placeholder
        if (msg.role === 'agent' && (msg.metadata?.type as string) === 'thinking') {
          const idx = prev.findIndex(m => m.id.startsWith('optimistic-agent'));
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = msg;
            return next;
          }
        }

        return [...prev, msg];
      });
    });

    es.addEventListener('message:update', (e: MessageEvent) => {
      const msg: Message = JSON.parse(e.data);
      setMessages(prev => prev.map(m => (m.id === msg.id ? msg : m)));
    });

    // step:new — append one step to the placeholder message immediately,
    // without waiting for the DB message:update round-trip.
    es.addEventListener('step:new', (e: MessageEvent) => {
      const { agentMessageId, step } = JSON.parse(e.data) as {
        agentMessageId: string;
        step: AgentStep;
      };
      setMessages(prev =>
        prev.map(m => {
          if (m.id !== agentMessageId) return m;
          const existing = (m.metadata.steps as AgentStep[] | undefined) ?? [];
          // Deduplicate by timestamp in case message:update arrives later with same step
          if (existing.some(s => s.timestamp === step.timestamp)) return m;
          return {
            ...m,
            metadata: {
              ...m.metadata,
              steps: [...existing, step],
            },
          };
        }),
      );
    });

    es.addEventListener('connected', () => {
      loadMessages();
    });

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [threadId, loadMessages]);

  return { messages, isReady, addOptimisticMessages, removeOptimisticMessages };
}
