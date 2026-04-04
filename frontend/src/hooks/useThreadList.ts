import { useEffect } from 'react';
import { create } from 'zustand';
import { api } from '../lib/api';

export interface ThreadSummary {
  id: string;
  title: string;
  createdAt: string;
}

interface ThreadStore {
  threads: ThreadSummary[];
  hasLoaded: boolean;
  refresh: () => Promise<void>;
}

export const useThreadStore = create<ThreadStore>((set) => ({
  threads: [],
  hasLoaded: false,
  refresh: async () => {
    try {
      const res = await api.get<{ threads: ThreadSummary[] }>('/threads');
      set({ threads: res.data.threads, hasLoaded: true });
    } catch (err) {
      console.error(err);
    }
  },
}));

export function useThreadList() {
  const store = useThreadStore();

  useEffect(() => {
    if (!store.hasLoaded) {
      store.refresh();
    }
  }, [store.hasLoaded, store.refresh]);

  return { threads: store.threads, refresh: store.refresh };
}
