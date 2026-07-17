/**
 * inactivityLock.ts
 *
 * Per PRD §10 Security:
 * - 30 min background → require PIN/biometric again
 * - 7 days without login → full password re-auth
 *
 * Uses SecureStore to track timestamps.
 */

import { safeGetItem, safeSetItem, safeDeleteItem } from './safeStorage';
import { AppState, type AppStateStatus } from 'react-native';

const BACKGROUND_TIMESTAMP_KEY = 'fg_background_at';
const LAST_LOGIN_KEY = 'fg_last_login_at';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const FULL_REAUTH_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type LockAction = 'none' | 'pin' | 'full_reauth';

/**
 * Record when the app goes to background.
 */
export async function recordBackgroundTimestamp(): Promise<void> {
  await safeSetItem(BACKGROUND_TIMESTAMP_KEY, Date.now().toString());
}

/**
 * Record a successful login.
 */
export async function recordLogin(): Promise<void> {
  await safeSetItem(LAST_LOGIN_KEY, Date.now().toString());
}

/**
 * Check if the user needs to re-authenticate after returning to foreground.
 */
export async function checkInactivityLock(): Promise<LockAction> {
  // Check 7-day full re-auth first
  const lastLogin = await safeGetItem(LAST_LOGIN_KEY);
  if (lastLogin) {
    const elapsed = Date.now() - parseInt(lastLogin, 10);
    if (elapsed > FULL_REAUTH_TIMEOUT_MS) {
      return 'full_reauth';
    }
  }

  // Check 30-min inactivity PIN lock
  const backgroundAt = await safeGetItem(BACKGROUND_TIMESTAMP_KEY);
  if (backgroundAt) {
    const elapsed = Date.now() - parseInt(backgroundAt, 10);
    if (elapsed > INACTIVITY_TIMEOUT_MS) {
      return 'pin';
    }
  }

  return 'none';
}

/**
 * Clear the background timestamp (user has re-authenticated).
 */
export async function clearBackgroundTimestamp(): Promise<void> {
  await safeDeleteItem(BACKGROUND_TIMESTAMP_KEY);
}

/**
 * Setup AppState listener for inactivity tracking.
 * Returns a cleanup function.
 */
export function setupInactivityTracking(
  onLockRequired: (action: LockAction) => void,
): () => void {
  const handleAppState = async (nextState: AppStateStatus) => {
    if (nextState === 'background' || nextState === 'inactive') {
      await recordBackgroundTimestamp();
    } else if (nextState === 'active') {
      const action = await checkInactivityLock();
      if (action !== 'none') {
        onLockRequired(action);
      }
      await clearBackgroundTimestamp();
    }
  };

  const sub = AppState.addEventListener('change', handleAppState);
  return () => sub.remove();
}
