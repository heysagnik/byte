import { useState } from 'react';
import { Button } from '@heroui/react';
import { Menu } from 'lucide-react';
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
        className="h-full flex flex-col"
      >
        <Button
          isIconOnly
          size="md"
          variant="ghost"
          onPress={() => setSidebarOpen(v => !v)}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          aria-expanded={sidebarOpen}
          className={`absolute top-3 left-4 z-40 transition-opacity duration-150 ${sidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <Menu size={18} />
        </Button>

        {children}
      </div>
    </div>
  );
}
