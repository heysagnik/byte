import { useThreadList } from '../hooks/useThreadList';
import { MoreHorizontal, Share, Pencil } from 'lucide-react';

interface ChatHeaderProps {
  threadId: string;
}

export default function ChatHeader({ threadId }: ChatHeaderProps) {
  const { threads } = useThreadList();
  const thread = threads.find(t => t.id === threadId);
  const title = thread?.title ?? '';

  return (
    <div className="shrink-0 flex items-center justify-between px-5 h-[56px] border-b border-[#EBEBEB] bg-white">
      {/* Title — truncates gracefully */}
      <p className="text-[14px] font-medium text-[#222] truncate max-w-[60%] leading-snug">
        {title}
      </p>

      {/* Action buttons — right side */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Rename */}
        <button
          aria-label="Rename chat"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#ADADAD] hover:text-[#555] hover:bg-[#F5F5F5] transition-colors"
        >
          <Pencil size={14} strokeWidth={1.75} />
        </button>

        {/* Share */}
        <button
          aria-label="Share chat"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#ADADAD] hover:text-[#555] hover:bg-[#F5F5F5] transition-colors"
        >
          <Share size={14} strokeWidth={1.75} />
        </button>

        {/* More options */}
        <button
          aria-label="More options"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#ADADAD] hover:text-[#555] hover:bg-[#F5F5F5] transition-colors"
        >
          <MoreHorizontal size={16} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
