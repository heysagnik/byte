import Sidebar from './Sidebar';
import SettingsModal from './SettingsModal';
import { useUIStore } from '../store/uiStore';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { isSidebarOpen, setSidebarOpen, isSettingsOpen, setSettingsOpen } = useUIStore();

  return (
    <div
      className="h-screen flex overflow-hidden relative"
      style={{ background: 'var(--bg-page)' }}
    >
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar />
      {/* Content area */}
      <div className="flex-1 flex flex-col min-w-0" style={{ background: 'var(--bg-page)' }}>
        {children}
      </div>

      {isSettingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
