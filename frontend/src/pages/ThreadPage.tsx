import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import ChatHeader from '../components/ChatHeader';
import ChatInput, { type ImageAttachment } from '../components/ChatInput';
import ThreadView from '../components/ThreadView';
import { useThread } from '../hooks/useThread';
import { api } from '../lib/api';

const DEFAULT_INPUT_INSET = 112;
const INPUT_INSET_GAP = 24; // breathing room between last message and the floating bar

// Single source of truth for the content column width — shared by
// ThreadView (messages) and the input bar so they always align.
export const CONTENT_WIDTH = 'max-w-3xl';

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const { messages, isReady, addOptimisticMessages, removeOptimisticMessages } = useThread(id);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const [inputInset, setInputInset] = useState(DEFAULT_INPUT_INSET);

  // Track the floating input bar's real height so scroll content never
  // hides behind it, even as it grows (multi-line reply, image previews).
  useEffect(() => {
    const el = inputWrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      const height = entries[0]?.contentRect.height ?? 0;
      setInputInset(height + INPUT_INSET_GAP);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Agent is running if the last agent message is still in thinking state
  const isRunning = messages.some(
    m => m.role === 'agent' && (m.metadata?.type as string) === 'thinking',
  );

  const handleSend = async (message: string, images?: ImageAttachment[]) => {
    if (!id) return;
    addOptimisticMessages(message);
    try {
      await api.post(`/threads/${id}/messages`, {
        content: message,
        images: images?.map(img => ({
          dataUrl: img.dataUrl,
          mimeType: img.mimeType,
          name: img.name,
        })),
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      removeOptimisticMessages();
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    try {
      await api.post(`/threads/${id}/cancel`, {});
    } catch (err) {
      console.error('Failed to cancel:', err);
      throw err;
    }
  };

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden">
      <ChatHeader threadId={id ?? ''} />

      {!isReady ? (
        /* ux-doherty-perceived-speed — skeleton rows while messages load */
        <div className="flex-1 overflow-y-auto" style={{ paddingBottom: inputInset }}>
          <div className={`${CONTENT_WIDTH} mx-auto px-4 md:px-6 py-6 w-full space-y-6`}>
            {[80, 55, 70].map((w, i) => (
              <div
                key={i}
                className="flex flex-col gap-3 animate-fade-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex justify-end">
                  <div
                    className="h-9 rounded-lg animate-pulse"
                    style={{ width: `${w}%`, background: 'var(--bg-surface)' }}
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 space-y-2 pt-1">
                    <div
                      className="h-3 rounded animate-pulse"
                      style={{ width: '90%', background: 'var(--bg-surface)' }}
                    />
                    <div
                      className="h-3 rounded animate-pulse"
                      style={{ width: '65%', background: 'var(--bg-surface)' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <ThreadView messages={messages} threadId={id ?? ''} bottomInset={inputInset} />
      )}

      {/* Fade so scrolled content doesn't collide with the floating input */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-24"
        style={{ background: 'linear-gradient(to top, var(--bg-page), transparent)' }}
        aria-hidden="true"
      />

      <div
        ref={inputWrapperRef}
        className={`absolute bottom-0 left-0 right-0 px-4 md:px-6 pb-5 pt-2 ${CONTENT_WIDTH} mx-auto w-full`}
      >
        <ChatInput
          onSend={handleSend}
          onCancel={handleCancel}
          isRunning={isRunning}
          placeholder="Reply…"
        />
      </div>
    </div>
  );
}
