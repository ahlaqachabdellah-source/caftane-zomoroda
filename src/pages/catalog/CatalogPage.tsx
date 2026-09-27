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
import { useAvailableCaftanIds } from '@/hooks/useAvailableCaftanIds'
import { useLocale } from '@/hooks/useLocale'
import { localizedText } from '@/lib/localized'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 9

type SortKey = 'featured' | 'price_asc' | 'price_desc' | 'name'

/**
 * Public catalog (Phase 5, extended in the final audit) — searchable,
 * filterable, sortable, paginated grid of every publicly visible caftan,
 * straight from the database.
 *
 * Filters: category, free-text search (all translations + color), size,
 * color, max price/day and an availability date range backed by the
 * available_caftan_ids() RPC (server-side, same overlap semantics as the
 * booking exclusion constraint). Sorting and pagination are client-side
 * over the already-fetched public list.
 */
export default function CatalogPage() {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const { caftans, categories, loading, error, refetch } = useCaftans()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sort, setSort] = useState<SortKey>('featured')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Availability date filter — only queries when the range is complete.
  const { ids: availableIds, loading: availabilityLoading } = useAvailableCaftanIds(
    fromDate,
    toDate,
  )

  // Filter option lists derived from the real catalog data.
  const sizes = useMemo(
    () => [...new Set(caftans.map((c) => c.size).filter(Boolean))].sort(),
    [caftans],
  )
  const colors = useMemo(
    () => [...new Set(caftans.map((c) => c.color).filter(Boolean))].sort(),
    [caftans],
  )
  const pricePoints = useMemo(
    () => [...new Set(caftans.map((c) => Number(c.price_per_day)))].sort((a, b) => a - b),
    [caftans],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const max = maxPrice ? Number(maxPrice) : null
    const filtered = caftans.filter((caftan) => {
      if (activeCategory && caftan.category_id !== activeCategory) return false
      if (size && caftan.size !== size) return false
      if (color && caftan.color !== color) return false
      if (max !== null && Number(caftan.price_per_day) > max) return false
      // Availability: when a complete range is selected, the RPC result
      // decides (null = still loading → hide nothing yet to avoid flicker).
      if (availableIds && !availableIds.includes(caftan.id)) return false
      if (!q) return true
      // Search across every translation, not just the active locale
      const haystack = [caftan.name, caftan.description]
        .flatMap((field) => (field && typeof field === 'object' ? Object.values(field) : []))
        .filter((v): v is string => typeof v === 'string')
        .join(' ')
        .toLowerCase()
      return haystack.includes(q) || caftan.color.toLowerCase().includes(q)
    })
    const sorted = [...filtered]
    switch (sort) {
      case 'price_asc':
        sorted.sort((a, b) => Number(a.price_per_day) - Number(b.price_per_day))
        break
      case 'price_desc':
        sorted.sort((a, b) => Number(b.price_per_day) - Number(a.price_per_day))
        break
      case 'name':
        sorted.sort((a, b) =>
          localizedText(a.name, locale).localeCompare(localizedText(b.name, locale), locale),
        )
        break
      default:
        // 'featured' — keep the database order (featured first, then price).
        break
    }
    return sorted
  }, [caftans, activeCategory, query, size, color, maxPrice, sort, availableIds, locale])

  // Reset to the first page whenever the result set changes shape —
  // derived-during-render pattern (setState in an effect would trigger
  // cascading renders; react-hooks v6 flags it).
  const filterKey = [activeCategory, query, size, color, maxPrice, sort, fromDate, toDate].join('|')
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 })
  if (pageState.key !== filterKey) {
    setPageState({ key: filterKey, page: 1 })
  }
  const setPage = (next: number) => setPageState({ key: filterKey, page: next })

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const currentPage = Math.min(pageState.page, pageCount)
  const pageItems = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const selectClass =
    'h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'

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
            {/* Category chips + search */}
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
                      setActiveCategory((current) => (current === category.id ? null : category.id))
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

            {/* Attribute filters + sort */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                aria-label={t('catalog.size_label')}
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className={selectClass}
              >
                <option value="">{t('catalog.all_sizes')}</option>
                {sizes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                aria-label={t('catalog.color_label')}
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className={selectClass}
              >
                <option value="">{t('catalog.all_colors')}</option>
                {colors.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                aria-label={t('catalog.price_max_label')}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className={selectClass}
              >
                <option value="">{t('catalog.price_any')}</option>
                {pricePoints.map((p) => (
                  <option key={p} value={p}>
                    ≤ {formatPrice(p, locale)}
                  </option>
                ))}
              </select>
              <select
                aria-label={t('catalog.sort_label')}
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className={selectClass}
              >
                <option value="featured">{t('catalog.sort_featured')}</option>
                <option value="price_asc">{t('catalog.sort_price_asc')}</option>
                <option value="price_desc">{t('catalog.sort_price_desc')}</option>
                <option value="name">{t('catalog.sort_name')}</option>
              </select>
            </div>

            {/* Availability date range */}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label htmlFor="catalog-from" className="text-muted-foreground">
                {t('catalog.dates_label')}
              </label>
              <Input
                id="catalog-from"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-auto"
              />
              <label htmlFor="catalog-to" className="text-muted-foreground">
                {t('catalog.dates_to')}
              </label>
              <Input
                id="catalog-to"
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
                className="w-auto"
              />
              {(fromDate || toDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setFromDate('')
                    setToDate('')
                  }}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-gold/60 hover:text-foreground"
                >
                  {t('catalog.dates_clear')}
                </button>
              )}
              {availabilityLoading && (
                <span role="status" className="text-xs text-muted-foreground">
                  {t('catalog.loading')}
                </span>
              )}
            </div>

            {/* Results count */}
            <p className="text-sm text-muted-foreground" role="status">
              {t('catalog.results_count', { count: visible.length })}
            </p>

            {/* Grid */}
            {visible.length === 0 ? (
              <EmptyState title={t('catalog.empty_title')} description={t('catalog.empty_body')} />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {pageItems.map((caftan) => (
                    <CaftanCard key={caftan.id} caftan={caftan} />
                  ))}
                </div>

                {pageCount > 1 && (
                  <nav
                    aria-label={t('catalog.pagination_aria')}
                    className="flex items-center justify-center gap-3"
                  >
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setPage(currentPage - 1)}
                      className="rounded-full border border-border px-4 py-2 text-sm transition-colors hover:border-gold/60 disabled:opacity-40"
                    >
                      {t('catalog.page_prev')}
                    </button>
                    <span className="text-sm text-muted-foreground" dir="ltr">
                      {currentPage} / {pageCount}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage >= pageCount}
                      onClick={() => setPage(currentPage + 1)}
                      className="rounded-full border border-border px-4 py-2 text-sm transition-colors hover:border-gold/60 disabled:opacity-40"
                    >
                      {t('catalog.page_next')}
                    </button>
                  </nav>
                )}
              </>
            )}
          </>
        )}
      </Container>
    </main>
  )
}
