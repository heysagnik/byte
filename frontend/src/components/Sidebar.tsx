import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar, Button, ScrollShadow } from '@heroui/react';
import { Plus, Search, PanelLeft, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThreadList } from '../hooks/useThreadList';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const { id: activeThreadId } = useParams<{ id: string }>();
  const { user, logout } = useAuthStore();
  const { threads } = useThreadList();
  const [search, setSearch] = useState('');

  const username = user?.email?.split('@')[0] ?? '';
  const initials = username.slice(0, 2).toUpperCase() || '?';
  const filtered = search.trim()
    ? threads.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    : threads;

  return (
    <aside
      aria-label="Sidebar"
      style={{
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: `transform 220ms ${isOpen ? 'ease-out' : 'ease-in'}`,
        width: '260px',
        backgroundColor: 'var(--surface-secondary)',
        borderRight: '1px solid var(--border)',
      }}
      className="fixed inset-y-0 left-0 z-30 flex flex-col"
    >
      {/* Logo */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between shrink-0">
        <span className="font-semibold text-sm">Byte</span>
        <Button isIconOnly size="md" variant="ghost" onPress={onClose} aria-label="Close sidebar">
          <PanelLeft size={16} />
        </Button>
      </div>

      {/* New Chat */}
      <div className="px-3 pb-2 shrink-0">
        <Button variant="primary" fullWidth size="sm" className="justify-start gap-2"
          onPress={() => { navigate('/'); onClose(); }}>
          <Plus size={15} /> New Chat
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 pb-3 flex items-center gap-2 shrink-0"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.5rem', margin: '0 12px 12px' }}>
        <Search size={14} className="text-[--muted] shrink-0" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search Chats"
          className="flex-1 bg-transparent outline-none text-sm py-2 placeholder:text-[--muted]"
          aria-label="Search chats"
        />
      </div>

      {threads.length > 0 && (
        <p className="px-4 pb-1 text-xs font-medium text-[--muted] shrink-0">Chats</p>
      )}

      <ScrollShadow className="flex-1 px-3 pb-2" hideScrollBar>
        {filtered.length === 0 ? (
          <p className="py-6 text-xs text-center text-[--muted]">{search ? 'No results' : 'No chats yet'}</p>
        ) : (
          <nav aria-label="Chat history" className="flex flex-col gap-0.5">
            {filtered.map(t => (
              <Button
                key={t.id}
                variant={t.id === activeThreadId ? 'secondary' : 'ghost'}
                size="sm" fullWidth
                onPress={() => { navigate(`/thread/${t.id}`); onClose(); }}
                aria-current={t.id === activeThreadId ? 'page' : undefined}
                className="justify-start font-normal"
              >
                <span className="truncate">{t.title || 'Untitled'}</span>
              </Button>
            ))}
          </nav>
        )}
      </ScrollShadow>

      <div className="shrink-0 px-3 py-3 flex items-center gap-2.5"
        style={{ borderTop: '1px solid var(--border)' }}>
        <Avatar size="sm" color="default" aria-hidden="true">
          <Avatar.Fallback className="text-xs font-semibold" style={{ letterSpacing: '0.05em' }}>{initials}</Avatar.Fallback>
        </Avatar>
        <p className="flex-1 text-sm font-medium truncate min-w-0">{username}</p>
        <Button isIconOnly size="md" variant="ghost" aria-label="Sign out"
          onPress={() => { logout(); navigate('/auth'); }}>
          <LogOut size={15} />
        </Button>
      </div>
    </aside>
  );
}
