import { useThreadList } from '../hooks/useThreadList';
import { Share, Pencil, Menu, PanelLeft } from 'lucide-react';
import { useUIStore } from '../store/uiStore';

interface ChatHeaderProps {
  threadId: string;
}

export default function ChatHeader({ threadId }: ChatHeaderProps) {
  const { toggleSidebar, isSidebarCollapsed, toggleSidebarCollapsed } = useUIStore();
  const { threads } = useThreadList();
  const thread = threads.find(t => t.id === threadId);
  const title = thread?.title ?? '';

  return (
    <div
      className="shrink-0 flex items-center justify-between px-5 h-[52px]"
      style={{
        background: 'var(--bg-page)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-2 max-w-[60%]">
        <button
          onClick={toggleSidebar}
          aria-label="Toggle Menu"
          className="lg:hidden w-7 h-7 flex items-center justify-center rounded-sm transition-colors shrink-0"
          style={{ color: 'var(--text-hint)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-hint)')}
        >
          <Menu size={16} strokeWidth={2} />
        </button>
        {/* Desktop-only expand affordance — only rendered while the rail is collapsed */}
        {isSidebarCollapsed && (
          <button
            onClick={toggleSidebarCollapsed}
            aria-label="Expand sidebar"
            className="hidden lg:flex w-7 h-7 items-center justify-center rounded-sm transition-colors shrink-0"
            style={{ color: 'var(--text-hint)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-hint)')}
          >
            <PanelLeft size={15} strokeWidth={1.75} />
          </button>
        )}
        {/* Thread title — label-glyph, the "STATUS / THREAD" look */}
        <p className="label-glyph truncate leading-snug" style={{ color: 'var(--text-muted)' }}>
          {title}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          aria-label="Rename chat"
          className="w-7 h-7 flex items-center justify-center rounded-sm transition-colors"
          style={{ color: 'var(--text-hint)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-hint)')}
        >
          <Pencil size={13} strokeWidth={1.75} />
        </button>
        <button
          aria-label="Share chat"
          className="w-7 h-7 flex items-center justify-center rounded-sm transition-colors"
          style={{ color: 'var(--text-hint)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-hint)')}
        >
          <Share size={13} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
