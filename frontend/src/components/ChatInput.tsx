import { useRef, useEffect, useState } from 'react';
import { ArrowUp, Plus, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** When set, pre-fills the textarea (suggestion chips) */
  externalValue?: string;
  onExternalValueConsumed?: () => void;
}

export default function ChatInput({
  onSend,
  disabled,
  placeholder,
  externalValue,
  onExternalValueConsumed,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Consume externally set value from suggestion chips
  useEffect(() => {
    if (externalValue) {
      setValue(externalValue);
      textareaRef.current?.focus();
      onExternalValueConsumed?.();
    }
  }, [externalValue, onExternalValueConsumed]);

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
      className="flex flex-col px-3 pt-3 pb-2.5 rounded-2xl relative z-10 transition-all duration-180"
      style={{
        background: 'var(--bg-surface)',
        border: '1.5px solid var(--text-primary)',
        boxShadow: '0 2px 12px rgba(17,17,16,0.06)',
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
        className="w-full resize-none bg-transparent outline-none leading-[1.6] max-h-[200px] overflow-y-auto disabled:opacity-50 px-1 pb-4"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '14px',
          color: 'var(--text-primary)',
        }}
        /* placeholder color via CSS variable — injected via a style tag trick */
      />

      <div className="flex items-center justify-between">
        {/* Attachment / extra action */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Add attachment"
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-150"
            style={{ color: 'var(--text-hint)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-hint)')}
          >
            <Plus size={16} strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label="Voice input"
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-150"
            style={{ color: 'var(--text-hint)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-hint)')}
          >
            {/* Mic icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
            </svg>
          </button>
        </div>

        {/* Send button: #111110 default → #E05C20 hover */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className="w-8 h-8 flex items-center justify-center rounded-full shrink-0 transition-all duration-150"
          style={{
            background: canSend ? 'var(--text-primary)' : 'var(--border)',
            color: canSend ? 'var(--bg-elevated)' : 'var(--text-hint)',
            cursor: canSend ? 'pointer' : 'not-allowed',
          }}
          onMouseEnter={e => {
            if (canSend) (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)';
          }}
          onMouseLeave={e => {
            if (canSend) (e.currentTarget as HTMLButtonElement).style.background = 'var(--text-primary)';
          }}
        >
          {disabled
            ? <Loader2 size={14} className="animate-spin" strokeWidth={2.5} />
            : <ArrowUp size={14} strokeWidth={2.5} />
          }
        </button>
      </div>
    </div>
  );
}
