import { useState } from 'react';
import { PanelLeft } from 'lucide-react';
import Sidebar from './Sidebar';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div
        style={{
          marginLeft: sidebarOpen ? '260px' : '0',
          transition: `margin-left 220ms ${sidebarOpen ? 'ease-out' : 'ease-in'}`,
        }}
        className="h-full flex flex-col bg-white"
      >
        <button
          onClick={() => setSidebarOpen(v => !v)}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          aria-expanded={sidebarOpen}
          className={`absolute z-40 top-0 left-5 h-[60px] flex items-center text-[#666] hover:text-[#1a1a1a] transition-opacity duration-150 ${sidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <PanelLeft size={20} strokeWidth={1.5} />
        </button>

        {children}
      </div>
    </div>
  );
}
