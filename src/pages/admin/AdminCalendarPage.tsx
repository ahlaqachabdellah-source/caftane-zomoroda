import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import LoadingState from '@/components/states/LoadingState'
import ErrorState from '@/components/states/ErrorState'
import EmptyState from '@/components/states/EmptyState'
import { useAdminOccupancy } from '@/hooks/useAdminOccupancy'
import { useAdminCaftans } from '@/hooks/useAdminCaftans'
import { useLocale } from '@/hooks/useLocale'
import { localizedText } from '@/lib/localized'
import { cn } from '@/lib/utils'
import type { AdminOccupancyRow } from '@/types/admin'

/**
 * Admin calendar / occupancy view (Phase 11) — month grid of real booking
 * occupancy per caftan. Rows are caftans, columns are days; each booking
 * renders as a bar over its rental period, colored by status, linking to
 * the booking detail. The data comes from admin_caftan_occupancy(), a
 * read-only projection of the same bookings table the double-booking
 * exclusion constraint guards — no second availability system.
 */

const BAR_STYLES: Record<string, string> = {
  pending: 'bg-gold/80 text-accent-foreground',
  confirmed: 'bg-primary text-primary-foreground',
  completed: 'bg-muted text-muted-foreground',
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function dayOfIso(iso: string): number {
  return Number(iso.slice(8, 10))
}

export default function AdminCalendarPage() {
  const { t } = useTranslation()
  const { locale, localePath } = useLocale()

  const now = new Date()
  const [year, setYear] = useState(now.getUTCFullYear())
  const [month, setMonth] = useState(now.getUTCMonth() + 1) // 1-12

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const to = isoDay(new Date(Date.UTC(year, month, 0)))

  const { rows, loading, error } = useAdminOccupancy(from, to)
  const { caftans, loading: caftansLoading } = useAdminCaftans()

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
        new Date(Date.UTC(year, month - 1, 1)),
      ),
    [locale, year, month],
  )

  /** Occupancy rows grouped by caftan id. */
  const byCaftan = useMemo(() => {
    const map = new Map<string, AdminOccupancyRow[]>()
    for (const row of rows) {
      const list = map.get(row.caftan.id) ?? []
      list.push(row)
      map.set(row.caftan.id, list)
    }
    return map
  }, [rows])

  /** Caftans shown as rows: every caftan with occupancy this month, in catalog order. */
  const visibleCaftans = useMemo(
    () => caftans.filter((c) => byCaftan.has(c.id)),
    [caftans, byCaftan],
  )

  const shiftMonth = (delta: number) => {
    const next = new Date(Date.UTC(year, month - 1 + delta, 1))
    setYear(next.getUTCFullYear())
    setMonth(next.getUTCMonth() + 1)
  }

  if (loading || caftansLoading) return <LoadingState />
  if (error) return <ErrorState title={t(error)} />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t('admin.calendar.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('admin.calendar.subtitle')}</p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={() => shiftMonth(-1)}>
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          {t('admin.calendar.prev')}
        </Button>
        <h2 className="text-lg font-medium capitalize text-foreground">{monthLabel}</h2>
        <Button variant="outline" size="sm" onClick={() => shiftMonth(1)}>
          {t('admin.calendar.next')}
          <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        </Button>
      </div>

      {/* Legend */}
      <ul className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {(['pending', 'confirmed', 'completed'] as const).map((s) => (
          <li key={s} className="flex items-center gap-2">
            <span className={cn('h-3 w-3 rounded-sm', BAR_STYLES[s])} aria-hidden="true" />
            {t(`account.status.${s}`)}
          </li>
        ))}
      </ul>

      {rows.length === 0 ? (
        <EmptyState
          title={t('admin.calendar.empty_title')}
          description={t('admin.calendar.empty_body', { month: monthLabel })}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-background shadow-sm">
          <div className="min-w-[720px] p-4">
            {/* Day header */}
            <div
              className="grid items-center gap-0"
              style={{ gridTemplateColumns: `10rem repeat(${daysInMonth}, minmax(0, 1fr))` }}
              role="row"
            >
              <span className="pe-2 text-xs font-medium text-muted-foreground">
                {t('admin.calendar.caftan_column')}
              </span>
              {Array.from({ length: daysInMonth }, (_, i) => (
                <span key={i} className="text-center text-[10px] text-muted-foreground">
                  {i + 1}
                </span>
              ))}
            </div>

            {/* One row per caftan */}
            {visibleCaftans.map((caftan) => (
              <div
                key={caftan.id}
                className="mt-2 grid items-center gap-0 border-t border-border pt-2"
                style={{ gridTemplateColumns: `10rem repeat(${daysInMonth}, minmax(0, 1fr))` }}
              >
                <span className="truncate pe-2 text-sm font-medium text-foreground">
                  {localizedText(caftan.name, locale)}
                </span>
                <div
                  className="col-start-2 grid h-8 items-center gap-0"
                  style={{
                    gridColumn: `2 / span ${daysInMonth}`,
                    gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))`,
                  }}
                >
                  {(byCaftan.get(caftan.id) ?? []).map((row) => {
                    const startDay = Math.max(
                      1,
                      dayOfIso(row.start_date < from ? from : row.start_date),
                    )
                    const endDay = Math.min(
                      daysInMonth,
                      dayOfIso(row.end_date > to ? to : row.end_date),
                    )
                    return (
                      <Link
                        key={row.booking_id}
                        to={localePath(`/admin/bookings/${row.booking_id}`)}
                        title={`${row.booking_number} — ${row.customer_name ?? ''}`}
                        className={cn(
                          'flex h-6 items-center truncate rounded px-1 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                          BAR_STYLES[row.status] ?? BAR_STYLES.pending,
                        )}
                        style={{ gridColumn: `${startDay} / span ${endDay - startDay + 1}` }}
                      >
                        {row.booking_number}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
