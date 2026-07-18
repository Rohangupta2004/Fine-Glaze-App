import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { safeGetItem, safeSetItem, safeDeleteItem } from '../lib/safeStorage';
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
  /** Lockout expiration timestamp */
  pinLockedUntil: number | null;

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
  /** Check if locked out and get remaining seconds */
  checkLockout: () => Promise<number>;
  /** Load profile from Supabase */
  loadProfile: () => Promise<void>;
  /** Set authenticated state */
  setAuthenticated: (value: boolean) => void;
  /** Initialize auth (check session) */
  initialize: () => Promise<void>;
  /** Change password on first login */
  changePassword: (newPassword: string) => Promise<{ error?: string }>;
}

/** Map phone number to email: 9876543210 → 9876543210@fineglazeapp.com
 *  NOTE: must be a valid-format TLD accepted by Supabase Auth email validation —
 *  `.app` domains are rejected by GoTrue's email validator ("email_address_invalid"),
 *  even though the address is never actually emailed. Confirmed working: `.com`. */
function phoneToEmail(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `${digits}@fineglazeapp.com`;
}


async function hashPin(pin: string): Promise<string> {
  let salt = await safeGetItem('fg_pin_salt');
  if (!salt) {
    salt = Crypto.randomUUID();
    await safeSetItem('fg_pin_salt', salt);
  }
  let hashed = pin + salt;
  for (let i = 0; i < 1000; i++) {
    hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, hashed);
  }
  return hashed;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  userId: null,
  profile: null,
  hasPin: false,
  isAuthenticated: false,
  loading: true,
  pinLockedUntil: null,

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
    await safeSetItem('fg_pin_hash', hashed);
    await safeDeleteItem('fg_pin_failed_attempts');
    await safeDeleteItem('fg_pin_locked_until');
    set({ hasPin: true, pinLockedUntil: null });
  },

  verifyPin: async (pin) => {
    const lockedUntilStr = await safeGetItem('fg_pin_locked_until');
    if (lockedUntilStr) {
      const lockedUntil = parseInt(lockedUntilStr, 10);
      if (Date.now() < lockedUntil) {
        set({ pinLockedUntil: lockedUntil });
        return false;
      }
    }

    const stored = await safeGetItem('fg_pin_hash');
    if (!stored) return false;
    const hashed = await hashPin(pin);
    const isValid = hashed === stored;

    if (isValid) {
      await safeDeleteItem('fg_pin_failed_attempts');
      await safeDeleteItem('fg_pin_locked_until');
      set({ pinLockedUntil: null });
      return true;
    } else {
      const attemptsStr = await safeGetItem('fg_pin_failed_attempts');
      const attempts = (attemptsStr ? parseInt(attemptsStr, 10) : 0) + 1;
      await safeSetItem('fg_pin_failed_attempts', String(attempts));

      if (attempts >= 5) {
        const lockoutSec = 30 * Math.pow(2, attempts - 5);
        const lockedUntil = Date.now() + lockoutSec * 1000;
        await safeSetItem('fg_pin_locked_until', String(lockedUntil));
        set({ pinLockedUntil: lockedUntil });
      }
      return false;
    }
  },

  checkLockout: async () => {
    const lockedUntilStr = await safeGetItem('fg_pin_locked_until');
    if (lockedUntilStr) {
      const lockedUntil = parseInt(lockedUntilStr, 10);
      if (Date.now() < lockedUntil) {
        set({ pinLockedUntil: lockedUntil });
        return Math.ceil((lockedUntil - Date.now()) / 1000);
      }
    }
    set({ pinLockedUntil: null });
    return 0;
  },

  checkPinExists: async () => {
    const stored = await safeGetItem('fg_pin_hash');
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
      const { data: finData } = await supabase
        .from('profile_financials')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const combined = {
        ...data,
        daily_rate: finData?.daily_rate ?? null,
        bank_details: finData?.bank_details ?? null,
        bank_account: finData?.bank_account ?? null,
        bank_ifsc: finData?.bank_ifsc ?? null,
        pan: finData?.pan ?? null,
        uan: finData?.uan ?? null,
        esi_number: finData?.esi_number ?? null,
      };
      set({ profile: combined as Profile });
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
        await get().checkLockout();
      }
    } catch (e) {
      console.error('Auth init error:', e);
    } finally {
      set({ loading: false });
    }
  },

  changePassword: async (newPassword) => {
    const { userId, profile } = get();
    if (!userId || !profile) return { error: 'Not authenticated' };
    
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { error: error.message };

      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ password_reset_required: false })
        .eq('id', userId);
      if (profileErr) return { error: profileErr.message };

      set({ profile: { ...profile, password_reset_required: false } });
      return {};
    } catch (e: any) {
      return { error: e.message || 'Failed to change password' };
    }
  },
}));
