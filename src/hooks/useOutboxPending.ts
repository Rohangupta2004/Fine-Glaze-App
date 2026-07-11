/**
 * useOutboxPending.ts
 *
 * Convenience hook that exposes:
 *  - pendingItems   – non-done outbox items (for a "Pending sync" list)
 *  - unsyncedCount  – badge count
 *  - isSyncing      – spinner flag
 *  - flushNow()     – manual trigger (e.g. pull-to-refresh)
 */

import { useOutboxStore } from '../stores/outboxStore';
import type { OutboxItem } from '../lib/outbox';

interface UseOutboxPending {
  pendingItems: OutboxItem[];
  unsyncedCount: number;
  isSyncing: boolean;
  flushNow: () => Promise<void>;
}

export function useOutboxPending(): UseOutboxPending {
  const pendingItems = useOutboxStore((s) => s.pendingItems);
  const unsyncedCount = useOutboxStore((s) => s.unsyncedCount);
  const isSyncing = useOutboxStore((s) => s.isSyncing);
  const flushOutbox = useOutboxStore((s) => s.flushOutbox);

  return {
    pendingItems,
    unsyncedCount,
    isSyncing,
    flushNow: flushOutbox,
  };
}
