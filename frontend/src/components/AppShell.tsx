import Sidebar from './Sidebar';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'var(--bg-page)' }}>
      <Sidebar />
      {/* Content area */}
      <div className="flex-1 flex flex-col min-w-0" style={{ background: 'var(--bg-page)' }}>
        {children}
      </div>
    </div>
  );
}
