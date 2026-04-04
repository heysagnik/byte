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
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={j} className="font-semibold">{p.slice(2, -2)}</strong>
      : <span key={j}>{p}</span>
  );
}

function RenderText({ text }: { text: string }) {
  return (
    <span translate="no" spellCheck={false} className="block" style={{ WebkitTextFillColor: 'inherit' }}>
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
        return <p key={i} className="my-1">{parseBold(line)}</p>;
      })}
    </span>
  );
}

export default function MessageBubble({ message, threadId, isThinking, notifications }: MessageBubbleProps) {
  // ── User message ──────────────────────────────────────────────────────────
  if (message.role === 'user') {
    return (
      <div className="flex justify-end py-1.5">
        {/* visual-border-alpha-colors — transparent border adapts to bg */}
        <div
          className="max-w-[78%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed text-[#111]"
          style={{
            backgroundColor: '#F2F2F2',
            border: '1px solid rgba(0,0,0,0.05)',
          }}
        >
          <RenderText text={message.content} />
        </div>
      </div>
    );
  }

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
          <div className="text-[15px] leading-[1.7] text-[#111]">
            <RenderText text={message.content} />
          </div>
        )}
      </div>
    </div>
  );
}
