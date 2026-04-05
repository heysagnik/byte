import AgentStepCard, { type NotificationMessage } from './AgentStepCard';
import type { Message } from '../hooks/useThread';

interface MessageBubbleProps {
  message: Message;
  threadId: string;
  isThinking?: boolean;
  notifications?: NotificationMessage[];
}

function parseBold(line: string) {
  return line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
    p.startsWith('**') && p.endsWith('**') ? (
      <strong key={j} className="font-semibold">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={j}>{p}</span>
    ),
  );
}

function RenderText({ text }: { text: string }) {
  return (
    <span
      translate="no"
      spellCheck={false}
      className="block"
      style={{ WebkitTextFillColor: 'inherit' }}
    >
      {text.split('\n').map((line, i) => {
        if (line === '') return <div key={i} className="h-[0.4em]" />;
        if (/^\*\s/.test(line)) {
          return (
            <div key={i} className="flex items-start gap-2 my-1">
              <span className="mt-[0.55rem] w-[4px] h-[4px] rounded-full bg-current shrink-0 opacity-50" />
              <span>{parseBold(line.slice(2))}</span>
            </div>
          );
        }
        return (
          <p key={i} className="my-1">
            {parseBold(line)}
          </p>
        );
      })}
    </span>
  );
}

export default function MessageBubble({
  message,
  threadId,
  isThinking,
  notifications,
}: MessageBubbleProps) {
  // ── User message ──────────────────────────────────────────────────────────
  if (message.role === 'user') {
    return (
      <div className="flex justify-end py-1.5">
        <div className="max-w-[90%] md:max-w-[78%] flex flex-col items-end gap-1.5">
          {/* Image attachments */}
          {message.images && message.images.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-end">
              {message.images.map((img, i) => (
                <img
                  key={i}
                  src={img.dataUrl}
                  alt={img.name}
                  className="rounded-xl object-cover"
                  style={{
                    maxWidth: message.images!.length === 1 ? '240px' : '120px',
                    maxHeight: '200px',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                />
              ))}
            </div>
          )}
          {/* Text bubble — only if there's text */}
          {message.content && (
            <div
              className="rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed"
              style={{
                background: 'var(--text-primary)',
                color: 'var(--bg-elevated)',
                fontFamily: 'var(--font-body)',
              }}
            >
              <RenderText text={message.content} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Byte logo mark — shown inline before agent message content ────────────
  const ByteMark = () => (
    <div className="flex items-center gap-2 mb-2">
      <div
        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
        style={{ background: '#E05C20' }}
      >
        <svg width="10" height="10" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M5 5h5.5a2.5 2.5 0 0 1 0 5H5V5Z" fill="white" />
          <path d="M5 10h6a2.5 2.5 0 0 1 0 5H5v-5Z" fill="white" opacity="0.6" />
        </svg>
      </div>
      <span
        className="text-[10px] uppercase tracking-widest"
        style={{
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          letterSpacing: '0.12em',
        }}
      >
        BYTE
      </span>
    </div>
  );

  // ── Agent message ─────────────────────────────────────────────────────────
  return (
    <div className="py-1.5">
      <div className="min-w-0 space-y-2.5">
        <AgentStepCard
          metadata={message.metadata as Parameters<typeof AgentStepCard>[0]['metadata']}
          threadId={threadId}
          isRunning={isThinking}
          notifications={notifications}
        />
        {message.content && (
          <div>
            <ByteMark />
            <div
              className="rounded-2xl px-4 py-3 text-[14px] leading-[1.7] inline-block max-w-full"
              style={{
                background: 'var(--bg-elevated)' /* #F7F6F4 */,
                border: '1px solid var(--border)' /* #DDDBD8 */,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
              }}
            >
              <RenderText text={message.content} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
