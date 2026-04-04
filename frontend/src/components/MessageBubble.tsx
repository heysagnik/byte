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
      ? <strong key={j} className="font-semibold text-[#1a1a1a]">{p.slice(2, -2)}</strong>
      : <span key={j}>{p}</span>
  );
}

function RenderText({ text, isUser }: { text: string; isUser?: boolean }) {
  return (
    <span translate="no" spellCheck={false} className="block" style={{ WebkitTextFillColor: 'inherit' }}>
      {text.split('\n').map((line, i) => {
        if (line === '') return <div key={i} className="h-[0.5em]" />;
        if (/^\*\s/.test(line)) {
          return (
            <div key={i} className="flex items-start gap-2 my-1">
              <span className={`mt-[0.6rem] w-[5px] h-[5px] rounded-full shrink-0 ${isUser ? 'bg-[#1a1a1a]' : 'bg-[#666]'}`} />
              <span>{parseBold(line.slice(2))}</span>
            </div>
          );
        }
        return <p key={i} className="my-1">{parseBold(line)}</p>;
      })}
    </span>
  );
}

export default function MessageBubble({ message, threadId, isThinking }: MessageBubbleProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end py-2">
        <div
          className="max-w-[75%] rounded-[20px] px-5 py-3 text-[15px] leading-[1.6]"
          style={{ backgroundColor: '#F3F3F3', color: '#1a1a1a' }}
        >
          <RenderText text={message.content} isUser />
        </div>
      </div>
    );
  }

  return (
    <div className="py-2 pl-2">
      <div className="min-w-0 py-1 space-y-3">
        <AgentStepCard
          metadata={message.metadata as Parameters<typeof AgentStepCard>[0]['metadata']}
          threadId={threadId}
          isRunning={isThinking}
        />
        {message.content && (
          <div className="text-[15.5px] leading-[1.75] text-[#222]">
            <RenderText text={message.content} />
          </div>
        )}
      </div>
    </div>
  );
}
