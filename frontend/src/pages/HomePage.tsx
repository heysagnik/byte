import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatInput, { type ImageAttachment } from '../components/ChatInput';
import { api } from '../lib/api';
import { useThreadList } from '../hooks/useThreadList';
import { Menu, PanelLeft } from 'lucide-react';
import { useUIStore } from '../store/uiStore';

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
  const { toggleSidebar, isSidebarCollapsed, toggleSidebarCollapsed } = useUIStore();

  const handleSend = async (message: string, images?: ImageAttachment[]) => {
    setSending(true);
    try {
      const threadRes = await api.post<{ id: string; title: string }>('/threads', {
        title: message.slice(0, 80),
        initialMessage: message,
      });
      const threadId = threadRes.data.id;
      await api.post(`/threads/${threadId}/messages`, {
        content: message,
        images: images?.map(img => ({
          dataUrl: img.dataUrl,
          mimeType: img.mimeType,
          name: img.name,
        })),
      });
      refresh();
      navigate(`/thread/${threadId}`);
    } catch (err) {
      console.error('Failed to start conversation:', err);
      setSending(false);
    }
  };

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center px-4 md:px-6 py-16 relative"
      style={{ background: 'var(--bg-page)' }}
    >
      {/* Same 52px row height as ChatHeader, so icons land on the same line
          across pages while the sidebar collapses/expands — no border here,
          this page stays the calm, chrome-free landing screen */}
      <div className="absolute top-0 left-0 right-0 h-[52px] px-4 flex justify-between items-center">
        <button
          onClick={toggleSidebar}
          aria-label="Toggle Menu"
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-sm transition-colors"
          style={{ color: 'var(--text-hint)' }}
        >
          <Menu size={20} strokeWidth={2} />
        </button>
        {/* Desktop-only expand affordance — only rendered while the rail is collapsed */}
        {isSidebarCollapsed && (
          <button
            onClick={toggleSidebarCollapsed}
            aria-label="Expand sidebar"
            className="hidden lg:flex w-9 h-9 items-center justify-center rounded-sm transition-colors"
            style={{ color: 'var(--text-hint)' }}
          >
            <PanelLeft size={18} strokeWidth={1.75} />
          </button>
        )}
      </div>
      <div className="w-full max-w-2xl flex flex-col items-center gap-8 mt-8 lg:mt-0">
        {/* ── Greeting label — entrance: delay 0ms ────────────────── */}
        <div
          className="flex items-center gap-2.5 animate-fade-up"
          style={{ animationDelay: '0ms' }}
        >
          <span
            className="font-dot text-[14px] tracking-[0.16em] uppercase"
            style={{ color: 'var(--text-muted)' }}
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
          className="font-extrabold text-center leading-[1.15] whitespace-nowrap animate-fade-up"
          style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--text-primary)',
            letterSpacing: '-0.025em',
            fontSize: 'clamp(26px, 3.3vw, 44px)',
            animationDelay: '60ms',
            transition: 'transform 200ms ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.008)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          How may I help you today?
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
        <div
          className="flex flex-wrap justify-center gap-2 animate-fade-up"
          style={{ animationDelay: '200ms' }}
        >
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setInputVal(s)}
              className="chip-hover px-4 h-8 rounded-sm text-[13px]"
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
