import { useRef, useEffect, useState } from 'react';
import { Button } from '@heroui/react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

function ArrowUpIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
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
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [value]);

  const canSend = !!value.trim() && !disabled;

  return (
    /* visual-layered-shadows — subtle depth on the input container */
    <div
      className="flex items-end gap-2 p-3 bg-[--color-surface] rounded-2xl"
      style={{
        boxShadow:
          '0 0 0 1px var(--color-border), ' +
          '0 2px 4px rgba(0,0,0,0.04), ' +
          '0 4px 12px rgba(0,0,0,0.06)',
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? 'Message byte… (Ctrl+Enter to send)'}
        rows={1}
        disabled={disabled}
        /* ux-fitts-target-size — min tap height via py-1; none-high-frequency — no animation on typing */
        className="flex-1 resize-none bg-transparent outline-none text-sm leading-6 max-h-[200px] overflow-y-auto disabled:opacity-50 placeholder:text-[--color-muted] text-[--color-fg] py-1"
      />
      {/* ux-fitts-target-size — min 32px; physics-active-state — scale on press via global CSS */}
      <Button
        isIconOnly
        size="sm"
        onPress={handleSend}
        isDisabled={!canSend}
        aria-label="Send message"
        className="shrink-0 mb-0.5 transition-all duration-150 ease-out"
        style={{
          backgroundColor: canSend ? 'var(--color-fg)' : 'var(--color-border)',
          color: canSend ? 'var(--color-surface)' : 'var(--color-muted)',
          /* visual-button-shadow-anatomy on the send button */
          boxShadow: canSend
            ? '0 0 0 1px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.15)'
            : 'none',
        }}
      >
        <ArrowUpIcon />
      </Button>
    </div>
  );
}
