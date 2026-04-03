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
      // Create a new thread
      const threadRes = await api.post<{ id: number; title: string }>('/threads', {
        title: message.slice(0, 80),
      });
      const threadId = threadRes.data.id;

      // Send the message (starts the orchestrator)
      await api.post(`/threads/${threadId}/messages`, { content: message });

      // Navigate to the thread
      navigate(`/thread/${threadId}`);
    } catch (err) {
      console.error('Failed to start conversation:', err);
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-divider">
        <span className="font-bold text-lg">byte</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-default-400">{user?.email}</span>
          <Button size="sm" variant="light" onPress={logout}>
            Sign out
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            byte
          </h1>
          <p className="text-default-500 text-lg">Your personal AI agent. Ask me to do anything.</p>
        </div>

        <div className="w-full max-w-2xl">
          <ChatInput
            onSend={handleSend}
            disabled={sending}
            placeholder="What would you like me to do? (Ctrl+Enter to send)"
          />
          <p className="text-xs text-default-400 text-center mt-2">
            Try: "Find me the cheapest hotel in Jabalpur for next weekend"
          </p>
        </div>
      </div>
    </div>
  );
}
