import { useThreadList } from '../hooks/useThreadList';

interface ChatHeaderProps {
  threadId: string;
}

export default function ChatHeader({ threadId }: ChatHeaderProps) {
  const { threads } = useThreadList();
  const title = threads.find(t => t.id === threadId)?.title ?? '';

  return (
    <>
      <div className="shrink-0 flex items-center pl-14 pr-6 h-[60px]">
        <p className="text-[14px] font-medium truncate text-[#444]">{title}</p>
      </div>
      <div className="border-b border-[#EBEBEB]" />
    </>
  );
}
