import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import { getToken } from '../lib/auth';

export interface AgentStep {
  type: 'thinking' | 'searching' | 'calling' | 'result' | 'waiting_approval' | 'error';
  content: string;
  timestamp: number;
}

export interface Message {
  id: string;
  threadId: string;
  role: 'user' | 'agent' | 'system';
  content: string;
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
      // Merge with any messages already received via SSE while the fetch was in-flight.
      // SSE messages take precedence (they are more up-to-date).
      setMessages(prev => {
        const byId = new Map(fetched.map(m => [m.id, m]));
        for (const m of prev) byId.set(m.id, m);
        return [...byId.values()].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
      setIsReady(true);
    } catch {
      setIsReady(false);
    }
  }, [threadId]);

  useEffect(() => {
    if (!threadId) return;

    setIsReady(false);
    setMessages([]);
    loadMessages();

    const token = getToken();
    const es = new EventSource(`/api/threads/${threadId}/events?token=${token}`);
    esRef.current = es;

    es.addEventListener('message:new', (e: MessageEvent) => {
      const msg: Message = JSON.parse(e.data);
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
    });

    es.addEventListener('message:update', (e: MessageEvent) => {
      const msg: Message = JSON.parse(e.data);
      setMessages(prev => prev.map(m => m.id === msg.id ? msg : m));
    });

    // step:new — append one step to the placeholder message immediately,
    // without waiting for the DB message:update round-trip.
    es.addEventListener('step:new', (e: MessageEvent) => {
      const { agentMessageId, step } = JSON.parse(e.data) as { agentMessageId: string; step: AgentStep };
      setMessages(prev => prev.map(m => {
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
      }));
    });

    es.addEventListener('connected', () => {
      loadMessages();
    });

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [threadId, loadMessages]);

  return { messages, isReady };
}
