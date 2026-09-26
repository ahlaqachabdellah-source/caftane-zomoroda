import { Navigate, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { DEFAULT_LOCALE, isSupportedLocale } from '@/lib/locale'

/**
 * Entry redirect (Phase 3): sends '/', unknown paths and non-localized
 * callbacks (e.g. the Supabase recovery link) into the detected/default
 * locale — query string and hash are preserved so auth codes survive.
 */
export default function LocaleRedirect() {
  const { i18n } = useTranslation()
  const location = useLocation()
  const locale = isSupportedLocale(i18n.language) ? i18n.language : DEFAULT_LOCALE
  return <Navigate to={`/${locale}${location.search}${location.hash}`} replace />
}
