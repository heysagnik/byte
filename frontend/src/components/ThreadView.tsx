import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import NotificationChip from './NotificationChip';
import type { Message } from '../hooks/useThread';
import { CONTENT_WIDTH } from '../pages/ThreadPage';

interface ThreadViewProps {
  messages: Message[];
  threadId: string;
}

interface Turn {
  user: Message;
  // The single agent placeholder — tracks steps, never has content
  placeholder: Message | null;
  // System notification messages (send_notification calls)
  notifications: Message[];
  // Final agent message(s) with actual content
  responses: Message[];
}

function buildTurns(messages: Message[]): Turn[] {
  const turns: Turn[] = [];

  for (const msg of messages) {
    if (msg.role === 'user') {
      turns.push({ user: msg, placeholder: null, notifications: [], responses: [] });
      continue;
    }
    if (turns.length === 0) continue;
    const turn = turns[turns.length - 1];

    if (msg.role === 'system') {
      turn.notifications.push(msg);
    } else if (msg.role === 'agent' && !msg.content) {
      // Empty agent message = the progress placeholder (type: thinking | done)
      turn.placeholder = msg;
    } else if (msg.role === 'agent' && msg.content) {
      turn.responses.push(msg);
    }
  }

  return turns;
}

export default function ThreadView({ messages, threadId }: ThreadViewProps) {
  const lastTurnRef = useRef<HTMLDivElement>(null);

  const lastContent = messages[messages.length - 1]?.content ?? '';
  useEffect(() => {
    lastTurnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length, lastContent]);

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
          // Still thinking if placeholder exists, has no final response yet,
          // AND the placeholder itself hasn't been marked done by the server.
          const placeholderDone = turn.placeholder?.metadata?.['type'] === 'done';
          const isThinking = !!turn.placeholder && turn.responses.length === 0 && !placeholderDone;

          return (
            <div
              key={turn.user.id}
              ref={isLast ? lastTurnRef : undefined}
              className="mb-6"
            >
              {/* User message */}
              <MessageBubble message={turn.user} threadId={threadId} />

              {/* Agent progress — spinner while thinking, collapsed steps when done */}
              {turn.placeholder && (
                <MessageBubble
                  message={turn.placeholder}
                  isThinking={isThinking}
                  threadId={threadId}
                />
              )}

              {/* Inline notification chips from send_notification */}
              {turn.notifications.map(m => (
                <NotificationChip key={m.id} message={m} />
              ))}

              {/* Final agent response */}
              {turn.responses.map(msg => (
                <MessageBubble key={msg.id} message={msg} threadId={threadId} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
