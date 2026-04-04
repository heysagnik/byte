import { useParams } from 'react-router-dom';
import ChatHeader from '../components/ChatHeader';
import ChatInput from '../components/ChatInput';
import ThreadView from '../components/ThreadView';
import { useThread } from '../hooks/useThread';
import { api } from '../lib/api';

// Single source of truth for the content column width — shared by
// ThreadView (messages) and the input bar so they always align.
export const CONTENT_WIDTH = 'max-w-2xl';

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const { messages, isReady, addOptimisticMessages, removeOptimisticMessages } = useThread(id);

  const handleSend = async (message: string) => {
    if (!id) return;
    addOptimisticMessages(message);
    try {
      await api.post(`/threads/${id}/messages`, { content: message });
    } catch (err) {
      console.error('Failed to send message:', err);
      removeOptimisticMessages();
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ChatHeader threadId={id ?? ''} />

      {!isReady ? (
        /* ux-doherty-perceived-speed — skeleton rows while messages load */
        <div className={`flex-1 overflow-y-auto`}>
          <div className={`${CONTENT_WIDTH} mx-auto px-6 py-6 w-full space-y-6`}>
            {[80, 55, 70].map((w, i) => (
              <div key={i} className="flex flex-col gap-3">
                <div className="flex justify-end">
                  <div className="h-9 rounded-2xl animate-pulse" style={{ width: `${w}%`, background: 'var(--bg-surface)' }} />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 rounded animate-pulse" style={{ width: '90%', background: 'var(--bg-surface)' }} />
                    <div className="h-3 rounded animate-pulse" style={{ width: '65%', background: 'var(--bg-surface)' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <ThreadView messages={messages} threadId={id ?? ''} />
      )}

      <div className={`shrink-0 px-6 pb-5 pt-2 ${CONTENT_WIDTH} mx-auto w-full`}>
        <ChatInput onSend={handleSend} placeholder="Reply…" />
      </div>
    </div>
  );
}
