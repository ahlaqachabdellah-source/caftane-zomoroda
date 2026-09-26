import { useTranslation } from 'react-i18next'
import {
  DEFAULT_LOCALE,
  LOCALE_META,
  isSupportedLocale,
  localePath,
  type Locale,
} from '@/lib/locale'

/**
 * Current locale helpers for components: the active locale (from i18next,
 * which LocaleLayout keeps in sync with the URL), its direction, and a
 * locale-aware path builder for internal links.
 */
export function useLocale(): {
  locale: Locale
  dir: 'ltr' | 'rtl'
  localePath: (path: string) => string
} {
  const { i18n } = useTranslation()
  const locale = isSupportedLocale(i18n.language) ? i18n.language : DEFAULT_LOCALE
  return {
    locale,
    dir: LOCALE_META[locale].dir,
    localePath: (path: string) => localePath(path, locale),
  }
}
