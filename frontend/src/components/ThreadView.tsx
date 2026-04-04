import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import type { Message } from '../hooks/useThread';

interface ThreadViewProps {
  messages: Message[];
  threadId: string;
}

export default function ThreadView({ messages, threadId }: ThreadViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div
        className="flex-1 flex items-center justify-center text-sm"
        style={{ color: 'var(--color-muted)' }}
      >
        Send a message to get started
      </div>
    );
  }

  return (
    // Centered column matching Claude's ~700px content width
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-1">
        {messages.map((msg) => (
          <MessageBubble key={msg.id.toString()} message={msg} threadId={threadId} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
