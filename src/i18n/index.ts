import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/lib/locale'

/**
 * i18next configuration (Phase 3).
 * Detection order: URL path segment → localStorage → browser language,
 * falling back to French. The URL prefix is the authoritative source once
 * the user is inside a locale route (LocaleLayout syncs it).
 *
 * Phase 14: locale bundles are code-split and loaded on demand instead of
 * inlining all three languages into the entry chunk (~90 kB raw). The
 * detected locale plus the fallback are loaded before the app renders
 * (main.tsx gates on i18nReady); switching languages lazy-loads the third
 * bundle. Test mode preloads everything so assertions stay deterministic.
 */

type LocaleBundle = Record<string, unknown>
const localeLoaders: Record<string, () => Promise<{ default: LocaleBundle }>> = {
  ar: () => import('./locales/ar.json'),
  en: () => import('./locales/en.json'),
  fr: () => import('./locales/fr.json'),
}

function baseLocale(lng: string | undefined | string[]): string {
  const raw = Array.isArray(lng) ? lng[0] : lng
  const base = (raw ?? '').split('-')[0]
  return (SUPPORTED_LOCALES as readonly string[]).includes(base) ? base : DEFAULT_LOCALE
}

const detection = {
  order: ['path', 'localStorage', 'navigator'],
  lookupFromPathIndex: 0,
  caches: ['localStorage'],
}

export const i18nReady = (async () => {
  // Same detector + options i18next will use, so the preloaded bundles
  // always match what init detects.
  const detector = new LanguageDetector(null, { ...detection })
  const initial = baseLocale(detector.detect())

  const preload =
    import.meta.env.MODE === 'test'
      ? [...SUPPORTED_LOCALES]
      : [...new Set([initial, DEFAULT_LOCALE])]
  const bundles = await Promise.all(
    preload.map(async (l) => [l, (await localeLoaders[l]()).default] as const),
  )

  await i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: Object.fromEntries(bundles.map(([l, b]) => [l, { translation: b }])),
      lng: initial,
      fallbackLng: DEFAULT_LOCALE,
      supportedLngs: [...SUPPORTED_LOCALES],
      load: 'languageOnly',
      partialBundledLanguages: true,
      interpolation: { escapeValue: false },
      detection: { ...detection },
    })

  // Lazy-load a locale bundle the first time the user switches to it,
  // then re-emit languageChanged so react-i18next re-renders with it.
  i18n.on('languageChanged', (lng) => {
    const target = baseLocale(lng)
    if (i18n.hasResourceBundle(target, 'translation')) return
    void localeLoaders[target]().then((mod) => {
      i18n.addResourceBundle(target, 'translation', mod.default, true, true)
      void i18n.changeLanguage(target)
    })
  })
})()

export default i18n
