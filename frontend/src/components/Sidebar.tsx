import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Plus, Search, Trash2, PanelLeftClose, Settings } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThreadList } from '../hooks/useThreadList';
import { useUIStore } from '../store/uiStore';
import { useUserSettingsStore } from '../store/userSettingsStore';
import { api } from '../lib/api';

export default function Sidebar() {
  const navigate = useNavigate();
  const { id: activeThreadId } = useParams<{ id: string }>();
  const { user, logout } = useAuthStore();
  const { threads, refresh } = useThreadList();
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { isSidebarOpen, setSidebarOpen, setSettingsOpen, isSidebarCollapsed, toggleSidebarCollapsed } =
    useUIStore();
  const { name: dbName, fetchSettings } = useUserSettingsStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

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

  const emailName = user?.email?.split('@')[0] ?? '';
  const displayName = dbName || emailName;
  const initials = displayName.slice(0, 2).toUpperCase() || '?';

  const filtered = search.trim()
    ? threads.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    : threads;

  return (
    <aside
      aria-label="Sidebar"
      className={`shrink-0 flex flex-col h-full overflow-hidden fixed lg:relative z-50 transition-[transform,width] duration-300 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${isSidebarCollapsed ? 'w-[260px] lg:w-0 lg:border-r-0' : 'w-[260px]'}`}
      style={{
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Fixed-width inner wrapper — keeps content from reflowing/wrapping mid-collapse */}
      <div className="w-[260px] h-full flex flex-col shrink-0">
        {/* ── Logo header — same 52px row height + border as ChatHeader, so the
             divider line runs continuously across the full app width ────── */}
        <div
          className="flex items-center justify-between px-4 h-[52px] shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-1.5">
            {/* Mark — same accent glyph used across auth/agent surfaces, for real brand consistency */}
            <div
              className="w-[18px] h-[18px] rounded-sm flex items-center justify-center shrink-0"
              style={{ background: 'var(--accent)' }}
              aria-hidden="true"
            >
              <span
                className="text-white font-bold leading-none select-none"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}
              >
                B
              </span>
            </div>
            <span
              className="font-bold uppercase leading-none"
              style={{
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)',
                fontSize: '15px',
                letterSpacing: '0.14em',
              }}
            >
              Byte
            </span>
          </div>
          <button
            onClick={toggleSidebarCollapsed}
            aria-label="Collapse sidebar"
            className="flex w-7 h-7 items-center justify-center rounded-md transition-colors"
            style={{ color: 'var(--text-hint)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-hint)')}
          >
            <PanelLeftClose size={15} strokeWidth={1.75} />
          </button>
        </div>

        {/* ── New Chat button ─────────────────────────────────────── */}
      <div className="px-3 pt-1 pb-2 shrink-0">
        <button
          onClick={() => {
            navigate('/');
            setSidebarOpen(false);
          }}
          className="w-full flex items-center gap-2 px-3 h-8 rounded-sm text-[13px] transition-all duration-150"
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
          className="flex items-center gap-2 px-3 h-8 rounded-sm transition-all"
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
            className="flex-1 bg-transparent outline-none text-[13px]"
            style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {/* ── Chat list ──────────────────────────────────────────── */}
      <div className="no-scrollbar flex-1 overflow-y-auto px-3 pb-2">
        {filtered.length > 0 && (
          <>
            <p className="label-glyph px-2 pb-2">Recent</p>
            <nav aria-label="Chat history" className="flex flex-col gap-0.5">
              {filtered.map((t, idx) => {
                const isActive = t.id === activeThreadId;
                return (
                  <div
                    key={t.id}
                    className="group relative flex items-center animate-slide-in"
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    {/* Active-thread signal — a single accent tick, not a chorus of them */}
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-full transition-opacity"
                      style={{ background: 'var(--accent)', opacity: isActive ? 1 : 0 }}
                      aria-hidden="true"
                    />
                    <button
                      onClick={() => {
                        navigate(`/thread/${t.id}`);
                        setSidebarOpen(false);
                      }}
                      aria-current={isActive ? 'page' : undefined}
                      title={t.title || 'Untitled'}
                      className="flex-1 min-w-0 flex items-center gap-2 px-2.5 h-8 rounded-sm text-[14px] text-left transition-all duration-150"
                      style={{
                        background: isActive ? 'var(--bg-elevated)' : 'transparent',
                        border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                        color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontFamily: 'var(--font-body)',
                      }}
                      onMouseEnter={e => {
                        if (!isActive) {
                          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                          (e.currentTarget as HTMLButtonElement).style.background =
                            'var(--bg-elevated)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isActive) {
                          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                        }
                      }}
                    >
                      <span
                        className="font-dot text-[10px] shrink-0 opacity-50"
                        style={{ color: 'var(--text-hint)' }}
                      >
                        N{String(idx + 1).padStart(2, '0')}
                      </span>
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
                );
              })}
            </nav>
          </>
        )}
        {filtered.length === 0 && search && (
          <p
            className="px-2 py-3 text-[13px]"
            style={{ color: 'var(--text-hint)', fontFamily: 'var(--font-body)' }}
          >
            No results
          </p>
        )}
      </div>

      {/* ── Footer: user ───────────────────────────────────────── */}
      <div className="shrink-0 px-3 pb-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
          className="group/footer w-full flex items-center gap-2.5 px-2 py-2 rounded-sm text-left transition-colors duration-150"
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <Avatar
            className="w-7 h-7 shrink-0 rounded-sm"
            aria-hidden="true"
            style={{ border: '1px solid var(--border)' }}
          >
            <AvatarFallback
              className="text-[10px] font-bold rounded-sm bg-transparent"
              style={{
                color: 'var(--text-primary)',
                letterSpacing: '0.03em',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="flex-1 min-w-0 flex flex-col">
            <span
              className="text-[13px] font-medium truncate"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
            >
              {displayName || 'Account'}
            </span>
            <span className="text-[11px] truncate" style={{ color: 'var(--text-hint)' }}>
              {user?.email ?? ''}
            </span>
          </span>
          <Settings
            size={14}
            strokeWidth={1.5}
            className="shrink-0 opacity-0 group-hover/footer:opacity-100 transition-opacity duration-150"
            style={{ color: 'var(--text-hint)' }}
          />
        </button>
      </div>
      </div>
    </aside>
  );
}
