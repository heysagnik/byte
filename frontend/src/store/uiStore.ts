import { create } from 'zustand';

interface UIStore {
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
  toggleSidebar: () => void;
  isSettingsOpen: boolean;
  setSettingsOpen: (isOpen: boolean) => void;
  /** Desktop-only rail collapse — distinct from the mobile slide-over above */
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (isCollapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
}

export const useUIStore = create<UIStore>(set => ({
  isSidebarOpen: false,
  setSidebarOpen: isOpen => set({ isSidebarOpen: isOpen }),
  toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
  isSettingsOpen: false,
  setSettingsOpen: isOpen => set({ isSettingsOpen: isOpen }),
  isSidebarCollapsed: false,
  setSidebarCollapsed: isCollapsed => set({ isSidebarCollapsed: isCollapsed }),
  toggleSidebarCollapsed: () => set(state => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
}));
