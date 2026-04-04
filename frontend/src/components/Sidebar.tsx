import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar, Button, ScrollShadow } from '@heroui/react';
import { 
  SquarePen, 
  Library, 
  CheckSquare, 
  Compass, 
  Image as ImageIcon, 
  FlaskConical, 
  PanelRight, 
  User, 
  LogOut, 
  Trash2, 
  PanelLeft
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThreadList } from '../hooks/useThreadList';
import { api } from '../lib/api';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const { id: activeThreadId } = useParams<{ id: string }>();
  const { user, logout } = useAuthStore();
  const { threads, refresh } = useThreadList();
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

  return (
    <aside
      aria-label="Sidebar"
      style={{
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: `transform 220ms ${isOpen ? 'ease-out' : 'ease-in'}`,
        width: '260px',
        backgroundColor: '#FAF8F5',
        borderRight: '1px solid #EBEBEB',
      }}
      className="fixed inset-y-0 left-0 z-30 flex flex-col"
    >
      {/* Logo */}
      <div className="px-5 h-[60px] flex items-center justify-between shrink-0">
        <span className="font-bold text-[17px] text-[#1a1a1a] tracking-tight">Byte</span>
        <button onClick={onClose} className="text-[#666] hover:text-[#1a1a1a] transition-colors" aria-label="Close sidebar">
          <PanelLeft size={20} strokeWidth={1.5} />
        </button>
      </div>

      <ScrollShadow className="flex-1 px-3" hideScrollBar>
        <div className="flex flex-col gap-1 pb-4">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 font-normal text-[14px] text-[#1a1a1a] px-3 h-10 hover:bg-[#F2EFEA]" 
            onPress={() => { navigate('/'); onClose(); }}
          >
            <SquarePen size={18} strokeWidth={1.5} /> New chat
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 font-normal text-[14px] text-[#1a1a1a] px-3 h-10 hover:bg-[#F2EFEA]"
          >
            <Library size={18} strokeWidth={1.5} /> Library
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 font-normal text-[14px] text-[#1a1a1a] px-3 h-10 hover:bg-[#F2EFEA]"
          >
            <CheckSquare size={18} strokeWidth={1.5} /> Tasks
            <span className="ml-auto text-[9px] uppercase font-bold border border-[#ccc] text-[#555] px-1.5 py-0.5 rounded tracking-wide leading-none">
              PREVIEW
            </span>
          </Button>
        </div>

        <div className="mx-4 border-t border-[#EBEBEB] mb-4" />

        {/* User's Chat History (Preserved Functionality) */}
        {threads.length > 0 && (
          <nav aria-label="Chat history" className="flex flex-col gap-1 pb-4">
            <p className="px-3 text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1 mt-2">Recent</p>
            {threads.map(t => (
              <div key={t.id} className="group relative w-full flex items-center">
                <Button
                  variant="ghost"
                  onPress={() => { navigate(`/thread/${t.id}`); onClose(); }}
                  className={`flex-1 w-full justify-start font-normal text-[14px] text-[#444] px-3 h-10 pr-8 ${t.id === activeThreadId ? 'bg-[#F2EFEA]' : 'hover:bg-[#F2EFEA]'}`}
                >
                  <span className="truncate text-sm text-[#444]">{t.title || 'Untitled'}</span>
                </Button>
                <button
                  onClick={e => handleDelete(e, t.id)}
                  disabled={deletingId === t.id}
                  aria-label="Delete chat"
                  className="absolute right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1 rounded text-[#999] hover:text-red-500 disabled:opacity-40"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </nav>
        )}
      </ScrollShadow>

      {/* Profile / Auth Footer */}
      <div className="px-6 pb-6 pt-2 shrink-0 flex flex-col gap-3">
        {!user ? (
          <>
            <p className="text-[13px] text-[#666] leading-relaxed pr-4">
              Sign in to save our conversations.
            </p>
            <button 
              className="flex items-center gap-3 mt-4 text-[14px] font-medium text-[#1a1a1a] hover:opacity-70 transition-opacity"
              onClick={() => navigate('/auth')}
            >
              <User size={18} strokeWidth={1.5} /> Sign in
            </button>
          </>
        ) : (
          <div className="flex items-center justify-between w-full mt-2">
            <button 
              className="flex items-center gap-3 font-medium text-[14px] text-[#1a1a1a] hover:opacity-70 transition-opacity truncate max-w-[180px]"
              onClick={() => {}} 
            >
              <Avatar size="sm" color="default" className="w-[24px] h-[24px]" aria-hidden="true">
                <Avatar.Fallback className="text-[10px] font-semibold">{initials}</Avatar.Fallback>
              </Avatar>
              <span className="truncate">{username}</span>
            </button>
            <button onClick={() => { logout(); navigate('/auth'); }} className="text-[#666] hover:text-[#1a1a1a]" aria-label="Sign out">
              <LogOut size={16} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
