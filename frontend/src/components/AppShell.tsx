import { useState } from 'react';
import Sidebar from './Sidebar';

function MenuIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-bg)' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content — offset when sidebar is open on desktop */}
      <div
        style={{
          marginLeft: sidebarOpen ? '260px' : '0',
          transition: 'margin-left 220ms ease-out',
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Persistent toggle button — always visible top-left */}
        <button
          onClick={() => setSidebarOpen(v => !v)}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          aria-expanded={sidebarOpen}
          style={{ color: 'var(--color-muted)' }}
          className="absolute top-3 left-4 z-40 flex items-center justify-center w-8 h-8 rounded-lg hover:bg-black/5 transition-colors duration-150"
        >
          <MenuIcon />
        </button>

        {children}
      </div>
    </div>
  );
}
