import { useEffect } from 'react'
import { Navigate, Outlet, useLocation, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { DEFAULT_LOCALE, LOCALE_META, isSupportedLocale } from '@/lib/locale'

/**
 * Locale route wrapper (Phase 3).
 * The URL prefix (/:locale) is the single source of truth for language:
 * this component syncs i18next to it, applies dir/lang on <html>
 * (full RTL for Arabic) and redirects unknown prefixes to the default
 * locale while preserving the rest of the path.
 */
export default function LocaleLayout() {
  const { locale: param } = useParams()
  const location = useLocation()
  const { i18n } = useTranslation()
  const supported = isSupportedLocale(param)

  useEffect(() => {
    if (supported && i18n.language !== param) {
      void i18n.changeLanguage(param)
    }
  }, [supported, param, i18n])

  useEffect(() => {
    if (!supported) return
    document.documentElement.lang = param
    document.documentElement.dir = LOCALE_META[param].dir
  }, [supported, param])

  if (!supported) {
    // Strip the unknown first segment ('/de/login' → '/login'), then re-prefix
    // with the default locale ('/fr/login').
    const rest = location.pathname.replace(/^\/[^/]+/, '') || '/'
    const target = rest === '/' ? `/${DEFAULT_LOCALE}` : `/${DEFAULT_LOCALE}${rest}`
    return <Navigate to={`${target}${location.search}${location.hash}`} replace />
  }

  return <Outlet />
}
