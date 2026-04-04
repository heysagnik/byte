import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '@heroui/react';
import { Plus, Search, LayoutDashboard, LogOut, Trash2, Settings } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThreadList } from '../hooks/useThreadList';
import { api } from '../lib/api';

export default function Sidebar() {
  const navigate = useNavigate();
  const { id: activeThreadId } = useParams<{ id: string }>();
  const { user, logout } = useAuthStore();
  const { threads, refresh } = useThreadList();
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      className="w-[280px] shrink-0 flex flex-col h-full bg-[#F2F2F2] border-r border-[#E5E5E5] overflow-x-hidden"
    >
      {/* ── Header: logo + panel icon ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-2.5">
          {/* App icon — matches screenshot glyph */}
          <div className="w-7 h-7 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0">
            <LayoutDashboard size={14} className="text-white" strokeWidth={1.5} />
          </div>
          <span className="font-semibold text-[15px] text-[#1a1a1a] tracking-tight">Byte</span>
        </div>
        {/* Panel toggle icon — top right, matches screenshot */}
        <button
          aria-label="Settings"
          className="w-8 h-8 flex items-center justify-center rounded-md text-[#999] hover:text-[#555] hover:bg-black/5 transition-colors"
        >
          <Settings size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* ── New Chat button ───────────────────────────────────────────────── */}
      <div className="px-3 pt-1 pb-2 shrink-0">
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center gap-2 px-3 h-9 rounded-full border border-[#D8D8D8] bg-white text-[13.5px] text-[#333] hover:bg-[#FAFAFA] transition-colors"
        >
          <Plus size={15} strokeWidth={2} className="text-[#666]" />
          New Chat
        </button>
      </div>

      {/* ── Search ───────────────────────────────────────────────────────── */}
      <div className="px-3 pb-3 shrink-0">
        <div className="flex items-center gap-2 px-3 h-9 rounded-full bg-white border border-[#E0E0E0]">
          <Search size={13} className="text-[#999] shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search Chats"
            aria-label="Search chats"
            className="flex-1 bg-transparent outline-none text-[13px] text-[#333] placeholder:text-[#ADADAD]"
          />
        </div>
      </div>

      {/* ── Chat list ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 pb-2">
        {filtered.length > 0 && (
          <>
            <p className="px-2 pb-1.5 text-[11px] font-semibold text-[#ADADAD] uppercase tracking-wider">
              Chats
            </p>
            <nav aria-label="Chat history" className="flex flex-col gap-0.5">
              {filtered.map(t => (
                <div key={t.id} className="group relative flex items-center">
                  <button
                    onClick={() => navigate(`/thread/${t.id}`)}
                    aria-current={t.id === activeThreadId ? 'page' : undefined}
                    className={[
                      'flex-1 min-w-0 flex items-center px-3 h-9 rounded-xl text-[13.5px] text-left transition-colors',
                      t.id === activeThreadId
                        ? 'bg-white text-[#111] font-medium shadow-[0_1px_4px_rgba(0,0,0,0.06)]'
                        : 'text-[#555] hover:bg-white/60',
                    ].join(' ')}
                  >
                    <span className="truncate pr-5">{t.title || 'Untitled'}</span>
                  </button>
                  <button
                    onClick={e => handleDelete(e, t.id)}
                    disabled={deletingId === t.id}
                    aria-label="Delete chat"
                    className="absolute right-1 w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 text-[#bbb] hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition-all duration-150"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </nav>
          </>
        )}
        {filtered.length === 0 && search && (
          <p className="px-2 py-3 text-[13px] text-[#bbb]">No results</p>
        )}
      </div>

      {/* ── Footer: user ─────────────────────────────────────────────────── */}
      <div className="shrink-0 px-3 pb-4 pt-2 border-t border-[#E5E5E5]">
        <div className="flex items-center gap-2.5 px-2">
          <Avatar size="sm" color="default" className="w-7 h-7 shrink-0" aria-hidden="true">
            <Avatar.Fallback
              className="text-[11px] font-semibold bg-[#1a1a1a] text-white"
              style={{ letterSpacing: '0.03em' }}
            >
              {initials}
            </Avatar.Fallback>
          </Avatar>
          <span className="flex-1 text-[13.5px] font-medium text-[#222] truncate min-w-0">{username}</span>
          <button
            onClick={() => { logout(); navigate('/auth'); }}
            aria-label="Sign out"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#bbb] hover:text-[#555] hover:bg-black/5 transition-colors"
          >
            <LogOut size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </aside>
  );
}
