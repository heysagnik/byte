import { useEffect, useState } from 'react';
import { getSocket } from '../lib/socket';
import { api } from '../lib/api';

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

  useEffect(() => {
    if (!threadId) return;

    setIsReady(false);

    // Load initial messages via REST
    api.get<{ messages: Message[] }>(`/threads/${threadId}/messages`).then(res => {
      setMessages(res.data.messages);
      setIsReady(true);
    });

    // Subscribe to live updates via Socket.IO
    const socket = getSocket();
    socket.emit('join:thread', threadId);

    const onNew = (msg: Message) => {
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    const onUpdate = (msg: Message) => {
      setMessages(prev => prev.map(m => (m.id === msg.id ? msg : m)));
    };

    socket.on('message:new', onNew);
    socket.on('message:update', onUpdate);

    return () => {
      socket.emit('leave:thread', threadId);
      socket.off('message:new', onNew);
      socket.off('message:update', onUpdate);
    };
  }, [threadId]);

  return { messages, isReady };
}
