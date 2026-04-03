import { Spinner } from '@heroui/react';
import AgentStepCard from './AgentStepCard';
import type { Message } from '../hooks/useThread';

interface MessageBubbleProps {
  message: Message;
  threadId: string;
}

export default function MessageBubble({ message, threadId }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  let metadata: Record<string, unknown> = {};
  try {
    if (message.metadata) metadata = JSON.parse(message.metadata) as Record<string, unknown>;
  } catch { /* ignore */ }

  const isThinking = !message.content && metadata['type'] === 'thinking';

  if (isSystem) {
    // System messages (notifications, approval requests)
    return (
      <div className="flex justify-center my-2">
        <div className="max-w-[85%] rounded-xl px-4 py-3 bg-content2 border border-divider">
          {message.content && <p className="text-sm">{message.content}</p>}
          <AgentStepCard
            metadata={metadata as Parameters<typeof AgentStepCard>[0]['metadata']}
            threadId={threadId}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0 mr-2 mt-0.5">
          B
        </div>
      )}

      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-content2 rounded-bl-sm'
        }`}
      >
        {isThinking ? (
          <div className="flex items-center gap-2 text-sm text-default-400">
            <Spinner size="sm" />
            <span>Thinking...</span>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        )}

        {!isUser && (
          <AgentStepCard
            metadata={metadata as Parameters<typeof AgentStepCard>[0]['metadata']}
            threadId={threadId}
          />
        )}
      </div>
    </div>
  );
}
