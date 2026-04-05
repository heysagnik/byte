import { useRef, useEffect, useState } from 'react';
import { ArrowUp, Plus, X } from 'lucide-react';

export interface ImageAttachment {
  dataUrl: string; // base64 data URL — for display + sending
  mimeType: string; // e.g. 'image/jpeg'
  name: string;
}

interface ChatInputProps {
  onSend: (message: string, images?: ImageAttachment[]) => void;
  onCancel?: () => void;
  isRunning?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** When set, pre-fills the textarea (suggestion chips) */
  externalValue?: string;
  onExternalValueConsumed?: () => void;
}

const MAX_IMAGES = 4;
const MAX_SIZE_MB = 5;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function ChatInput({
  onSend,
  onCancel,
  isRunning,
  disabled,
  placeholder,
  externalValue,
  onExternalValueConsumed,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [popping, setPopping] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset cancelling state when run completes
  useEffect(() => {
    if (!isRunning) {
      setCancelling(false);
    }
  }, [isRunning]);

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
    if ((!trimmed && images.length === 0) || disabled) return;
    setPopping(true);
    setTimeout(() => setPopping(false), 300);
    onSend(trimmed, images.length > 0 ? images : undefined);
    setValue('');
    setImages([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    const remaining = MAX_IMAGES - images.length;
    const toProcess = files.slice(0, remaining);

    const loaded: ImageAttachment[] = [];
    for (const file of toProcess) {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) continue; // skip oversized silently
      const dataUrl = await readFileAsDataUrl(file);
      loaded.push({ dataUrl, mimeType: file.type, name: file.name });
    }
    setImages(prev => [...prev, ...loaded]);
  };

  const removeImage = (i: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== i));
  };

  // Paste images from clipboard
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items).filter(item => item.type.startsWith('image/'));
    if (items.length === 0) return;
    e.preventDefault();
    const remaining = MAX_IMAGES - images.length;
    const loaded: ImageAttachment[] = [];
    for (const item of items.slice(0, remaining)) {
      const file = item.getAsFile();
      if (!file) continue;
      const dataUrl = await readFileAsDataUrl(file);
      loaded.push({
        dataUrl,
        mimeType: file.type,
        name: `pasted-image.${file.type.split('/')[1]}`,
      });
    }
    setImages(prev => [...prev, ...loaded]);
  };

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [value]);

  const canSend = (!!value.trim() || images.length > 0) && !disabled;

  return (
    <div
      className="input-shell flex flex-col px-3 pt-3 pb-2.5 rounded-2xl relative z-10"
      style={{
        background: 'var(--bg-surface)',
        border: '1.5px solid var(--text-primary)',
        boxShadow: '0 2px 12px rgba(17,17,16,0.06)',
      }}
    >
      {/* Image previews */}
      {images.length > 0 && (
        <div className="flex gap-2 mb-2.5 flex-wrap">
          {images.map((img, i) => (
            <div key={i} className="relative group shrink-0">
              <img
                src={img.dataUrl}
                alt={img.name}
                className="w-16 h-16 rounded-xl object-cover"
                style={{ border: '1px solid var(--border)' }}
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                aria-label="Remove image"
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'var(--text-primary)', color: 'var(--bg-elevated)' }}
              >
                <X size={9} strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
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
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex items-center justify-between">
        {/* Left actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Add image"
            disabled={images.length >= MAX_IMAGES || disabled}
            onClick={() => fileInputRef.current?.click()}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ color: 'var(--text-hint)' }}
            onMouseEnter={e => {
              if (images.length >= MAX_IMAGES || disabled) return;
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.transform = 'rotate(45deg)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-hint)';
              e.currentTarget.style.transform = 'rotate(0deg)';
            }}
          >
            <Plus size={16} strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label="Voice input"
            className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-150"
            style={{ color: 'var(--text-hint)' }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-hint)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          </button>
        </div>

        {/* Cancel button — shown while pipeline is running */}
        {isRunning ? (
          <button
            type="button"
            onClick={async () => {
              if (cancelling) return;
              setCancelling(true);
              try {
                await onCancel?.();
              } catch {
                setCancelling(false);
              }
            }}
            disabled={cancelling}
            aria-label="Stop"
            className="w-8 h-8 flex items-center justify-center rounded-full shrink-0 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--text-primary)', color: 'var(--bg-elevated)' }}
            onMouseEnter={e => {
              if (cancelling) return;
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--text-primary)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            {/* Pause icon — two vertical bars */}
            <svg width="11" height="13" viewBox="0 0 11 13" fill="currentColor">
              <rect x="0" y="0" width="3.5" height="13" rx="1.5" />
              <rect x="7.5" y="0" width="3.5" height="13" rx="1.5" />
            </svg>
          </button>
        ) : (
          /* Send button */
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Send message"
            className={`w-8 h-8 flex items-center justify-center rounded-full shrink-0 transition-all duration-150 ${popping ? 'animate-pop' : ''}`}
            style={{
              background: canSend ? 'var(--text-primary)' : 'var(--border)',
              color: canSend ? 'var(--bg-elevated)' : 'var(--text-hint)',
              cursor: canSend ? 'pointer' : 'not-allowed',
            }}
            onMouseEnter={e => {
              if (canSend) {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)';
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
              }
            }}
            onMouseLeave={e => {
              if (canSend) {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--text-primary)';
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              }
            }}
          >
            <ArrowUp size={14} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
}
