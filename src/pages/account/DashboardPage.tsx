import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import BookingCard from '@/components/account/BookingCard'
import EmptyState from '@/components/states/EmptyState'
import ErrorState from '@/components/states/ErrorState'
import LoadingState from '@/components/states/LoadingState'
import { Button } from '@/components/ui/button'
import { useMyBookings } from '@/hooks/useMyBookings'
import { useLocale } from '@/hooks/useLocale'
import { todayString } from '@/lib/validation/booking'

/**
 * Customer dashboard (Phase 7) — real rental activity at a glance:
 * totals, pending requests, upcoming rentals, and the latest bookings.
 */
export default function DashboardPage() {
  const { t } = useTranslation()
  const { localePath } = useLocale()
  const { bookings, loading, error, refetch } = useMyBookings()

  if (loading) return <LoadingState className="py-16" label={t('catalog.loading')} />
  if (error) {
    return <ErrorState className="py-16" description={t('account.error_body')} onRetry={refetch} />
  }

  const today = todayString()
  const pendingCount = bookings.filter((b) => b.status === 'pending').length
  const upcomingCount = bookings.filter(
    (b) => b.status === 'confirmed' && b.end_date >= today,
  ).length
  const recent = bookings.slice(0, 3)

  const stats = [
    { label: t('account.stats_total'), value: bookings.length },
    { label: t('account.stats_pending'), value: pendingCount },
    { label: t('account.stats_upcoming'), value: upcomingCount },
  ]

  return (
    <div className="flex flex-col gap-10">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card p-5 text-center sm:p-6"
          >
            <dd className="font-display text-3xl font-semibold text-foreground">{value}</dd>
            <dt className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground rtl:tracking-normal">
              {label}
            </dt>
          </div>
        ))}
      </dl>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-xl font-semibold text-foreground">
            {t('account.recent_bookings')}
          </h2>
          {bookings.length > 3 && (
            <Button asChild variant="ghost" size="sm">
              <Link to={localePath('/account/bookings')}>{t('account.view_all')}</Link>
            </Button>
          )}
        </div>

        {recent.length === 0 ? (
          <EmptyState
            title={t('account.bookings_empty_title')}
            description={t('account.bookings_empty_body')}
            action={
              <Button asChild>
                <Link to={localePath('/caftans')}>{t('account.browse_cta')}</Link>
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {recent.map((booking) => (
              <li key={booking.id}>
                <BookingCard booking={booking} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
