import { create } from 'zustand';

interface UIStore {
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
  toggleSidebar: () => void;
  isSettingsOpen: boolean;
  setSettingsOpen: (isOpen: boolean) => void;
}

export const useUIStore = create<UIStore>(set => ({
  isSidebarOpen: false,
  setSidebarOpen: isOpen => set({ isSidebarOpen: isOpen }),
  toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
  isSettingsOpen: false,
  setSettingsOpen: isOpen => set({ isSettingsOpen: isOpen }),
}));
