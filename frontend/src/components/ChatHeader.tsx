import { Header, Separator } from '@heroui/react';
import { useThreadList } from '../hooks/useThreadList';

interface ChatHeaderProps {
  threadId: string;
}

export default function ChatHeader({ threadId }: ChatHeaderProps) {
  const { threads } = useThreadList();
  const title = threads.find(t => t.id === threadId)?.title ?? '';

  return (
    <>
      <Header className="shrink-0 flex items-center px-6 py-3 min-h-[50px]">
        <p className="text-sm font-medium truncate text-[--muted]">{title}</p>
      </Header>
      <Separator />
    </>
  );
}
