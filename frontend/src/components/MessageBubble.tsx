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
  const metadata: Record<string, unknown> = message.metadata ?? {};
  const isThinking = !message.content && metadata['type'] === 'thinking';

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        {/* visual-concentric-radius — outer 16px, inner content is borderless */}
        <div
          className="max-w-[85%] rounded-2xl px-4 py-3 bg-[--color-surface]"
          style={{ boxShadow: '0 0 0 1px var(--color-border), 0 2px 4px rgba(0,0,0,0.04)' }}
        >
          {message.content && <p className="text-sm text-[--color-fg]">{message.content}</p>}
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
        /* visual-concentric-radius — 28px avatar, content bubble 16px */
        <div className="w-7 h-7 rounded-full bg-[--color-fg] flex items-center justify-center text-[--color-surface] text-xs font-semibold shrink-0 mr-2 mt-0.5">
          B
        </div>
      )}

      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser ? 'rounded-br-sm' : 'rounded-bl-sm'
        }`}
        style={
          isUser
            ? {
                backgroundColor: 'var(--color-fg)',
                color: 'var(--color-surface)',
              }
            : {
                backgroundColor: 'var(--color-surface)',
                boxShadow: '0 0 0 1px var(--color-border), 0 2px 4px rgba(0,0,0,0.04)',
              }
        }
      >
        {isThinking ? (
          <div className="flex items-center gap-2 text-sm text-[--color-muted]">
            <Spinner size="sm" />
            <span>Thinking…</span>
          </div>
        ) : (
          /* type-text-wrap-pretty applied globally via CSS */
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
