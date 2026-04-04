import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Spinner } from '@heroui/react';
import ChatInput from '../components/ChatInput';
import ThreadView from '../components/ThreadView';
import { useThread } from '../hooks/useThread';
import { api } from '../lib/api';

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const [sending, setSending] = useState(false);
  const { messages, isReady } = useThread(id);

  const handleSend = async (message: string) => {
    if (!id) return;
    setSending(true);
    try {
      await api.post(`/threads/${id}/messages`, { content: message });
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* ux-doherty-perceived-speed — spinner in corner while loading */}
      {!isReady && (
        <div className="absolute top-3 right-4 z-40">
          <Spinner size="sm" />
        </div>
      )}

      <ThreadView messages={messages} threadId={id ?? ''} />

      {/* Input bar — no border-top, floats like Claude's */}
      <div className="shrink-0 px-6 pb-5 pt-2">
        <div className="max-w-3xl mx-auto">
          <ChatInput
            onSend={handleSend}
            disabled={sending}
            placeholder="Reply…"
          />
        </div>
      </div>
    </div>
  );
}
