import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AgentStepCard, { type NotificationMessage } from './AgentStepCard';
import type { Message } from '../hooks/useThread';

interface MessageBubbleProps {
  message: Message;
  threadId: string;
  isThinking?: boolean;
  notifications?: NotificationMessage[];
}

const markdownComponents: Components = {
  p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2"
      style={{ color: 'var(--accent)' }}
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="my-1.5 pl-4 space-y-1 list-disc marker:opacity-40">{children}</ul>,
  ol: ({ children }) => (
    <ol className="my-1.5 pl-4 space-y-1 list-decimal marker:opacity-40">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  h1: ({ children }) => <h1 className="heading-mono text-[1.15em] font-bold mt-4 mb-1.5 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="heading-mono text-[1.08em] font-bold mt-3.5 mb-1.5 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="heading-mono text-[1.02em] font-bold mt-3 mb-1 first:mt-0">{children}</h3>,
  blockquote: ({ children }) => (
    <blockquote
      className="my-1.5 pl-3 italic"
      style={{ borderLeft: '2px solid var(--border)', color: 'var(--text-muted)' }}
    >
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3" style={{ borderColor: 'var(--border)' }} />,
  code: ({ className, children }) => {
    const isBlock = /language-/.test(className ?? '');
    if (isBlock) {
      return (
        <code className={`${className ?? ''} font-mono text-[0.85em]`}>{children}</code>
      );
    }
    return (
      <code
        className="px-1 py-0.5 rounded-sm font-mono text-[0.85em]"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre
      className="my-2 p-3 rounded-md overflow-x-auto text-[0.85em] leading-normal no-scrollbar"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto no-scrollbar">
      <table className="text-[0.92em] border-collapse w-full">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th
      className="text-left px-2.5 py-1.5 font-semibold"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-2.5 py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
      {children}
    </td>
  ),
};

function RenderText({ text }: { text: string }) {
  return (
    <div translate="no" spellCheck={false} style={{ WebkitTextFillColor: 'inherit' }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {text}
      </ReactMarkdown>
    </div>
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
                  className="rounded-sm object-cover"
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
              className="rounded-md px-4 py-2.5 text-[15px] leading-relaxed"
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
        className="w-5 h-5 rounded-sm flex items-center justify-center shrink-0"
        style={{ background: 'var(--accent)' }}
        aria-hidden="true"
      >
        <span
          className="text-white font-bold leading-none select-none"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}
        >
          B
        </span>
      </div>
      <span className="label-glyph">BYTE</span>
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
              className="text-[15px] leading-[1.7] max-w-full"
              style={{
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
