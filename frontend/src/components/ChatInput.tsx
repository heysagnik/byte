import { useRef, useEffect, useState } from 'react';
import { Button } from '@heroui/react';
import { ArrowUp } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [value]);

  const canSend = !!value.trim() && !disabled;

  return (
    <div
      className="flex items-end gap-3 px-4 py-3 rounded-xl bg-surface"
      style={{
        boxShadow:
          '0 0 0 1px rgba(0,0,0,0.08), ' +
          '0 1px 2px rgba(0,0,0,0.04), ' +
          '0 4px 12px rgba(0,0,0,0.06), ' +
          '0 8px 24px rgba(0,0,0,0.04)',
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "What's on your mind?"}
        rows={3}
        disabled={disabled}
        spellCheck={false}
        className="flex-1 resize-none bg-transparent outline-none text-sm leading-6 max-h-[200px] overflow-y-auto disabled:opacity-50 placeholder:text-[--muted]"
      />
      <Button
        isIconOnly
        size="sm"
        variant={canSend ? 'primary' : 'secondary'}
        isDisabled={!canSend}
        onPress={handleSend}
        aria-label="Send message"
        className="shrink-0 mb-0.5"
      >
        <ArrowUp size={16} />
      </Button>
    </div>
  );
}
