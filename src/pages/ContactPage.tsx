import { useTranslation } from 'react-i18next'
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import Container from '@/components/layout/Container'
import OrnamentDivider from '@/components/layout/OrnamentDivider'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/hooks/useLocale'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import Seo from '@/components/seo/Seo'
import { buildWhatsappLink } from '@/lib/whatsapp'
import { localizedText } from '@/lib/localized'

/**
 * Contact page — WhatsApp is the primary contact channel. The number
 * always comes from the `site_settings` row (never hardcoded); while it
 * is missing or invalid the button is simply hidden, never broken.
 * Address, hours, phone and email are shown only when really configured.
 */
export default function ContactPage() {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const { settings } = useSiteSettings()

  const whatsapp = settings?.whatsapp_number?.trim()
  const whatsappHref = buildWhatsappLink(whatsapp, t('whatsapp.message_contact'))
  const phone = settings?.phone?.trim()
  const email = settings?.email?.trim()
  const address = localizedText(settings?.address ?? null, locale).trim()
  const openingHours = settings?.opening_hours?.trim()
  const plusCode = settings?.plus_code?.trim()
  const mapHref = plusCode
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(plusCode)}`
    : null
  const hasInfo = Boolean(address || openingHours || phone || email)

  return (
    <main className="flex flex-1 flex-col">
      <Seo
        title={t('seo.contact_title')}
        description={t('seo.contact_description')}
        path="/contact"
      />
      <section className="py-16 sm:py-24">
        <Container className="flex flex-col items-center gap-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-strong rtl:tracking-normal sm:text-sm">
            {t('contact.kicker')}
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
            {t('contact.title')}
          </h1>
          <OrnamentDivider className="w-32" />
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('contact.lede')}
          </p>
          {whatsappHref && (
            <Button asChild size="lg" className="mt-2 w-full max-w-md px-8 sm:w-auto">
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                {t('contact.whatsapp_cta')}
              </a>
            </Button>
          )}
        </Container>
      </section>

      {hasInfo && (
        <section className="border-t border-border py-16 sm:py-20">
          <Container className="flex flex-col items-center gap-8">
            <h2 className="font-display text-2xl font-semibold text-foreground">
              {t('contact.info_heading')}
            </h2>
            <div className="flex w-full max-w-2xl flex-col gap-4 rounded-xl border border-border bg-card p-8 shadow-xs">
              {address && (
                <p className="inline-flex items-start gap-3 text-sm text-foreground">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    {address}
                    {mapHref && (
                      <>
                        {' · '}
                        <a
                          href={mapHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary underline underline-offset-2 transition-colors hover:text-gold-strong"
                        >
                          {t('footer.map_link')}
                        </a>
                      </>
                    )}
                  </span>
                </p>
              )}
              {openingHours && (
                <p className="inline-flex items-center gap-3 text-sm text-foreground">
                  <Clock className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  {t('footer.hours_label')} · {openingHours}
                </p>
              )}
              {phone && (
                <a
                  href={`tel:${phone.replace(/\s/g, '')}`}
                  className="inline-flex items-center gap-3 text-sm text-foreground transition-colors hover:text-gold-strong"
                >
                  <Phone className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <span dir="ltr">{phone}</span>
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="inline-flex items-center gap-3 text-sm text-foreground transition-colors hover:text-gold-strong"
                >
                  <Mail className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  {email}
                </a>
              )}
            </div>
          </Container>
        </section>
      )}
    </main>
  )
}
