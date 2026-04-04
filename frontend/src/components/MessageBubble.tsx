import { Spinner, Avatar } from '@heroui/react';
import AgentStepCard from './AgentStepCard';
import type { Message } from '../hooks/useThread';

interface MessageBubbleProps {
  message?: Message;
  messages?: Message[];
  threadId: string;
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
    // translate="no" + spellCheck=false kills browser grammar/translation coloring
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

export default function MessageBubble({ message, messages, threadId }: MessageBubbleProps) {
  // ── User message ─────────────────────────────────────────────────────────
  if (message && message.role === 'user') {
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

  // ── Agent group — one avatar, all messages stacked ────────────────────────
  const agentMessages = messages ?? (message ? [message] : []);
  const isThinking = agentMessages.length === 1 && !agentMessages[0].content && agentMessages[0].metadata?.['type'] === 'thinking';

  return (
    <div className="flex gap-3 py-3">
      <Avatar size="sm" color="default" className="shrink-0 mt-0.5" aria-hidden="true">
        <Avatar.Fallback className="text-xs font-semibold" style={{ letterSpacing: '0.05em' }}>B</Avatar.Fallback>
      </Avatar>

      <div className="flex-1 min-w-0 space-y-3 py-3">
        {isThinking ? (
          <div className="flex items-center gap-2 text-sm text-[--muted]">
            <Spinner size="sm" />
            <span>Thinking…</span>
          </div>
        ) : (
          agentMessages.map((msg) => (
            <div key={msg.id} className="space-y-2">
              <AgentStepCard
                metadata={msg.metadata as Parameters<typeof AgentStepCard>[0]['metadata']}
                threadId={threadId}
              />
              {msg.content && (
                <div className="text-sm leading-relaxed">
                  <RenderText text={msg.content} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
