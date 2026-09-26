/**
 * Locale primitives (Phase 3) — single source of truth for supported
 * languages, directionality and Intl tags.
 */

export const SUPPORTED_LOCALES = ['fr', 'ar', 'en'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

/** Site default when nothing else matches (Morocco market). */
export const DEFAULT_LOCALE: Locale = 'fr'

export const LOCALE_META: Record<
  Locale,
  { nativeName: string; dir: 'ltr' | 'rtl'; intlTag: string }
> = {
  fr: { nativeName: 'Français', dir: 'ltr', intlTag: 'fr-MA' },
  ar: { nativeName: 'العربية', dir: 'rtl', intlTag: 'ar-MA' },
  en: { nativeName: 'English', dir: 'ltr', intlTag: 'en-US' },
}

export function isSupportedLocale(value: string | undefined | null): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale)
}

/** '/fr/login' → '/login' ; '/login' → '/login' */
export function stripLocaleFromPath(pathname: string): string {
  const [, maybeLocale, ...rest] = pathname.split('/')
  if (isSupportedLocale(maybeLocale)) {
    const tail = rest.join('/')
    return tail ? `/${tail}` : '/'
  }
  return pathname
}

/** ('/login', 'ar') → '/ar/login' ; ('/', 'fr') → '/fr' */
export function localePath(path: string, locale: Locale): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  return clean === '/' ? `/${locale}` : `/${locale}${clean}`
}
