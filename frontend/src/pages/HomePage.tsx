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
    /* staging-dim-background — page bg (--background) is slightly off-white,
       making the white Surface input card visually elevated */
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-12 overflow-hidden">

      {/* type-text-wrap-balance-headings + ux-proximity-grouping */}
      <h1
        className="text-4xl font-semibold text-center"
        style={{ textWrap: 'balance', letterSpacing: '-0.02em' }}
      >
        How can I help you today?
      </h1>

      {/* ux-proximity-grouping — input close to heading, hint text close to input */}
      <div className="w-full max-w-2xl flex flex-col gap-2">
        <ChatInput
          onSend={handleSend}
          disabled={sending}
          placeholder="What's on your mind?"
        />
        {/* ux-progressive-disclosure — subtle hint; doesn't compete with heading */}
        <p className="text-xs text-center text-[--muted]">
          Press <kbd className="font-mono">Ctrl+Enter</kbd> to send
        </p>
      </div>
    </div>
  );
}
