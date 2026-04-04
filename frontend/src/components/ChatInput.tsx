import { useRef, useEffect, useState } from 'react';
import { ArrowUp, Plus, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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
    // visual-layered-shadows — four layers for realistic elevation
    // visual-border-alpha-colors — semi-transparent border adapts to any bg
    <div
      className="flex flex-col px-3 pt-3 pb-2.5 rounded-[20px] bg-white relative z-10"
      style={{
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow:
          '0 0 0 1px rgba(0,0,0,0.03),' +
          '0 1px 3px rgba(0,0,0,0.04),' +
          '0 4px 12px rgba(0,0,0,0.05),' +
          '0 12px 32px rgba(0,0,0,0.04)',
        transition: 'box-shadow 180ms ease-out, border-color 180ms ease-out',
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? 'Message'}
        rows={1}
        disabled={disabled}
        spellCheck={false}
        className="w-full resize-none bg-transparent outline-none text-[15px] leading-[1.6] max-h-[200px] overflow-y-auto disabled:opacity-50 placeholder:text-[#B0B0B0] text-[#111] px-1 pb-4"
      />

      <div className="flex items-center justify-between">
        {/* ux-fitts-target-size — 36px min hit area */}
        <button
          type="button"
          aria-label="Add attachment"
          className="w-9 h-9 flex items-center justify-center rounded-full text-[#999] hover:text-[#555] hover:bg-[#F5F5F5] transition-colors"
        >
          <Plus size={17} strokeWidth={2} />
        </button>

        {/* visual-button-shadow-anatomy — send button with elevation shadow */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className={[
            'w-8 h-8 flex items-center justify-center rounded-full shrink-0 transition-all duration-150',
            canSend
              ? 'bg-[#111] text-white shadow-[0_1px_2px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.15)] active:scale-95 active:shadow-none'
              : 'bg-[#F0F0F0] text-[#B8B8B8] cursor-not-allowed',
          ].join(' ')}
        >
          {disabled
            ? <Loader2 size={15} className="animate-spin" strokeWidth={2.5} />
            : <ArrowUp size={15} strokeWidth={2.5} />
          }
        </button>
      </div>
    </div>
  );
}
