import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Search, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import LoadingState from '@/components/states/LoadingState'
import ErrorState from '@/components/states/ErrorState'
import EmptyState from '@/components/states/EmptyState'
import CaftanStatusBadge from '@/components/admin/CaftanStatusBadge'
import { useAdminCaftans } from '@/hooks/useAdminCaftans'
import { useCaftanMutations } from '@/hooks/useCaftanMutations'
import { useAdminCategories } from '@/hooks/useAdminCategories'
import { useLocale } from '@/hooks/useLocale'
import { getCaftanImageUrl, sortCaftanImages, type CatalogCaftan } from '@/lib/caftans'
import { localizedText, nameInLocale } from '@/lib/localized'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CaftanStatus } from '@/types/database.types'

/**
 * Admin caftan list (Phase 10) — search (name in the current locale +
 * slug), status and category filters, inline featured toggle, edit and
 * delete actions. Deleting a caftan that has bookings is blocked by the
 * database (FK restrict): the dialog then offers retiring it instead.
 */

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'

export default function AdminCaftansPage() {
  const { t } = useTranslation()
  const { locale, localePath } = useLocale()
  const { caftans, loading, error, refetch } = useAdminCaftans()
  const { categories } = useAdminCategories()
  const { deleteCaftan, updateCaftanFields } = useCaftanMutations()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | CaftanStatus>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [noticeKey, setNoticeKey] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<CatalogCaftan | null>(null)
  const [deleteErrorKey, setDeleteErrorKey] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return caftans.filter((caftan) => {
      if (statusFilter !== 'all' && caftan.status !== statusFilter) return false
      if (categoryFilter !== 'all' && caftan.category_id !== categoryFilter) return false
      if (!term) return true
      const haystack = [
        caftan.slug,
        nameInLocale(caftan.name, 'ar'),
        nameInLocale(caftan.name, 'fr'),
        nameInLocale(caftan.name, 'en'),
        caftan.color,
        caftan.size,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [caftans, search, statusFilter, categoryFilter])

  async function handleToggleFeatured(caftan: CatalogCaftan) {
    setNoticeKey(null)
    const result = await updateCaftanFields(caftan.id, { featured: !caftan.featured })
    if (result.ok) {
      setNoticeKey(
        caftan.featured ? 'admin.caftans.notice_unfeatured' : 'admin.caftans.notice_featured',
      )
      refetch()
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    setDeleteErrorKey(null)
    const result = await deleteCaftan(pendingDelete.id)
    setDeleting(false)
    if (result.ok) {
      setPendingDelete(null)
      setNoticeKey('admin.caftans.notice_deleted')
      refetch()
    } else {
      setDeleteErrorKey(result.errorKey)
    }
  }

  async function handleRetireInstead() {
    if (!pendingDelete) return
    setDeleting(true)
    const result = await updateCaftanFields(pendingDelete.id, { status: 'retired' })
    setDeleting(false)
    if (result.ok) {
      setPendingDelete(null)
      setNoticeKey('admin.caftans.notice_retired')
      refetch()
    } else {
      setDeleteErrorKey(result.errorKey)
    }
  }

  if (loading) {
    return <LoadingState label={t('admin.loading')} className="py-24" />
  }
  if (error) {
    return (
      <ErrorState
        title={t('admin.load_error_title')}
        description={t('admin.caftans.error_load')}
        onRetry={refetch}
        className="py-24"
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t('admin.caftans.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('admin.caftans.subtitle')}</p>
        </div>
        <Button asChild>
          <Link to={localePath('/admin/caftans/new')}>
            <Plus aria-hidden="true" />
            {t('admin.caftans.new_cta')}
          </Link>
        </Button>
      </div>

      {noticeKey && (
        <p role="status" className="rounded-md border border-gold bg-accent px-4 py-3 text-sm text-foreground">
          {t(noticeKey)}
        </p>
      )}

      {/* Search & filters */}
      <div className="grid gap-3 rounded-xl border border-border bg-background p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="caftan-search">{t('admin.caftans.search_label')}</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="caftan-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.caftans.search_placeholder')}
              className="ps-9"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="caftan-status-filter">{t('admin.caftans.filter_status')}</Label>
          <select
            id="caftan-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | CaftanStatus)}
            className={SELECT_CLASS}
          >
            <option value="all">{t('admin.caftans.filter_all')}</option>
            {(['available', 'maintenance', 'retired'] as CaftanStatus[]).map((status) => (
              <option key={status} value={status}>
                {t(`admin.caftans.status_${status}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="caftan-category-filter">{t('admin.caftans.filter_category')}</Label>
          <select
            id="caftan-category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="all">{t('admin.caftans.filter_all')}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {localizedText(category.name, locale)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          title={caftans.length === 0 ? t('admin.caftans.empty_title') : t('admin.caftans.empty_filtered_title')}
          description={
            caftans.length === 0 ? t('admin.caftans.empty_body') : t('admin.caftans.empty_filtered_body')
          }
          action={
            caftans.length === 0 ? (
              <Button asChild>
                <Link to={localePath('/admin/caftans/new')}>{t('admin.caftans.new_cta')}</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((caftan) => {
            const primary = sortCaftanImages(caftan.images)[0]
            const thumb = primary ? getCaftanImageUrl(primary.storage_path) : ''
            return (
              <li
                key={caftan.id}
                className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 shadow-sm sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="hidden h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted sm:block">
                    {thumb && (
                      <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {localizedText(caftan.name, locale)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground" dir="ltr">
                      {caftan.slug}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {caftan.category ? localizedText(caftan.category.name, locale) : '—'}
                      {' · '}
                      {formatPrice(Number(caftan.price_per_day), locale)}
                      {caftan.size ? ` · ${caftan.size}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <CaftanStatusBadge status={caftan.status} />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={t('admin.caftans.toggle_featured')}
                    aria-pressed={caftan.featured}
                    title={t('admin.caftans.toggle_featured')}
                    onClick={() => void handleToggleFeatured(caftan)}
                  >
                    <Star
                      aria-hidden="true"
                      className={cn(caftan.featured && 'fill-gold text-gold')}
                    />
                  </Button>
                  <Button asChild variant="outline" size="icon">
                    <Link
                      to={localePath(`/admin/caftans/${caftan.id}/edit`)}
                      aria-label={t('admin.caftans.edit')}
                    >
                      <Pencil aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={t('admin.caftans.delete')}
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setPendingDelete(caftan)
                      setDeleteErrorKey(null)
                    }}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Delete confirmation — offers "retire instead" when the DB blocks
          deletion because bookings reference the caftan. */}
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null)
            setDeleteErrorKey(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.caftans.delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? localizedText(pendingDelete.name, locale) : ''}
              {' — '}
              {deleteErrorKey === 'admin.caftans.error_has_bookings'
                ? t('admin.caftans.error_has_bookings')
                : t('admin.caftans.delete_body')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteErrorKey && deleteErrorKey !== 'admin.caftans.error_has_bookings' && (
            <p role="alert" className="text-sm text-destructive">
              {t(deleteErrorKey)}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {t('admin.caftans.cancel')}
            </AlertDialogCancel>
            {deleteErrorKey === 'admin.caftans.error_has_bookings' ? (
              <AlertDialogAction onClick={(e) => { e.preventDefault(); void handleRetireInstead() }} disabled={deleting}>
                {t('admin.caftans.retire_instead')}
              </AlertDialogAction>
            ) : (
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); void handleConfirmDelete() }}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t('admin.caftans.delete_confirm')}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
