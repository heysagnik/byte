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

        {/* ── Greeting label — entrance: delay 0ms ────────────────── */}
        <div className="flex items-center gap-2.5 animate-fade-up" style={{ animationDelay: '0ms' }}>
          <span
            className="text-[14px] tracking-[0.16em] uppercase"
            style={{ fontFamily: 'var(--font-dot)', color: 'var(--text-muted)' }}
          >
            {getGreeting()}
          </span>
          <span
            className="w-[6px] h-[6px] rounded-full shrink-0 animate-accent-ping"
            style={{ background: 'var(--accent)' }}
          />
        </div>

        {/* ── Hero heading — entrance: delay 60ms ─────────────────── */}
        <h1
          className="font-semibold text-center leading-[1.15] whitespace-nowrap animate-fade-up"
          style={{
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
            letterSpacing: '-0.03em',
            fontSize: 'clamp(28px, 3.5vw, 48px)',
            animationDelay: '60ms',
            transition: 'transform 200ms ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.008)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          What do <span style={{ fontFamily: 'var(--font-dot)', position: 'relative', top: '1px' }}>you</span> need handled today?
        </h1>

        {/* ── Chat input — entrance: delay 120ms ──────────────────── */}
        <div className="w-full animate-fade-up" style={{ animationDelay: '120ms' }}>
          <ChatInput
            onSend={handleSend}
            disabled={sending}
            placeholder="Ask byte to do anything..."
            externalValue={inputVal}
            onExternalValueConsumed={() => setInputVal('')}
          />
        </div>

        {/* ── Suggestion chips — entrance: delay 200ms ────────────── */}
        <div className="flex flex-wrap justify-center gap-2 animate-fade-up" style={{ animationDelay: '200ms' }}>
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setInputVal(s)}
              className="chip-hover px-4 h-8 rounded-full text-[12px]"
              style={{
                fontFamily: 'var(--font-body)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-primary)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
              }}
            >
              {s}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
