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
      <div className="flex-1 flex items-center justify-center text-[#888880] text-sm">
        Send a message to get started
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
      {messages.map((msg) => (
        <MessageBubble key={msg.id.toString()} message={msg} threadId={threadId} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
