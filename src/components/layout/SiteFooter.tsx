import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  Clock,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Music2,
  Phone,
} from 'lucide-react'
import Logo from '@/components/brand/Logo'
import OrnamentDivider from '@/components/layout/OrnamentDivider'
import { useLocale } from '@/hooks/useLocale'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { buildWhatsappLink } from '@/lib/whatsapp'
import { localizedText } from '@/lib/localized'

/**
 * Site footer (Phase 4) — brand block, navigation and real contact
 * details read from the public `site_settings` row. While the backend
 * is not configured (or contact fields are still empty), the contact
 * column is simply omitted — never filled with placeholder data.
 */
export default function SiteFooter() {
  const { t } = useTranslation()
  const { locale, localePath } = useLocale()
  const { settings } = useSiteSettings()

  const whatsapp = settings?.whatsapp_number?.trim()
  // Phase 8: centralized normalization (Moroccan formats) — invalid
  // numbers hide the link instead of producing a broken wa.me URL.
  const whatsappHref = buildWhatsappLink(whatsapp, '')
  const phone = settings?.phone?.trim()
  const email = settings?.email?.trim()
  const address = localizedText(settings?.address ?? null, locale).trim()
  const openingHours = settings?.opening_hours?.trim()
  const plusCode = settings?.plus_code?.trim()
  const mapHref = plusCode
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(plusCode)}`
    : null
  const social = (settings?.social_links ?? {}) as Record<string, string>
  const socialLinks = [
    { key: 'instagram', url: social.instagram?.trim(), icon: Instagram, label: 'Instagram' },
    { key: 'facebook', url: social.facebook?.trim(), icon: Facebook, label: 'Facebook' },
    { key: 'tiktok', url: social.tiktok?.trim(), icon: Music2, label: 'TikTok' },
  ].filter((s) => s.url)
  const hasContact = Boolean(
    whatsappHref || phone || email || address || openingHours || socialLinks.length > 0,
  )

  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3 text-center md:items-start md:text-start">
          <span className="rounded-lg bg-primary-foreground p-2">
            <Logo className="h-16 w-auto" />
          </span>
          <p className="text-xs uppercase tracking-[0.3em] text-gold-soft rtl:tracking-normal">
            {t('common.tagline')}
          </p>
        </div>

        {/* Navigation */}
        <nav
          aria-label={t('footer.nav_aria')}
          className="flex flex-col items-center gap-2 text-sm md:items-start"
        >
          <p className="mb-1 font-display text-lg font-semibold">{t('footer.nav_heading')}</p>
          <Link
            to={localePath('/')}
            className="text-primary-foreground/80 transition-colors hover:text-gold-soft"
          >
            {t('nav.home')}
          </Link>
          <Link
            to={localePath('/caftans')}
            className="text-primary-foreground/80 transition-colors hover:text-gold-soft"
          >
            {t('nav.collection')}
          </Link>
          <Link
            to={localePath('/contact')}
            className="text-primary-foreground/80 transition-colors hover:text-gold-soft"
          >
            {t('nav.contact')}
          </Link>
          <Link
            to={localePath('/account')}
            className="text-primary-foreground/80 transition-colors hover:text-gold-soft"
          >
            {t('nav.account')}
          </Link>
          <Link
            to={localePath('/login')}
            className="text-primary-foreground/80 transition-colors hover:text-gold-soft"
          >
            {t('nav.login')}
          </Link>
        </nav>

        {/* Contact — real data from site_settings, omitted until configured */}
        {hasContact && (
          <div className="flex flex-col items-center gap-2 text-sm md:items-start">
            <p className="mb-1 font-display text-lg font-semibold">{t('footer.contact_heading')}</p>
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary-foreground/80 transition-colors hover:text-gold-soft"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                <span dir="ltr">{whatsapp}</span>
              </a>
            )}
            {phone && (
              <a
                href={`tel:${phone.replace(/\s/g, '')}`}
                className="inline-flex items-center gap-2 text-primary-foreground/80 transition-colors hover:text-gold-soft"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                <span dir="ltr">{phone}</span>
              </a>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-2 text-primary-foreground/80 transition-colors hover:text-gold-soft"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                {email}
              </a>
            )}
            {address && (
              <p className="inline-flex items-start gap-2 text-primary-foreground/80">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {address}
                  {mapHref && (
                    <>
                      {' · '}
                      <a
                        href={mapHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2 transition-colors hover:text-gold-soft"
                      >
                        {t('footer.map_link')}
                      </a>
                    </>
                  )}
                </span>
              </p>
            )}
            {openingHours && (
              <p className="inline-flex items-center gap-2 text-primary-foreground/80">
                <Clock className="h-4 w-4" aria-hidden="true" />
                {t('footer.hours_label')} · {openingHours}
              </p>
            )}
            {socialLinks.length > 0 && (
              <div className="mt-1 flex items-center gap-3">
                {socialLinks.map(({ key, url, icon: Icon, label }) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="text-primary-foreground/80 transition-colors hover:text-gold-soft"
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-primary-foreground/15">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-5 sm:px-6">
          <OrnamentDivider />
          <p className="text-center text-xs text-primary-foreground/70">
            {t('footer.rights', { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  )
}
