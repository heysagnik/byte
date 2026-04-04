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
        initialMessage: message,
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
    // ux-proximity-grouping — heading and input share one tight group
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 overflow-hidden">
      <div className="w-full max-w-2xl flex flex-col gap-4">
        <h1
          className="text-[26px] font-semibold text-center text-[#1a1a1a]"
          style={{ textWrap: 'balance', letterSpacing: '-0.02em' }}
        >
          Hey, what can I do for you?
        </h1>
        <ChatInput
          onSend={handleSend}
          disabled={sending}
          placeholder="Message"
        />
      </div>
    </div>
  );
}
