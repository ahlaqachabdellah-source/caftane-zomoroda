import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/hooks/useLocale'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { localizedText } from '@/lib/localized'
import type { CatalogCaftan } from '@/lib/caftans'

/**
 * Contextual booking CTA (Phase 5).
 *
 * The full booking form is Phase 6, so this component only offers real,
 * working paths:
 *  - maintenance caftan      → honest "not bookable right now" notice
 *  - WhatsApp configured     → wa.me chat with a pre-filled, localized
 *                              message naming the caftan (any visitor)
 *  - otherwise, signed out   → sign-in / register prompts (booking needs
 *                              an account)
 *  - signed in, no WhatsApp  → booking-online-coming note (no dead links)
 */
export default function BookingCta({ caftan }: { caftan: CatalogCaftan }) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { locale, localePath } = useLocale()
  const { settings } = useSiteSettings()

  if (caftan.status === 'maintenance') {
    return (
      <p role="note" className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
        {t('catalog.maintenance_notice')}
      </p>
    )
  }

  const whatsapp = settings?.whatsapp_number?.trim()
  if (whatsapp) {
    const name = localizedText(caftan.name, locale)
    const message = encodeURIComponent(t('catalog.whatsapp_message', { name }))
    return (
      <Button asChild size="lg" className="w-full sm:w-auto">
        <a
          href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}?text=${message}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          {t('catalog.book_whatsapp')}
        </a>
      </Button>
    )
  }

  if (!session) {
    return (
      <div className="flex flex-col gap-3">
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link to={localePath('/login')}>{t('catalog.book_login_cta')}</Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          {t('catalog.book_no_account')}{' '}
          <Link to={localePath('/register')} className="font-medium text-foreground underline underline-offset-4">
            {t('catalog.book_register_link')}
          </Link>
        </p>
      </div>
    )
  }

  return (
    <p role="note" className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
      {t('catalog.book_online_coming')}
    </p>
  )
}
