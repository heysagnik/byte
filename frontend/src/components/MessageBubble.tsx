import { Spinner } from '@heroui/react';
import AgentStepCard from './AgentStepCard';
import type { Message } from '../hooks/useThread';

interface MessageBubbleProps {
  message: Message;
  threadId: string;
}

// Renders markdown-style bold (**text**) inline — agent replies use it
function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export default function MessageBubble({ message, threadId }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const metadata: Record<string, unknown> = message.metadata ?? {};
  const isThinking = !message.content && metadata['type'] === 'thinking';

  // ── User message — right-aligned pill bubble ──────────────────────────────
  if (isUser) {
    return (
      <div className="flex justify-end py-1">
        <div
          className="max-w-[70%] rounded-3xl px-4 py-3 text-sm leading-relaxed"
          style={{
            backgroundColor: 'rgba(0,0,0,0.06)',
            color: 'var(--color-fg)',
            // visual-border-alpha-colors
            boxShadow: '0 0 0 1px rgba(0,0,0,0.06)',
          }}
        >
          <p className="whitespace-pre-wrap break-words">
            <InlineText text={message.content} />
          </p>
        </div>
      </div>
    );
  }

  // ── Agent / system message — left-aligned, no bubble, just text ──────────
  return (
    <div className="flex gap-3 py-2">
      {/* Avatar — small dark circle with "B" initial, visual-concentric-radius */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5 select-none"
        style={{
          backgroundColor: 'var(--color-fg)',
          color: 'var(--color-bg)',
        }}
        aria-hidden="true"
      >
        B
      </div>

      {/* Content — no card, text sits directly on background */}
      <div className="flex-1 min-w-0 pt-0.5">
        {isThinking ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-muted)' }}>
            <Spinner size="sm" />
            <span>Thinking…</span>
          </div>
        ) : (
          message.content && (
            <div
              className="text-sm leading-relaxed whitespace-pre-wrap break-words"
              style={{ color: 'var(--color-fg)' }}
            >
              <InlineText text={message.content} />
            </div>
          )
        )}

        <AgentStepCard
          metadata={metadata as Parameters<typeof AgentStepCard>[0]['metadata']}
          threadId={threadId}
        />
      </div>
    </div>
  );
}
