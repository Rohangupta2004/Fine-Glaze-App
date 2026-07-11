/**
 * useOutboxSync.ts
 *
 * A React hook that drives automatic outbox flushing by:
 *  1. Loading pending items from SQLite on mount.
 *  2. Flushing immediately on mount (best-effort).
 *  3. Re-flushing whenever the app comes back to the foreground
 *     (via AppState 'active' events).
 *  4. Polling on a 60-second interval while the component tree is mounted
 *     (handles cases where connectivity is restored without an AppState change).
 *
 * Network detection
 * ─────────────────
 * expo-network is not installed.  We detect connectivity by whether a flush
 * attempt actually succeeds.  Items that fail are retried with back-off via
 * markError → next_retry_at.  This is sufficient for the M1 use-case.
 *
 * Mount this hook once near the root of the worker experience (e.g. the
 * worker tab layout) so it runs for the lifetime of that session.
 */

import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useOutboxStore } from '../stores/outboxStore';

const POLL_INTERVAL_MS = 60_000; // 1 minute

export function useOutboxSync(): void {
  const loadPending = useOutboxStore((s) => s.loadPending);
  const flushOutbox = useOutboxStore((s) => s.flushOutbox);

  // Track whether the hook is still mounted to avoid state updates after unmount
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // 1. Load pending items from SQLite, then attempt an immediate flush
    const init = async () => {
      await loadPending();
      await flushOutbox();
    };
    init();

    // 2. AppState listener → flush when app returns to foreground
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active' && mountedRef.current) {
        flushOutbox();
      }
    };
    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    // 3. Polling interval
    const pollTimer = setInterval(() => {
      if (mountedRef.current) {
        flushOutbox();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      appStateSub.remove();
      clearInterval(pollTimer);
    };
  }, [loadPending, flushOutbox]);
}
