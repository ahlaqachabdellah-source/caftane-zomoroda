/**
 * SEO primitives (Phase 15) — absolute-URL resolution and locale
 * alternates. The public origin comes from VITE_SITE_URL in production;
 * when it is not configured (local dev, preview), the current window
 * origin is used so generated URLs are always absolute and consistent.
 */

import { DEFAULT_LOCALE, SUPPORTED_LOCALES, localePath, type Locale } from '@/lib/locale'

/** Configured public site origin, e.g. https://caftan-zomoroda.com ('' = unset). */
export function configuredSiteUrl(): string {
  const raw = import.meta.env.VITE_SITE_URL as string | undefined
  return raw ? raw.replace(/\/+$/, '') : ''
}

/** Best available absolute origin (env first, then the live origin). */
export function siteOrigin(): string {
  if (configuredSiteUrl()) return configuredSiteUrl()
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin
  return ''
}

/** Absolute URL for a locale-aware path: ('/caftans/x', 'ar') → origin + '/ar/caftans/x'. */
export function absoluteLocaleUrl(path: string, locale: Locale): string {
  return `${siteOrigin()}${localePath(path, locale)}`
}

/**
 * hreflang alternates for a locale-neutral path: one entry per supported
 * locale plus x-default pointing at the default locale.
 */
export function localeAlternates(path: string): Array<{ hreflang: string; href: string }> {
  const entries: Array<{ hreflang: string; href: string }> = SUPPORTED_LOCALES.map((locale) => ({
    hreflang: locale,
    href: absoluteLocaleUrl(path, locale),
  }))
  entries.push({ hreflang: 'x-default', href: absoluteLocaleUrl(path, DEFAULT_LOCALE) })
  return entries
}

/** og:locale uses full region tags (ar_MA / fr_MA / en_US). */
export function ogLocale(locale: Locale): string {
  return { fr: 'fr_MA', ar: 'ar_MA', en: 'en_US' }[locale]
}
