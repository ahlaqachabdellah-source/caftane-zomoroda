import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Palette, Ruler } from 'lucide-react'
import BookingCta from '@/components/catalog/BookingCta'
import CaftanImage from '@/components/catalog/CaftanImage'
import Container from '@/components/layout/Container'
import OrnamentDivider from '@/components/layout/OrnamentDivider'
import EmptyState from '@/components/states/EmptyState'
import ErrorState from '@/components/states/ErrorState'
import { CaftanDetailSkeleton } from '@/components/states/skeletons'
import { Button } from '@/components/ui/button'
import { useCaftanDetail } from '@/hooks/useCaftanDetail'
import { useLocale } from '@/hooks/useLocale'
import { sortCaftanImages } from '@/lib/caftans'
import { formatPrice } from '@/lib/format'
import { localizedText } from '@/lib/localized'
import { cn } from '@/lib/utils'

/**
 * Caftan detail (Phase 5) — gallery, localized description, practical
 * details (size, color, deposit) and the contextual booking CTA.
 */
export default function CaftanDetailPage() {
  const { slug } = useParams()
  const { t } = useTranslation()
  const { locale, localePath } = useLocale()
  const { caftan, loading, error, notFound, refetch } = useCaftanDetail(slug)
  const [activeImage, setActiveImage] = useState(0)

  if (loading) {
    return (
      <main className="flex flex-1 flex-col">
        <Container className="py-10 sm:py-14">
          <CaftanDetailSkeleton label={t('catalog.loading')} />
        </Container>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex flex-1 flex-col">
        <ErrorState className="py-24" description={t('catalog.error_body')} onRetry={refetch} />
      </main>
    )
  }

  if (notFound || !caftan) {
    return (
      <main className="flex flex-1 flex-col">
        <EmptyState
          className="py-24"
          title={t('catalog.not_found_title')}
          description={t('catalog.not_found_body')}
          action={
            <Button asChild variant="outline">
              <Link to={localePath('/caftans')}>{t('catalog.back_to_catalog')}</Link>
            </Button>
          }
        />
      </main>
    )
  }

  const name = localizedText(caftan.name, locale)
  const description = localizedText(caftan.description, locale)
  const categoryName = caftan.category ? localizedText(caftan.category.name, locale) : ''
  const images = sortCaftanImages(caftan.images)
  const current = images[Math.min(activeImage, Math.max(images.length - 1, 0))] ?? null

  return (
    <main className="flex flex-1 flex-col">
      <Container className="flex flex-col gap-10 py-10 sm:py-14">
        <Link
          to={localePath('/caftans')}
          className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          {t('catalog.back_to_catalog')}
        </Link>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* Gallery */}
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-xl border border-border">
              <CaftanImage
                storagePath={current?.storage_path}
                alt={current ? localizedText(current.alt_text, locale) || name : name}
                widths={[600, 1000, 1400]}
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
                className="aspect-[3/4] w-full"
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    aria-label={localizedText(image.alt_text, locale) || name}
                    aria-pressed={index === activeImage}
                    className={cn(
                      'h-20 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-colors',
                      index === activeImage ? 'border-gold' : 'border-border hover:border-gold/50',
                    )}
                  >
                    <CaftanImage
                      storagePath={image.storage_path}
                      alt=""
                      widths={[160, 320]}
                      sizes="64px"
                      className="h-full w-full"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col gap-5">
            {categoryName && (
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold rtl:tracking-normal">
                {categoryName}
              </p>
            )}
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {name}
            </h1>
            <OrnamentDivider />
            {description && (
              <p className="leading-relaxed text-muted-foreground">{description}</p>
            )}

            <dl className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sm text-muted-foreground">{t('catalog.price_label')}</dt>
                <dd className="text-lg font-semibold text-foreground">
                  {formatPrice(Number(caftan.price_per_day), locale)}{' '}
                  <span className="text-sm font-normal text-muted-foreground">
                    {t('catalog.per_day')}
                  </span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
                <dt className="text-sm text-muted-foreground">{t('catalog.deposit_label')}</dt>
                <dd className="font-medium text-foreground">
                  {formatPrice(Number(caftan.deposit_amount), locale)}
                </dd>
              </div>
              {(caftan.size || caftan.color) && (
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-3 text-sm text-muted-foreground">
                  {caftan.size && (
                    <span className="inline-flex items-center gap-2">
                      <Ruler className="h-4 w-4 text-gold" aria-hidden="true" />
                      {t('catalog.size_label')}: {caftan.size}
                    </span>
                  )}
                  {caftan.color && (
                    <span className="inline-flex items-center gap-2">
                      <Palette className="h-4 w-4 text-gold" aria-hidden="true" />
                      {t('catalog.color_label')}: {caftan.color}
                    </span>
                  )}
                </div>
              )}
            </dl>

            <BookingCta caftan={caftan} />
          </div>
        </div>
      </Container>
    </main>
  )
}
