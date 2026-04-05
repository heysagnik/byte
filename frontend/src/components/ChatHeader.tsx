import { useThreadList } from '../hooks/useThreadList';
import { Share, Pencil } from 'lucide-react';

interface ChatHeaderProps {
  threadId: string;
}

export default function ChatHeader({ threadId }: ChatHeaderProps) {
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
      {/* Thread title — Space Mono, uppercase, small-tracked */}
      <p
        className="text-[11px] uppercase tracking-widest truncate max-w-[60%] leading-snug"
        style={{
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          letterSpacing: '0.12em',
        }}
      >
        {title}
      </p>

      {/* Action buttons */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          aria-label="Rename chat"
          className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
          style={{ color: 'var(--text-hint)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-hint)')}
        >
          <Pencil size={13} strokeWidth={1.75} />
        </button>
        <button
          aria-label="Share chat"
          className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
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
