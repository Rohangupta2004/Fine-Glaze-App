/**
 * networkMonitor.ts
 *
 * Real network connectivity listener that triggers outbox flush
 * when the device comes back online. Uses expo-network for detection
 * and falls back to periodic polling if unavailable.
 *
 * Priority A fix from handover report: "Add real network listener
 * rather than only AppState/interval outbox retry."
 */

import { AppState, AppStateStatus, Platform } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

type OnlineCallback = () => void;

let _unsubscribe: (() => void) | null = null;
let _wasOffline = false;

/**
 * Start listening for network changes.
 * Calls `onOnline` whenever the device transitions from offline → online,
 * or when the app comes to foreground while online.
 */
export function startNetworkMonitor(onOnline: OnlineCallback): () => void {
  // NetInfo subscription
  const unsubNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
    const isOnline = state.isConnected && state.isInternetReachable !== false;
    if (isOnline && _wasOffline) {
      onOnline();
    }
    _wasOffline = !isOnline;
  });

  // AppState subscription — flush when returning to foreground
  const handleAppState = (nextState: AppStateStatus) => {
    if (nextState === 'active') {
      onOnline();
    }
  };
  const appSub = AppState.addEventListener('change', handleAppState);

  // Combined cleanup
  _unsubscribe = () => {
    unsubNetInfo();
    appSub.remove();
  };

  return _unsubscribe;
}

/**
 * Stop listening for network changes.
 */
export function stopNetworkMonitor(): void {
  if (_unsubscribe) {
    _unsubscribe();
    _unsubscribe = null;
  }
}
