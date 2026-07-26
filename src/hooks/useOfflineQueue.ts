import { useState, useEffect, useCallback } from 'react';
import { useOutboxStore } from '../stores/outboxStore';
import type { OutboxItem } from '../lib/outbox';

export interface QueueItem {
  id: string;
  type: string;
  payload: Record<string, any>;
  created_at: string;
  retries: number;
}

/**
 * Offline outbox queue hook.
 * Delegates to the canonical `outboxStore` for sync operations
 * and exposes a simple API for UI consumption.
 */
export function useOfflineQueue() {
  const pendingItems = useOutboxStore((s) => s.pendingItems);
  const isSyncing = useOutboxStore((s) => s.isSyncing);
  const unsyncedCount = useOutboxStore((s) => s.unsyncedCount);
  const loadPending = useOutboxStore((s) => s.loadPending);
  const flushOutbox = useOutboxStore((s) => s.flushOutbox);

  const queue: QueueItem[] = pendingItems.map((item: OutboxItem) => ({
    id: item.id,
    type: item.type,
    payload: item.payload as Record<string, any>,
    created_at: new Date(item.created_at).toISOString(),
    retries: item.attempts,
  }));

  const refreshQueue = useCallback(async () => {
    await loadPending();
  }, [loadPending]);

  useEffect(() => {
    refreshQueue();
  }, [refreshQueue]);

  return {
    queue,
    isSyncing,
    pendingCount: unsyncedCount,
    retryAll: flushOutbox,
    refreshQueue,
  };
}
