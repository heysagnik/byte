import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatInput from '../components/ChatInput';
import { api } from '../lib/api';
import { useThreadList } from '../hooks/useThreadList';

const SUGGESTIONS = ['Make a call', 'Research something', 'Craft a message', 'Book something'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'GOOD MORNING';
  if (h < 17) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
}

export default function HomePage() {
  const [sending, setSending] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const navigate = useNavigate();
  const { refresh } = useThreadList();

  const handleSend = async (message: string) => {
    setSending(true);
    try {
      const threadRes = await api.post<{ id: string; title: string }>('/threads', {
        title: message.slice(0, 80),
        initialMessage: message,
      });
      const threadId = threadRes.data.id;
      await api.post(`/threads/${threadId}/messages`, { content: message });
      refresh();
      navigate(`/thread/${threadId}`);
    } catch (err) {
      console.error('Failed to start conversation:', err);
      setSending(false);
    }
  };

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center px-6 py-16"
      style={{ background: 'var(--bg-page)' }}
    >
      <div className="w-full max-w-2xl flex flex-col items-center gap-8">

        {/* ── Greeting label ──────────────────────────────────────── */}
        <div className="flex items-center gap-2.5">
          <span
            className="text-[11px] tracking-[0.16em] uppercase"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}
          >
            {getGreeting()}
          </span>
          {/* Accent live-dot */}
          <span
            className="w-[6px] h-[6px] rounded-full shrink-0 animate-accent-ping"
            style={{ background: 'var(--accent)' }}
          />
        </div>

        {/* ── Hero heading ────────────────────────────────────────── */}
        <h1
          className="text-[34px] sm:text-[42px] font-semibold text-center leading-[1.18]"
          style={{
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
            letterSpacing: '-0.025em',
            textWrap: 'balance',
          }}
        >
          What do you need<br />handled today?
        </h1>

        {/* ── Suggestion chips ────────────────────────────────────── */}
        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setInputVal(s)}
              className="px-4 h-8 rounded-full text-[12px] transition-all duration-150"
              style={{
                fontFamily: 'var(--font-body)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.border = '1px solid var(--text-primary)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.border = '1px solid var(--border)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* ── Chat input ──────────────────────────────────────────── */}
        <div className="w-full">
          <ChatInput
            onSend={handleSend}
            disabled={sending}
            placeholder="Ask byte to do anything..."
            externalValue={inputVal}
            onExternalValueConsumed={() => setInputVal('')}
          />
        </div>

      </div>
    </div>
  );
}
