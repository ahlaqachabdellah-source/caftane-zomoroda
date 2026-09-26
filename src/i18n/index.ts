import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import ar from './locales/ar.json'
import en from './locales/en.json'
import fr from './locales/fr.json'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/lib/locale'

/**
 * i18next configuration (Phase 3).
 * Detection order: URL path segment → localStorage → browser language,
 * falling back to French. The URL prefix is the authoritative source once
 * the user is inside a locale route (LocaleLayout syncs it).
 */
export const i18nReady = i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
      en: { translation: en },
      fr: { translation: fr },
    },
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    load: 'languageOnly',
    interpolation: { escapeValue: false },
    detection: {
      order: ['path', 'localStorage', 'navigator'],
      lookupFromPathIndex: 0,
      caches: ['localStorage'],
    },
  })

export default i18n
