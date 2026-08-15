import { useRef, useEffect, useState } from 'react';
import { ArrowUp, Plus, X } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { cn } from '../lib/utils';

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
      className="input-shell flex flex-col relative z-10 rounded-md"
      style={{
        background: 'var(--bg-surface)',
        boxShadow:
          '0 0 0 1px rgba(17,17,16,0.04), 0 2px 8px rgba(17,17,16,0.06), 0 8px 24px rgba(17,17,16,0.05)',
      }}
    >
      {/* Corner tag — floats above the content, no divider pretending to relate to it */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <span className="label-glyph">Message</span>
        <div className="flex items-center gap-2">
          {images.length > 0 && (
            <span className="font-dot text-[10px] opacity-60" style={{ color: 'var(--text-hint)' }}>
              {String(images.length).padStart(2, '0')}/{String(MAX_IMAGES).padStart(2, '0')}
            </span>
          )}
          {isRunning && (
            <span className="glyph-meter" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col px-3 pb-2.5">
        {/* Image previews */}
        {images.length > 0 && (
          <div className="flex gap-2 mb-2.5 flex-wrap">
            {images.map((img, i) => (
              <div key={i} className="corner-ticks relative group shrink-0">
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  className="w-16 h-16 rounded-sm object-cover"
                  style={{ boxShadow: '0 0 0 1px var(--image-outline)' }}
                />
                <span
                  className="font-dot absolute bottom-0.5 left-0.5 text-[9px] px-1 leading-none opacity-80"
                  style={{ background: 'rgba(17,17,16,0.55)', color: '#fff' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
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

        <Textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder ?? 'Message'}
          rows={1}
          disabled={disabled}
          spellCheck={false}
          className="no-scrollbar w-full min-h-0 resize-none bg-transparent border-0 shadow-none outline-none leading-[1.6] max-h-[200px] overflow-y-auto disabled:opacity-50 px-0 pb-2.5 text-[15px] font-body focus-visible:ring-0 focus-visible:border-0"
          style={{ fontFamily: 'var(--font-body)' }}
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

        <div className="flex items-center justify-between pt-2">
          {/* Left actions — attach is the primary, more-used action; mic is a quiet secondary */}
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Add image"
              disabled={images.length >= MAX_IMAGES || disabled}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-sm bg-transparent text-[--text-muted] shadow-none hover:text-[--text-primary] hover:bg-[--bg-elevated] transition-all duration-150"
            >
              <Plus size={15} strokeWidth={2} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Voice input"
              className="rounded-sm bg-transparent text-[--text-hint] shadow-none hover:text-[--text-muted] hover:bg-transparent transition-all duration-150"
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
            </Button>
          </div>

          {/* Cancel button — shown while pipeline is running */}
          {isRunning ? (
            <Button
              type="button"
              size="icon-sm"
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
              className="rounded-sm shrink-0 bg-[--text-primary] text-[--bg-elevated] hover:bg-[--accent] hover:scale-105 shadow-none"
            >
              {/* Pause icon — two vertical bars */}
              <svg width="11" height="13" viewBox="0 0 11 13" fill="currentColor">
                <rect x="0" y="0" width="3.5" height="13" rx="1" />
                <rect x="7.5" y="0" width="3.5" height="13" rx="1" />
              </svg>
            </Button>
          ) : (
            /* Send button — small, precise, orange accent only when armed */
            <Button
              type="button"
              size="icon-sm"
              onClick={handleSend}
              disabled={!canSend}
              aria-label="Send message"
              className={cn(
                'rounded-sm shrink-0 shadow-none border transition-all duration-150',
                canSend
                  ? 'hover:opacity-90 hover:scale-105'
                  : 'bg-transparent cursor-not-allowed',
                popping && 'animate-pop',
              )}
              style={{
                background: canSend ? 'var(--accent)' : 'transparent',
                borderColor: canSend ? 'var(--accent)' : 'var(--border)',
                color: canSend ? '#ffffff' : 'var(--text-muted)',
              }}
            >
              <ArrowUp size={14} strokeWidth={2.5} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
