import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/hooks/useLocale'
import Seo from '@/components/seo/Seo'

/**
 * Localized 404 page (Phase 12) — shown for unknown URLs inside a locale.
 * Offers recovery actions (back / home) and exposes nothing technical.
 */
export default function NotFoundPage() {
  const { t } = useTranslation()
  const { localePath } = useLocale()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <Seo title={t('seo.notfound_title')} description={t('seo.home_description')} noindex />
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Compass className="h-7 w-7" aria-hidden="true" />
      </span>
      <h1 className="font-display text-2xl font-semibold text-foreground">{t('notfound.title')}</h1>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{t('notfound.body')}</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>
          {t('notfound.back')}
        </Button>
        <Button asChild>
          <Link to={localePath('/')}>{t('notfound.home')}</Link>
        </Button>
      </div>
    </div>
  )
}
