/**
 * safeStorage.ts
 *
 * A platform-safe wrapper around expo-secure-store.
 * - On native (iOS/Android): uses the hardware-encrypted SecureStore keychain.
 * - On web: falls back to localStorage (protected by the browser's same-origin policy).
 *
 * Import and use these helpers everywhere instead of calling SecureStore directly.
 * This prevents "SecureStore.default.getValueWithKeyAsync is not a function" crashes on web.
 */

import { Platform } from 'react-native';

function isWeb() {
  return Platform.OS === 'web';
}

function ls() {
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

export async function safeGetItem(key: string): Promise<string | null> {
  if (isWeb()) {
    return ls()?.getItem(key) ?? null;
  }
  const SecureStore = require('expo-secure-store') as typeof import('expo-secure-store');
  return SecureStore.getItemAsync(key);
}

export async function safeSetItem(key: string, value: string): Promise<void> {
  if (isWeb()) {
    ls()?.setItem(key, value);
    return;
  }
  const SecureStore = require('expo-secure-store') as typeof import('expo-secure-store');
  await SecureStore.setItemAsync(key, value);
}

export async function safeDeleteItem(key: string): Promise<void> {
  if (isWeb()) {
    ls()?.removeItem(key);
    return;
  }
  const SecureStore = require('expo-secure-store') as typeof import('expo-secure-store');
  await SecureStore.deleteItemAsync(key);
}

/**
 * Check if biometric auth is available on the current platform.
 * Always returns false on web (no hardware).
 */
export async function isBiometricAvailable(): Promise<boolean> {
  if (isWeb()) return false;
  const LocalAuth = require('expo-local-authentication') as typeof import('expo-local-authentication');
  return LocalAuth.hasHardwareAsync();
}

/**
 * Attempt biometric authentication.
 * Always returns { success: false } on web.
 */
export async function authenticateBiometric(promptMessage: string): Promise<{ success: boolean }> {
  if (isWeb()) return { success: false };
  const LocalAuth = require('expo-local-authentication') as typeof import('expo-local-authentication');
  return LocalAuth.authenticateAsync({
    promptMessage,
    fallbackLabel: 'Use PIN',
    disableDeviceFallback: true,
  });
}
