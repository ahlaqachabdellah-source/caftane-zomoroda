import { Link, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/hooks/useLocale'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { buildWhatsappLink } from '@/lib/whatsapp'
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
  const { localePath } = useLocale()
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

  // WhatsApp inquiry CTA: the business number comes from site_settings
  // (never hardcoded); an unconfigured/invalid number simply hides the
  // button instead of producing a broken wa.me link.
  const whatsappHref = buildWhatsappLink(settings?.whatsapp_number, t('whatsapp.message_product'))
  const whatsappLink = whatsappHref ? (
    <Button
      asChild
      size="lg"
      variant="outline"
      className="w-full border-gold/60 text-foreground hover:bg-accent sm:w-auto"
    >
      <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
        {t('catalog.whatsapp_cta')}
      </a>
    </Button>
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
