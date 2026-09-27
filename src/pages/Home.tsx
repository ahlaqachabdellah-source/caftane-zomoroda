import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { CalendarCheck, Gem, MessageCircle, Sparkles } from 'lucide-react'
import Container from '@/components/layout/Container'
import SectionHeading from '@/components/layout/SectionHeading'
import OrnamentDivider from '@/components/layout/OrnamentDivider'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/hooks/useLocale'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import Seo from '@/components/seo/Seo'
import { siteOrigin } from '@/lib/seo'
import { normalizeWhatsappNumber } from '@/lib/whatsapp'

/**
 * Home page (Phase 4) — branded landing built entirely on the design
 * system. All CTAs point to real routes; the collection itself arrives
 * with the catalog phase.
 */
export default function Home() {
  const { t } = useTranslation()
  const { localePath } = useLocale()
  const { settings } = useSiteSettings()

  // LocalBusiness structured data — only real, known information is
  // included; anything missing (address, hours, ratings) is omitted,
  // never fabricated.
  const phone = settings?.whatsapp_number
    ? `+${normalizeWhatsappNumber(settings.whatsapp_number)}`
    : settings?.phone || null
  const localBusinessLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Caftan Zomoroda',
    description: t('seo.business_description'),
    url: siteOrigin(),
    image: `${siteOrigin()}/android-chrome-512x512.png`,
    ...(phone ? { telephone: phone } : {}),
  }

  const steps = [
    {
      icon: Gem,
      title: t('home.step1_title'),
      body: t('home.step1_body'),
    },
    {
      icon: CalendarCheck,
      title: t('home.step2_title'),
      body: t('home.step2_body'),
    },
    {
      icon: Sparkles,
      title: t('home.step3_title'),
      body: t('home.step3_body'),
    },
  ]

  const values = [
    { title: t('home.value1_title'), body: t('home.value1_body') },
    { title: t('home.value2_title'), body: t('home.value2_body') },
    { title: t('home.value3_title'), body: t('home.value3_body') },
  ]

  return (
    <main className="flex flex-1 flex-col">
      <Seo
        title={t('seo.home_title')}
        description={t('seo.home_description')}
        path="/"
        jsonLd={[localBusinessLd]}
      />
      {/* Hero */}
      <section className="border-b border-border">
        <Container className="flex flex-col items-center gap-6 py-16 text-center sm:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold rtl:tracking-normal sm:text-sm">
            {t('home.hero_kicker')}
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {t('home.hero_title')}
          </h1>
          <OrnamentDivider className="w-32" />
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('home.hero_lede')}
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="px-8">
              <Link to={localePath('/register')}>{t('home.hero_cta_primary')}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-gold/60 px-8 text-foreground hover:bg-accent">
              <Link to={localePath('/caftans')}>{t('home.hero_cta_secondary')}</Link>
            </Button>
          </div>
        </Container>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 py-16 sm:py-20">
        <Container className="flex flex-col gap-12">
          <SectionHeading
            kicker={t('home.steps_kicker')}
            title={t('home.steps_title')}
            description={t('home.steps_description')}
          />
          <div className="grid gap-6 sm:grid-cols-3">
            {steps.map((step, i) => (
              <article
                key={step.title}
                className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-8 text-center shadow-xs transition-colors hover:border-gold/50"
              >
                <span className="font-display text-4xl font-semibold text-gold">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <step.icon className="h-7 w-7 text-primary" aria-hidden="true" />
                <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      {/* Values band — deep brand green */}
      <section className="bg-primary py-16 text-primary-foreground sm:py-20">
        <Container className="flex flex-col gap-12">
          <SectionHeading
            onDark
            kicker={t('home.values_kicker')}
            title={t('home.values_title')}
            description={t('home.values_description')}
          />
          <div className="grid gap-8 sm:grid-cols-3">
            {values.map((value) => (
              <div key={value.title} className="flex flex-col items-center gap-3 text-center">
                <h3 className="text-xl font-semibold text-gold">{value.title}</h3>
                <p className="text-sm leading-relaxed text-primary-foreground/80">{value.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-20">
        <Container className="flex flex-col items-center gap-5 text-center">
          <MessageCircle className="h-8 w-8 text-gold" aria-hidden="true" />
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {t('home.cta_title')}
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t('home.cta_body')}
          </p>
          <Button asChild size="lg" className="mt-2 px-8">
            <Link to={localePath('/register')}>{t('home.cta_button')}</Link>
          </Button>
        </Container>
      </section>
    </main>
  )
}
