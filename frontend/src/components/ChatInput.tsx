import { useRef, useEffect, useState } from 'react';
import { Button } from '@heroui/react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

function ArrowUpIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path
        fillRule="evenodd"
        d="M11.47 2.47a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 1 1-1.06 1.06l-6.22-6.22V21a.75.75 0 0 1-1.5 0V4.81l-6.22 6.22a.75.75 0 1 1-1.06-1.06l7.5-7.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
    // Enter alone = newline (default textarea behavior, no override needed)
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [value]);

  return (
    <div className="flex items-end gap-2 p-3 bg-content1 rounded-2xl border border-divider shadow-sm">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? 'Message byte... (Ctrl+Enter to send)'}
        rows={1}
        disabled={disabled}
        className="flex-1 resize-none bg-transparent outline-none text-sm leading-6 max-h-[200px] overflow-y-auto disabled:opacity-50 placeholder:text-default-400"
      />
      <Button
        isIconOnly
        size="sm"
        color="primary"
        radius="full"
        onPress={handleSend}
        isDisabled={!value.trim() || disabled}
        className="shrink-0 mb-0.5"
      >
        <ArrowUpIcon />
      </Button>
    </div>
  );
}
