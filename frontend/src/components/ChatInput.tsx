import { useRef, useEffect, useState } from 'react';
import { Button } from '@heroui/react';
import { ArrowUp, Plus, ChevronDown } from 'lucide-react';

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
    <div
      className="flex flex-col p-3 rounded-[28px] bg-white relative z-10"
      style={{
        boxShadow:
          '0 0 0 1px rgba(0,0,0,0.04), ' +
          '0 4px 12px rgba(0,0,0,0.03), ' +
          '0 12px 32px rgba(0,0,0,0.04), ' +
          '0 24px 64px rgba(0,0,0,0.04)',
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Message"}
        rows={1}
        disabled={disabled}
        spellCheck={false}
        className="flex-1 w-full resize-none bg-transparent outline-none text-[15px] leading-6 max-h-[200px] overflow-y-auto disabled:opacity-50 placeholder:text-[#999999] text-[#1a1a1a] px-2 pt-1 pb-6"
      />
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2">
          <Button
            isIconOnly
            size="sm"
            variant="outline"
            className="rounded-full border-[#E5E5E5] w-8 h-8 min-w-8 bg-transparent"
            aria-label="Add attachment"
          >
            <Plus size={16} className="text-[#333333]" strokeWidth={2.5} />
          </Button>
        </div>
        <Button
          isIconOnly
          size="sm"
          className={`rounded-full w-8 h-8 min-w-8 transition-colors ${canSend ? 'bg-[#1a1a1a] text-white hover:bg-[#333]' : 'bg-[#333333] text-white'}`}
          isDisabled={!canSend}
          onPress={handleSend}
          aria-label="Send message"
        >
          <ArrowUp size={16} strokeWidth={2.5} />
        </Button>
      </div>
    </div>
  );
}
