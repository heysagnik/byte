import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatInput from '../components/ChatInput';
import { api } from '../lib/api';
import { useThreadList } from '../hooks/useThreadList';

export default function HomePage() {
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();
  const { refresh } = useThreadList();

  const handleSend = async (message: string) => {
    setSending(true);
    try {
      const threadRes = await api.post<{ id: string; title: string }>('/threads', {
        title: message.slice(0, 80),
      });
      const threadId = threadRes.data.id;
      await api.post(`/threads/${threadId}/messages`, { content: message });
      refresh();
      navigate(`/thread/${threadId}`);
    } catch (err) {
      console.error('Failed to start conversation:', err);
      setSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6">
        <div className="text-center">
          <h1
            className="text-4xl font-semibold mb-3"
            style={{ color: 'var(--color-fg)' }}
          >
            How may I assist you today?
          </h1>
        </div>

        <div className="w-full max-w-2xl flex flex-col gap-2">
          <ChatInput
            onSend={handleSend}
            disabled={sending}
            placeholder="How can byte help you today?"
          />
        </div>
      </div>
    </div>
  );
}
