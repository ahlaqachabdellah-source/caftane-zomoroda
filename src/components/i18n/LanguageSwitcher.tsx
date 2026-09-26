import { useLocation, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'
import {
  LOCALE_META,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  localePath,
  stripLocaleFromPath,
  DEFAULT_LOCALE,
  type Locale,
} from '@/lib/locale'

/**
 * Language switcher (Phase 3) — accessible <select> with native language
 * names. Switching keeps the user on the same page, query string included.
 */
export default function LanguageSwitcher({ className }: { className?: string }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const current = isSupportedLocale(i18n.language) ? i18n.language : DEFAULT_LOCALE

  function switchTo(target: Locale) {
    const rest = stripLocaleFromPath(location.pathname)
    void i18n.changeLanguage(target)
    navigate(`${localePath(rest, target)}${location.search}${location.hash}`)
  }

  return (
    <label
      className={`inline-flex h-10 items-center gap-2 rounded-md px-2 text-sm text-foreground transition-colors hover:bg-accent ${className ?? ''}`}
    >
      <Languages className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">{t('common.language')}</span>
      <select
        aria-label={t('common.language')}
        value={current}
        onChange={(e) => switchTo(e.target.value as Locale)}
        className="cursor-pointer bg-transparent text-sm font-medium outline-none"
      >
        {SUPPORTED_LOCALES.map((lng) => (
          <option key={lng} value={lng}>
            {LOCALE_META[lng].nativeName}
          </option>
        ))}
      </select>
    </label>
  )
}
