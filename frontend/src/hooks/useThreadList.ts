import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';

export interface ThreadSummary {
  id: string;
  title: string;
  createdAt: string;
}

export function useThreadList() {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);

  const refresh = useCallback(() => {
    api.get<{ threads: ThreadSummary[] }>('/threads').then(res => {
      setThreads(res.data.threads);
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { threads, refresh };
}
