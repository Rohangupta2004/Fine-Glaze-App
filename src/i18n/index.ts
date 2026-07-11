import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import en from './en.json';
import hi from './hi.json';
import mr from './mr.json';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  mr: { translation: mr },
};

// Detect device language, fall back to English
const deviceLang = getLocales()[0]?.languageCode ?? 'en';
const supportedLang = ['en', 'hi', 'mr'].includes(deviceLang) ? deviceLang : 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: supportedLang,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React already escapes
  },
  compatibilityJSON: 'v4',
});

export default i18n;
