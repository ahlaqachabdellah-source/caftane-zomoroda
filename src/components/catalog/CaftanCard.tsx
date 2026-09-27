import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import CaftanImage from '@/components/catalog/CaftanImage'
import { sortCaftanImages, type CatalogCaftan } from '@/lib/caftans'
import { formatPrice } from '@/lib/format'
import { localizedText } from '@/lib/localized'
import { useLocale } from '@/hooks/useLocale'

/**
 * Catalog card (Phase 5) — photo, localized name, category, daily price,
 * featured / maintenance badges. The whole card links to the detail page.
 */
export default function CaftanCard({ caftan }: { caftan: CatalogCaftan }) {
  const { t } = useTranslation()
  const { locale, localePath } = useLocale()

  const name = localizedText(caftan.name, locale)
  const categoryName = caftan.category ? localizedText(caftan.category.name, locale) : ''
  const primary = sortCaftanImages(caftan.images)[0] ?? null
  const alt = primary ? localizedText(primary.alt_text, locale) || name : name
  const maintenance = caftan.status === 'maintenance'

  return (
    <Link
      to={localePath(`/caftans/${caftan.slug}`)}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs transition-colors hover:border-gold/60"
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <CaftanImage
          storagePath={primary?.storage_path}
          alt={alt}
          widths={[400, 800, 1200]}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="h-full w-full transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div className="absolute start-3 top-3 flex flex-col gap-2">
          {caftan.featured && (
            <span className="rounded-full bg-gold-strong px-3 py-1 text-xs font-semibold text-gold-foreground">
              {t('catalog.featured_badge')}
            </span>
          )}
          {maintenance && (
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
              {t('catalog.maintenance_badge')}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        {categoryName && (
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-strong rtl:tracking-normal">
            {categoryName}
          </p>
        )}
        <h3 className="font-display text-xl font-semibold text-foreground">{name}</h3>
        <p className="mt-auto pt-2 text-sm text-muted-foreground">
          <span className="text-base font-semibold text-foreground">
            {formatPrice(Number(caftan.price_per_day), locale)}
          </span>{' '}
          {t('catalog.per_day')}
        </p>
      </div>
    </Link>
  )
}
