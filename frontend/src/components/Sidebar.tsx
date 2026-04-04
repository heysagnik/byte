import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '@heroui/react';
import { Plus, Search, LogOut, Trash2, Settings } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThreadList } from '../hooks/useThreadList';
import SettingsModal from './SettingsModal';
import { api } from '../lib/api';

export default function Sidebar() {
  const navigate = useNavigate();
  const { id: activeThreadId } = useParams<{ id: string }>();
  const { user, logout } = useAuthStore();
  const { threads, refresh } = useThreadList();
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleDelete = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    setDeletingId(threadId);
    try {
      await api.delete(`/threads/${threadId}`);
      if (activeThreadId === threadId) navigate('/');
      refresh();
    } finally {
      setDeletingId(null);
    }
  };

  const username = user?.email?.split('@')[0] ?? '';
  const initials = username.slice(0, 2).toUpperCase() || '?';

  const filtered = search.trim()
    ? threads.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    : threads;

  return (
    <aside
      aria-label="Sidebar"
      className="w-[260px] shrink-0 flex flex-col h-full overflow-x-hidden"
      style={{
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* ── Logo header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 shrink-0">
        <div className="flex items-center">
          {['B','Y','T','E'].map((letter) => {
            const isT = letter === 'T';
            return (
              <span
                key={letter}
                className="font-bold uppercase leading-none"
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: isT ? 'var(--accent)' : 'var(--text-primary)',
                  fontSize: '17px',
                  letterSpacing: '0.18em',
                }}
              >
                {letter}
              </span>
            );
          })}
        </div>
        <button
          onClick={() => setIsSettingsOpen(true)}
          aria-label="Settings"
          className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
          style={{ color: 'var(--text-hint)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-hint)')}
        >
          <Settings size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* ── New Chat button ─────────────────────────────────────── */}
      <div className="px-3 pt-1 pb-2 shrink-0">
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center gap-2 px-3 h-8 rounded-lg text-[12px] transition-all duration-150"
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
          <Plus size={13} strokeWidth={2} />
          New Chat
        </button>
      </div>

      {/* ── Search ─────────────────────────────────────────────── */}
      <div className="px-3 pb-3 shrink-0">
        <div
          className="flex items-center gap-2 px-3 h-8 rounded-lg transition-all"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
          }}
        >
          <Search size={12} style={{ color: 'var(--text-hint)' }} className="shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search chats"
            aria-label="Search chats"
            className="flex-1 bg-transparent outline-none text-[12px]"
            style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {/* ── Chat list ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 pb-2">
        {filtered.length > 0 && (
          <>
            <p
              className="px-2 pb-2 text-[10px] uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-hint)', letterSpacing: '0.12em' }}
            >
              Recent
            </p>
            <nav aria-label="Chat history" className="flex flex-col gap-0.5">
              {filtered.map((t, idx) => (
                <div
                  key={t.id}
                  className="group relative flex items-center animate-slide-in"
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <button
                    onClick={() => navigate(`/thread/${t.id}`)}
                    aria-current={t.id === activeThreadId ? 'page' : undefined}
                    className="flex-1 min-w-0 flex items-center px-2.5 h-8 rounded-lg text-[13px] text-left transition-all duration-150"
                    style={{
                      background: t.id === activeThreadId ? 'var(--bg-elevated)' : 'transparent',
                      border: t.id === activeThreadId ? '1px solid var(--border)' : '1px solid transparent',
                      color: t.id === activeThreadId ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontFamily: 'var(--font-body)',
                    }}
                    onMouseEnter={e => {
                      if (t.id !== activeThreadId) {
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                        (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (t.id !== activeThreadId) {
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                      }
                    }}
                  >
                    <span className="truncate pr-5">{t.title || 'Untitled'}</span>
                  </button>
                  <button
                    onClick={e => handleDelete(e, t.id)}
                    disabled={deletingId === t.id}
                    aria-label="Delete chat"
                    className="absolute right-1 w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 disabled:opacity-30 transition-all duration-150"
                    style={{ color: 'var(--text-hint)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-hint)')}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </nav>
          </>
        )}
        {filtered.length === 0 && search && (
          <p className="px-2 py-3 text-[12px]" style={{ color: 'var(--text-hint)', fontFamily: 'var(--font-body)' }}>
            No results
          </p>
        )}
      </div>

      {/* ── Footer: user ───────────────────────────────────────── */}
      <div
        className="shrink-0 px-3 pb-4 pt-2 mx-3 mb-3 rounded-xl"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2.5 px-1 pt-3">
          <Avatar size="sm" color="default" className="w-6 h-6 shrink-0" aria-hidden="true">
            <Avatar.Fallback
              className="text-[10px] font-bold"
              style={{
                background: 'var(--text-primary)',
                color: 'var(--bg-elevated)',
                letterSpacing: '0.03em',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {initials}
            </Avatar.Fallback>
          </Avatar>
          <span
            className="flex-1 text-[13px] font-medium truncate min-w-0"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
          >
            {username}
          </span>
        </div>
      </div>

      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
    </aside>
  );
}
