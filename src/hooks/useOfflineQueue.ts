import { useState, useEffect, useCallback } from 'react';

export interface QueueItem {
  id: string;
  type: 'punch_in' | 'punch_out' | 'dpr' | 'safety_check' | string;
  payload: Record<string, any>;
  created_at: string;
  retries: number;
}

/**
 * Thin hook over the offline SQLite outbox.
 * Returns queue contents and a retry trigger.
 * In M1, the outbox is managed by the punch-in/DPR flows directly;
 * this hook reads from a local in-memory store (full SQLite integration is a backend dependency).
 */
export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // In a full implementation, this would query expo-sqlite outbox table.
  // For now, expose the API shape so consuming screens compile and the
  // wiring can be completed once the SQLite outbox is implemented.
  const pendingCount = queue.length;

  const retryAll = useCallback(async () => {
    if (isSyncing || queue.length === 0) return;
    setIsSyncing(true);
    try {
      // Placeholder: in production, iterate queue and POST to Supabase.
      await new Promise((r) => setTimeout(r, 1500));
      setQueue([]); // Optimistic clear
    } catch {
      // handle error
    } finally {
      setIsSyncing(false);
    }
  }, [queue, isSyncing]);

  return { queue, isSyncing, pendingCount, retryAll };
}
