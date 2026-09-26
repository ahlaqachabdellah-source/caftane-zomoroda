import { Link, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/hooks/useLocale'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { localizedText } from '@/lib/localized'
import type { CatalogCaftan } from '@/lib/caftans'

/**
 * Booking CTA (Phase 6) — the primary action is the real booking flow:
 *  - maintenance caftan  → honest "not bookable right now" notice
 *  - signed in           → link to the booking page for this caftan
 *  - signed out          → sign-in prompt (ProtectedRoute returns the
 *                          visitor here after login) + register link
 * When a WhatsApp number is configured, a secondary inquiry link is
 * always offered alongside.
 */
export default function BookingCta({ caftan }: { caftan: CatalogCaftan }) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { locale, localePath } = useLocale()
  const { settings } = useSiteSettings()
  // So the customer returns to this caftan after signing in.
  const location = useLocation()

  if (caftan.status === 'maintenance') {
    return (
      <p role="note" className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
        {t('catalog.maintenance_notice')}
      </p>
    )
  }

  const whatsapp = settings?.whatsapp_number?.trim()
  const whatsappLink = whatsapp ? (
    <a
      href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
        t('catalog.whatsapp_message', { name: localizedText(caftan.name, locale) }),
      )}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
    >
      <MessageCircle className="h-4 w-4" aria-hidden="true" />
      {t('catalog.book_whatsapp')}
    </a>
  ) : null

  return (
    <div className="flex flex-col gap-3">
      {session ? (
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link to={localePath(`/caftans/${caftan.slug}/book`)}>{t('catalog.book_cta')}</Link>
        </Button>
      ) : (
        <>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to={localePath('/login')} state={{ from: location }}>
              {t('catalog.book_login_cta')}
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            {t('catalog.book_no_account')}{' '}
            <Link
              to={localePath('/register')}
              className="font-medium text-foreground underline underline-offset-4"
            >
              {t('catalog.book_register_link')}
            </Link>
          </p>
        </>
      )}
      {whatsappLink}
    </div>
  )
}
