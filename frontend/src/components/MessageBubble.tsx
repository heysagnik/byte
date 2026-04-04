import AgentStepCard from './AgentStepCard';
import type { Message } from '../hooks/useThread';

interface MessageBubbleProps {
  message: Message;
  threadId: string;
  isThinking?: boolean;
}

function parseBold(line: string) {
  return line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={j}>{p.slice(2, -2)}</strong>
      : <span key={j}>{p}</span>
  );
}

function RenderText({ text }: { text: string }) {
  return (
    <span translate="no" spellCheck={false} className="block" style={{ WebkitTextFillColor: 'inherit' }}>
      {text.split('\n').map((line, i) => {
        if (line === '') return <div key={i} className="h-2" />;
        if (/^\*\s/.test(line)) {
          return (
            <div key={i} className="flex items-start gap-2 my-0.5">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-40" />
              <span>{parseBold(line.slice(2))}</span>
            </div>
          );
        }
        return <p key={i} className="my-0.5">{parseBold(line)}</p>;
      })}
    </span>
  );
}

export default function MessageBubble({ message, threadId, isThinking }: MessageBubbleProps) {
  // ── User message ──────────────────────────────────────────────────────────
  if (message.role === 'user') {
    return (
      <div className="flex justify-end py-1">
        <div
          className="max-w-[65%] rounded-lg px-4 py-2.5 text-sm leading-relaxed"
          style={{ backgroundColor: 'var(--surface-secondary)', boxShadow: '0 0 0 1px var(--border)' }}
        >
          <RenderText text={message.content} />
        </div>
      </div>
    );
  }

  // ── Agent message ─────────────────────────────────────────────────────────
  // Always show AgentStepCard (it handles its own null guard when no steps exist).
  // isThinking controls whether the card shows "Working…" expanded or collapsed summary.
  // The spinner is gone — steps stream in live as the agent runs.
  return (
    <div className="py-1 pl-2">
      <div className="min-w-0 py-1 space-y-2">
        <AgentStepCard
          metadata={message.metadata as Parameters<typeof AgentStepCard>[0]['metadata']}
          threadId={threadId}
          isRunning={isThinking}
        />
        {message.content && (
          <div className="text-sm leading-relaxed">
            <RenderText text={message.content} />
          </div>
        )}
      </div>
    </div>
  );
}
