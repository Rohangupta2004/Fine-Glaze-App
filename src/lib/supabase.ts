import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// ── Storage adapter ──────────────────────────────────────────────────────────
// Native (iOS/Android): use expo-secure-store so session tokens are stored in
// the platform keychain / keystore, not in plain AsyncStorage.
// Web: use localStorage so the client portal session survives refreshes. The
// browser sandbox protects it from other origins; native stays in keychain.

type StorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

function buildSecureStorage(): StorageAdapter {
  if (Platform.OS === 'web') {
    return {
      getItem: async (key) => typeof localStorage === 'undefined' ? null : localStorage.getItem(key),
      setItem: async (key, value) => { if (typeof localStorage !== 'undefined') localStorage.setItem(key, value); },
      removeItem: async (key) => { if (typeof localStorage !== 'undefined') localStorage.removeItem(key); },
    };
  }

  // Native: expo-secure-store — values are hardware-encrypted at rest.
  // SecureStore values are capped at 2 048 bytes on some Android keystores;
  // Supabase sessions serialise to ~1 KB so this is safe in practice.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const SecureStore = require('expo-secure-store') as typeof import('expo-secure-store');
  return {
    getItem: (key) => SecureStore.getItemAsync(key),
    setItem: (key, value) => SecureStore.setItemAsync(key, value),
    removeItem: (key) => SecureStore.deleteItemAsync(key),
  };
}

const secureStorage = buildSecureStorage();

// ── Supabase client ──────────────────────────────────────────────────────────

const DEFAULT_SUPABASE_URL = 'https://vxpkihnovotlwdbnuirt.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4cGtpaG5vdm90bHdkYm51aXJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NTM5MjksImV4cCI6MjA5OTMyOTkyOX0.YabanDhoqOYOeEEEheRrIsvMAnhjpzavTQvo3THx9uE';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Not applicable for React Native
  },
});
