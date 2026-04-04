import type { Message } from '../hooks/useThread';

const styles: Record<string, { bar: string; text: string }> = {
  info:            { bar: 'bg-[--muted]',        text: 'text-[--muted]' },
  success:         { bar: 'bg-success-500',       text: 'text-success-600' },
  error:           { bar: 'bg-danger-500',        text: 'text-danger-600' },
  waiting:         { bar: 'bg-warning-400',       text: 'text-warning-600' },
  waiting_approval:{ bar: 'bg-warning-400',       text: 'text-warning-600' },
};

export default function NotificationChip({ message }: { message: Message }) {
  const type = (message.metadata?.type as string) ?? 'info';
  const s = styles[type] ?? styles.info;

  return (
    <div className={`flex items-start gap-2 py-1 pl-10 text-xs ${s.text}`}>
      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${s.bar}`} />
      <span className="leading-5">{message.content}</span>
    </div>
  );
}
