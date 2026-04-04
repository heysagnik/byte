import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import type { Message } from '../hooks/useThread';
import { CONTENT_WIDTH } from '../pages/ThreadPage';

interface ThreadViewProps {
  messages: Message[];
  threadId: string;
}

interface Turn {
  user: Message;
  agent: Message[];
}

// Group messages into conversation turns: each user message + all
// consecutive agent/system messages that follow it = one turn.
function buildTurns(messages: Message[]): Turn[] {
  const turns: Turn[] = [];
  for (const msg of messages) {
    if (msg.role === 'user') {
      turns.push({ user: msg, agent: [] });
    } else if (turns.length > 0) {
      turns[turns.length - 1].agent.push(msg);
    }
  }
  return turns;
}

export default function ThreadView({ messages, threadId }: ThreadViewProps) {
  const lastTurnRef = useRef<HTMLDivElement>(null);

  // Scroll last turn into view whenever messages change
  useEffect(() => {
    lastTurnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-[--muted]">
        Send a message to get started
      </div>
    );
  }

  const turns = buildTurns(messages);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className={`${CONTENT_WIDTH} mx-auto px-6 py-6 w-full`}>
        {turns.map((turn, i) => {
          const isLast = i === turns.length - 1;
          return (
            <div
              key={turn.user.id}
              ref={isLast ? lastTurnRef : undefined}
              className="mb-6"
            >
              {/* User message */}
              <MessageBubble message={turn.user} threadId={threadId} />

              {/* Agent response(s) for this turn */}
              {turn.agent.length > 0 && (
                <MessageBubble
                  messages={turn.agent}
                  threadId={threadId}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
