/**
 * useOutboxSync.ts
 *
 * A React hook that drives automatic outbox flushing by:
 *  1. Loading pending items from SQLite on mount.
 *  2. Flushing immediately on mount (best-effort).
 *  3. Using @react-native-community/netinfo to detect offline→online
 *     transitions and flush immediately.
 *  4. Re-flushing whenever the app comes back to the foreground.
 *  5. Polling on a 60-second interval as a safety net.
 *
 * Mount this hook once near the root of any experience (e.g. the
 * role tab layout) so it runs for the lifetime of that session.
 */

import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { useOutboxStore } from '../stores/outboxStore';

const POLL_INTERVAL_MS = 60_000; // 1 minute

export function useOutboxSync(): void {
  const loadPending = useOutboxStore((s) => s.loadPending);
  const flushOutbox = useOutboxStore((s) => s.flushOutbox);

  // Track whether the hook is still mounted to avoid state updates after unmount
  const mountedRef = useRef(true);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    // 1. Load pending items from SQLite, then attempt an immediate flush
    const init = async () => {
      await loadPending();
      await flushOutbox();
    };
    init();

    // 2. Real network listener — flush on offline→online transition
    const netInfoUnsub = NetInfo.addEventListener((state: NetInfoState) => {
      const isOnline = state.isConnected && state.isInternetReachable !== false;
      if (isOnline && wasOfflineRef.current && mountedRef.current) {
        flushOutbox();
      }
      wasOfflineRef.current = !isOnline;
    });

    // 3. AppState listener → flush when app returns to foreground
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active' && mountedRef.current) {
        flushOutbox();
      }
    };
    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    // 4. Polling interval as safety net
    const pollTimer = setInterval(() => {
      if (mountedRef.current) {
        flushOutbox();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      netInfoUnsub();
      appStateSub.remove();
      clearInterval(pollTimer);
    };
  }, [loadPending, flushOutbox]);
}
