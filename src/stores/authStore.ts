import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';
import type { Profile, UserRole, UIExperience } from '../types';
import { getUIExperience } from '../types';

interface AuthState {
  /** Supabase session user ID */
  userId: string | null;
  /** Full profile from `profiles` table */
  profile: Profile | null;
  /** Has completed first login (PIN created) */
  hasPin: boolean;
  /** Is authenticated (session + PIN/biometric) */
  isAuthenticated: boolean;
  /** Loading state */
  loading: boolean;

  // ── Computed ──
  role: UserRole | null;
  uiExperience: UIExperience | null;

  // ── Actions ──
  /** Sign in with phone + password (phone → email mapping) */
  signIn: (phone: string, password: string) => Promise<{ error?: string }>;
  /** Sign out */
  signOut: () => Promise<void>;
  /** Set PIN (hashed, stored in SecureStore) */
  setPin: (pin: string) => Promise<void>;
  /** Verify PIN */
  verifyPin: (pin: string) => Promise<boolean>;
  /** Check if PIN exists */
  checkPinExists: () => Promise<boolean>;
  /** Load profile from Supabase */
  loadProfile: () => Promise<void>;
  /** Set authenticated state */
  setAuthenticated: (value: boolean) => void;
  /** Initialize auth (check session) */
  initialize: () => Promise<void>;
}

/** Map phone number to email: 9876543210 → 9876543210@fineglazeapp.com
 *  NOTE: must be a valid-format TLD accepted by Supabase Auth email validation —
 *  `.app` domains are rejected by GoTrue's email validator ("email_address_invalid"),
 *  even though the address is never actually emailed. Confirmed working: `.com`. */
function phoneToEmail(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `${digits}@fineglazeapp.com`;
}

/** Simple hash for PIN (not crypto-grade, but stored in SecureStore) */
async function hashPin(pin: string): Promise<string> {
  // In production, use a proper hash. For now, a simple approach
  // since SecureStore is already encrypted at rest.
  let hash = 0;
  const str = `fgcos_${pin}_salt`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  userId: null,
  profile: null,
  hasPin: false,
  isAuthenticated: false,
  loading: true,

  get role() {
    return get().profile?.role ?? null;
  },

  get uiExperience() {
    const role = get().profile?.role;
    return role ? getUIExperience(role) : null;
  },

  signIn: async (phone, password) => {
    try {
      const email = phoneToEmail(phone);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      set({ userId: data.user.id });
      await get().loadProfile();
      return {};
    } catch (e: any) {
      return { error: e.message || 'Login failed' };
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({
      userId: null,
      profile: null,
      hasPin: false,
      isAuthenticated: false,
    });
  },

  setPin: async (pin) => {
    const hashed = await hashPin(pin);
    await SecureStore.setItemAsync('fg_pin_hash', hashed);
    set({ hasPin: true });
  },

  verifyPin: async (pin) => {
    const stored = await SecureStore.getItemAsync('fg_pin_hash');
    if (!stored) return false;
    const hashed = await hashPin(pin);
    return hashed === stored;
  },

  checkPinExists: async () => {
    const stored = await SecureStore.getItemAsync('fg_pin_hash');
    const exists = !!stored;
    set({ hasPin: exists });
    return exists;
  },

  loadProfile: async () => {
    const { userId } = get();
    if (!userId) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      set({ profile: data as Profile });
    }
  },

  setAuthenticated: (value) => set({ isAuthenticated: value }),

  initialize: async () => {
    set({ loading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        set({ userId: session.user.id });
        await get().loadProfile();
        await get().checkPinExists();
      }
    } catch (e) {
      console.error('Auth init error:', e);
    } finally {
      set({ loading: false });
    }
  },
}));
