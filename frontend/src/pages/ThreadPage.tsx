import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spinner } from '@heroui/react';
import ChatInput from '../components/ChatInput';
import ThreadView from '../components/ThreadView';
import { useThread } from '../hooks/useThread';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

function ArrowLeftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path
        fillRule="evenodd"
        d="M11.03 3.97a.75.75 0 0 1 0 1.06l-6.22 6.22H21a.75.75 0 0 1 0 1.5H4.81l6.22 6.22a.75.75 0 1 1-1.06 1.06l-7.5-7.5a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 0 1 1.06 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
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
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-divider shrink-0">
        <div className="flex items-center gap-2">
          <Button isIconOnly size="sm" variant="light" onPress={() => navigate('/')}>
            <ArrowLeftIcon />
          </Button>
          <span className="font-semibold">byte</span>
        </div>
        <div className="flex items-center gap-3">
          {!isReady && <Spinner size="sm" />}
          <span className="text-sm text-default-400 hidden sm:inline">{user?.email}</span>
          <Button size="sm" variant="light" onPress={logout}>
            Sign out
          </Button>
        </div>
      </header>

      {/* Messages */}
      <ThreadView messages={messages} threadId={id ?? ''} />

      {/* Input */}
      <div className="shrink-0 px-4 pb-4 pt-2 border-t border-divider">
        <div className="max-w-3xl mx-auto">
          <ChatInput
            onSend={handleSend}
            disabled={sending}
            placeholder="Follow up... (Ctrl+Enter to send)"
          />
        </div>
      </div>
    </div>
  );
}
