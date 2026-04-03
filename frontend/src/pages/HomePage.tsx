import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@heroui/react';
import ChatInput from '../components/ChatInput';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export default function HomePage() {
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleSend = async (message: string) => {
    setSending(true);
    try {
      const threadRes = await api.post<{ id: string; title: string }>('/threads', {
        title: message.slice(0, 80),
      });
      const threadId = threadRes.data.id;
      await api.post(`/threads/${threadId}/messages`, { content: message });
      navigate(`/thread/${threadId}`);
    } catch (err) {
      console.error('Failed to start conversation:', err);
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[--color-bg]">
      <header className="flex items-center justify-between px-6 py-4 border-b border-[--color-border]">
        <span className="font-semibold text-base text-[--color-fg]">byte</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[--color-muted]">{user?.email}</span>
          {/* ux-fitts-target-size — size sm = 32px min */}
          <Button
            size="sm"
            variant="secondary"
            onPress={logout}
            className="text-[--color-muted] hover:text-[--color-fg] transition-colors duration-150 ease-out"
          >
            Sign out
          </Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6">
        <div className="text-center">
          {/* type-text-wrap-balance-headings applied globally via CSS */}
          <h1 className="text-4xl font-semibold text-[--color-fg] mb-3">
            What shall we think through?
          </h1>
          <p className="text-[--color-muted] text-base">
            Your personal AI agent. Ask me to do anything.
          </p>
        </div>

        <div className="w-full max-w-2xl flex flex-col gap-2">
          <ChatInput
            onSend={handleSend}
            disabled={sending}
            placeholder="What would you like me to do? (Ctrl+Enter to send)"
          />
          <p className="text-xs text-[--color-muted] text-center">
            Try: "Find me the cheapest hotel in Jabalpur for next weekend"
          </p>
        </div>
      </div>
    </div>
  );
}
