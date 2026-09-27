import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import CaftanCard from '@/components/catalog/CaftanCard'
import Container from '@/components/layout/Container'
import SectionHeading from '@/components/layout/SectionHeading'
import EmptyState from '@/components/states/EmptyState'
import ErrorState from '@/components/states/ErrorState'
import { CatalogGridSkeleton } from '@/components/states/skeletons'
import Seo from '@/components/seo/Seo'
import { Input } from '@/components/ui/input'
import { useCaftans } from '@/hooks/useCaftans'
import { useLocale } from '@/hooks/useLocale'
import { localizedText } from '@/lib/localized'
import { cn } from '@/lib/utils'

/**
 * Public catalog (Phase 5) — searchable, filterable grid of every
 * publicly visible caftan, straight from the database.
 */
export default function CatalogPage() {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const { caftans, categories, loading, error, refetch } = useCaftans()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return caftans.filter((caftan) => {
      if (activeCategory && caftan.category_id !== activeCategory) return false
      if (!q) return true
      // Search across every translation, not just the active locale
      const haystack = [caftan.name, caftan.description]
        .flatMap((field) => (field && typeof field === 'object' ? Object.values(field) : []))
        .filter((v): v is string => typeof v === 'string')
        .join(' ')
        .toLowerCase()
      return haystack.includes(q) || caftan.color.toLowerCase().includes(q)
    })
  }, [caftans, activeCategory, query])

  return (
    <main className="flex flex-1 flex-col">
      <Container className="flex flex-col gap-10 py-12 sm:py-16">
        <Seo
          title={t('seo.catalog_title')}
          description={t('seo.catalog_description')}
          path="/caftans"
        />
        <SectionHeading
          kicker={t('catalog.kicker')}
          title={t('catalog.title')}
          description={t('catalog.subtitle')}
        />

        {loading && <CatalogGridSkeleton label={t('catalog.loading')} />}

        {!loading && error && (
          <ErrorState description={t('catalog.error_body')} onRetry={refetch} />
        )}

        {!loading && !error && (
          <>
            {/* Filters */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div
                role="group"
                aria-label={t('catalog.filter_aria')}
                className="flex flex-wrap items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => setActiveCategory(null)}
                  className={cn(
                    'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                    activeCategory === null
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:border-gold/60 hover:text-foreground',
                  )}
                >
                  {t('catalog.filter_all')}
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() =>
                      setActiveCategory((current) =>
                        current === category.id ? null : category.id,
                      )
                    }
                    aria-pressed={activeCategory === category.id}
                    className={cn(
                      'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                      activeCategory === category.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-muted-foreground hover:border-gold/60 hover:text-foreground',
                    )}
                  >
                    {localizedText(category.name, locale)}
                  </button>
                ))}
              </div>
              <div className="relative md:w-72">
                <Search
                  className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('catalog.search_ph')}
                  aria-label={t('catalog.search_aria')}
                  className="ps-9"
                />
              </div>
            </div>

            {/* Grid */}
            {visible.length === 0 ? (
              <EmptyState
                title={t('catalog.empty_title')}
                description={t('catalog.empty_body')}
              />
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((caftan) => (
                  <CaftanCard key={caftan.id} caftan={caftan} />
                ))}
              </div>
            )}
          </>
        )}
      </Container>
    </main>
  )
}
