import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ListRowsSkeleton } from '@/components/states/skeletons'
import ErrorState from '@/components/states/ErrorState'
import EmptyState from '@/components/states/EmptyState'
import { BookingStatusBadge, DepositStatusBadge } from '@/components/account/BookingStatusBadge'
import { useAdminBookings } from '@/hooks/useAdminBookings'
import { useLocale } from '@/hooks/useLocale'
import { localizedText, nameInLocale } from '@/lib/localized'
import { formatDate, formatDateTime, formatPrice } from '@/lib/format'
import type { BookingStatus } from '@/types/database.types'
import type { AdminBookingListItem } from '@/types/admin'

/**
 * Admin bookings table (Phase 11) — every booking with customer, caftan,
 * rental dates, totals and statuses. Status/caftan/date-range filters and
 * search run client-side over the admin_list_bookings() payload (the RPC
 * is admin-only; the boutique-scale volume keeps one fetch snappy).
 */

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'

const STATUS_OPTIONS: Array<'all' | BookingStatus> = [
  'all',
  'pending',
  'confirmed',
  'rejected',
  'completed',
  'cancelled',
]

function overlapsRange(booking: AdminBookingListItem, from: string, to: string): boolean {
  if (from && booking.end_date < from) return false
  if (to && booking.start_date > to) return false
  return true
}

export default function AdminBookingsPage() {
  const { t } = useTranslation()
  const { locale, localePath } = useLocale()
  const { bookings, loading, error, refetch } = useAdminBookings()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>('all')
  const [caftanFilter, setCaftanFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const caftanOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const b of bookings) {
      if (b.caftan && !seen.has(b.caftan.id)) {
        seen.set(b.caftan.id, localizedText(b.caftan.name, locale))
      }
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [bookings, locale])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return bookings.filter((b) => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false
      if (caftanFilter !== 'all' && b.caftan_id !== caftanFilter) return false
      if (!overlapsRange(b, dateFrom, dateTo)) return false
      if (!term) return true
      const haystack = [
        b.booking_number,
        b.customer?.full_name ?? '',
        b.caftan ? b.caftan.slug : '',
        b.caftan ? nameInLocale(b.caftan.name, 'ar') : '',
        b.caftan ? nameInLocale(b.caftan.name, 'fr') : '',
        b.caftan ? nameInLocale(b.caftan.name, 'en') : '',
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [bookings, search, statusFilter, caftanFilter, dateFrom, dateTo])

  if (loading) return <ListRowsSkeleton label={t('admin.loading')} />
  if (error) return <ErrorState title={t(error)} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t('admin.bookings.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('admin.bookings.subtitle')}</p>
      </div>

      {/* Search & filters */}
      <div className="grid gap-4 rounded-xl border border-border bg-background p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="booking-search">{t('admin.bookings.search_label')}</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="booking-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.bookings.search_placeholder')}
              className="ps-9"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="booking-status-filter">{t('admin.bookings.filter_status')}</Label>
          <select
            id="booking-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | BookingStatus)}
            className={SELECT_CLASS}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? t('admin.bookings.filter_all') : t(`account.status.${s}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="booking-caftan-filter">{t('admin.bookings.filter_caftan')}</Label>
          <select
            id="booking-caftan-filter"
            value={caftanFilter}
            onChange={(e) => setCaftanFilter(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="all">{t('admin.bookings.filter_all')}</option>
            {caftanOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="booking-date-from">{t('admin.bookings.filter_from')}</Label>
          <Input
            id="booking-date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            dir="ltr"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="booking-date-to">{t('admin.bookings.filter_to')}</Label>
          <Input
            id="booking-date-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            dir="ltr"
          />
        </div>
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          title={t('admin.bookings.empty_title')}
          description={t('admin.bookings.empty_body')}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t('admin.bookings.empty_filtered_title')}
          description={t('admin.bookings.empty_filtered_body')}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((b) => (
            <li key={b.id}>
              <Link
                to={localePath(`/admin/bookings/${b.id}`)}
                className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 shadow-sm transition-colors hover:border-gold focus-visible:outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground" dir="ltr">
                      {b.booking_number}
                    </span>
                    <BookingStatusBadge status={b.status} />
                    <DepositStatusBadge status={b.deposit_status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span>{b.customer?.full_name || t('admin.bookings.unknown_customer')}</span>
                    {' · '}
                    <span>{b.caftan ? localizedText(b.caftan.name, locale) : '—'}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <time dateTime={b.start_date}>{formatDate(b.start_date, locale)}</time>
                    {' → '}
                    <time dateTime={b.end_date}>{formatDate(b.end_date, locale)}</time>
                    {' · '}
                    {t('admin.bookings.created_at')}
                    {' '}
                    <time dateTime={b.created_at}>{formatDateTime(b.created_at, locale)}</time>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-foreground">
                    {formatPrice(b.total_price, locale)}
                  </span>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
