import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { Platform } from 'react-native';

import en from './en.json';
import hi from './hi.json';
import mr from './mr.json';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  mr: { translation: mr },
};

const STORAGE_KEY = 'fineglaze_language';
const SUPPORTED = ['en', 'hi', 'mr'];

// ── Persistence helpers ────────────────────────────────────────────
function getSavedLanguageSync(): string | null {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    return localStorage.getItem(STORAGE_KEY);
  }
  return null; // Native will load async after init
}

async function getSavedLanguageAsync(): Promise<string | null> {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    return localStorage.getItem(STORAGE_KEY);
  }
  try {
    const SecureStore = require('expo-secure-store') as typeof import('expo-secure-store');
    return await SecureStore.getItemAsync(STORAGE_KEY);
  } catch {
    return null;
  }
}

async function saveLanguage(lang: string): Promise<void> {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, lang);
    return;
  }
  try {
    const SecureStore = require('expo-secure-store') as typeof import('expo-secure-store');
    await SecureStore.setItemAsync(STORAGE_KEY, lang);
  } catch {
    // Silently fail on storage error
  }
}

// ── Determine initial language ─────────────────────────────────────
// On web we can read localStorage synchronously before init.
// On native we start with device lang then switch after async read.
const savedSync = getSavedLanguageSync();
const deviceLang = getLocales()[0]?.languageCode ?? 'en';
const initialLang = savedSync && SUPPORTED.includes(savedSync)
  ? savedSync
  : SUPPORTED.includes(deviceLang)
    ? deviceLang
    : 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: initialLang,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React already escapes
  },
  compatibilityJSON: 'v4',
});

// ── Persist on every language change ───────────────────────────────
i18n.on('languageChanged', (lang) => {
  saveLanguage(lang);
});

// ── Native: async restore (will trigger languageChanged → re-render) ──
if (Platform.OS !== 'web') {
  getSavedLanguageAsync().then((saved) => {
    if (saved && SUPPORTED.includes(saved) && saved !== i18n.language) {
      i18n.changeLanguage(saved);
    }
  });
}

export default i18n;
