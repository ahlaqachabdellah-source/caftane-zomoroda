import { useTranslation } from 'react-i18next'
import { MessageCircle } from 'lucide-react'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { buildWhatsappLink } from '@/lib/whatsapp'

/**
 * Floating WhatsApp contact button (Phase 8).
 *
 * Fixed in the bottom corner (logical `end` — automatically mirrored in
 * RTL), icon-only with an accessible label, prefilled message in the
 * currently selected locale. Renders nothing until the business number
 * is configured in site_settings and validates as a Moroccan number.
 */
export default function WhatsAppFloat() {
  const { t } = useTranslation()
  const { settings } = useSiteSettings()

  const href = buildWhatsappLink(settings?.whatsapp_number, t('whatsapp.floating_message'))
  if (!href) return null

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('whatsapp.floating_label')}
      className="fixed bottom-5 end-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#25d366] text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:bottom-6 sm:end-6 sm:h-14 sm:w-14"
    >
      <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
    </a>
  )
}
