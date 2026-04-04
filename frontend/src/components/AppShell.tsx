import Sidebar from './Sidebar';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    // Two-column split — sidebar always visible, content takes remaining width
    <div className="h-screen flex overflow-hidden">
      <Sidebar />

      {/* Content area — white, full height, grows to fill */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {children}
      </div>
    </div>
  );
}
