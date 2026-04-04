import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThreadList } from '../hooks/useThreadList';

function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function UserCircleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0" aria-hidden="true">
      <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 0 0 3.065 7.097A9.716 9.716 0 0 0 12 21.75a9.716 9.716 0 0 0 6.685-2.653Zm-12.54-1.285A7.486 7.486 0 0 1 12 15a7.486 7.486 0 0 1 5.855 2.812A8.224 8.224 0 0 1 12 20.25a8.224 8.224 0 0 1-5.855-2.438ZM15.75 9a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" clipRule="evenodd" />
    </svg>
  );
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const { id: activeThreadId } = useParams<{ id: string }>();
  const { user, logout } = useAuthStore();
  const { threads } = useThreadList();

  function handleNewChat() {
    navigate('/');
    onClose();
  }

  function handleThread(id: string) {
    navigate(`/thread/${id}`);
    onClose();
  }

  function handleLogout() {
    logout();
    navigate('/auth');
  }

  return (
    <>
      {/* Backdrop — mobile only */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 220ms ease-out',
          width: '260px',
          backgroundColor: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
          boxShadow: isOpen
            ? '2px 0 8px rgba(0,0,0,0.06), 4px 0 24px rgba(0,0,0,0.04)'
            : 'none',
        }}
        className="fixed inset-y-0 left-0 z-30 flex flex-col"
        aria-label="Sidebar"
      >
        {/* Top: logo + new chat */}
        <div
          style={{ borderBottom: '1px solid var(--color-border)' }}
          className="flex items-center justify-between px-4 py-3 shrink-0"
        >
          <span
            className="font-semibold text-base"
            style={{ color: 'var(--color-fg)' }}
          >
            byte
          </span>

          {/* ux-fitts-target-size — 32px min hit area */}
          <button
            onClick={handleNewChat}
            aria-label="New chat"
            style={{ color: 'var(--color-muted)' }}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-black/5 transition-colors duration-150"
          >
            <PencilIcon />
          </button>
        </div>

        {/* Thread list */}
        <nav className="flex-1 overflow-y-auto py-2 px-2" aria-label="Chat history">
          {threads.length === 0 ? (
            <p
              className="px-3 py-4 text-xs text-center"
              style={{ color: 'var(--color-muted)' }}
            >
              No chats yet
            </p>
          ) : (
            <ul role="list" className="space-y-0.5">
              {threads.map(t => {
                const isActive = t.id === activeThreadId;
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => handleThread(t.id)}
                      aria-current={isActive ? 'page' : undefined}
                      style={{
                        backgroundColor: isActive ? 'rgba(0,0,0,0.07)' : 'transparent',
                        color: isActive ? 'var(--color-fg)' : 'var(--color-muted)',
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm truncate hover:bg-black/5 transition-colors duration-150"
                    >
                      {t.title || 'Untitled'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        {/* Bottom: user account */}
        <div
          style={{ borderTop: '1px solid var(--color-border)' }}
          className="shrink-0 px-3 py-3"
        >
          <div className="flex items-center gap-3 px-1 py-2 rounded-lg hover:bg-black/5 transition-colors duration-150 cursor-default">
            {/* Avatar circle */}
            <div
              style={{
                backgroundColor: 'rgba(0,0,0,0.10)',
                color: 'var(--color-fg)',
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-medium select-none"
              aria-hidden="true"
            >
              {user?.email?.[0]?.toUpperCase() ?? <UserCircleIcon />}
            </div>

            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium truncate"
                style={{ color: 'var(--color-fg)' }}
              >
                {user?.email ?? ''}
              </p>
              <p
                className="text-xs"
                style={{ color: 'var(--color-muted)' }}
              >
                Free plan
              </p>
            </div>

            {/* Sign out */}
            <button
              onClick={handleLogout}
              aria-label="Sign out"
              style={{ color: 'var(--color-muted)' }}
              className="flex items-center justify-center w-7 h-7 rounded hover:bg-black/8 transition-colors duration-150 shrink-0"
              title="Sign out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
