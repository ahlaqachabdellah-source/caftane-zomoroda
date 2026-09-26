import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import BookingCard from '@/components/account/BookingCard'
import EmptyState from '@/components/states/EmptyState'
import ErrorState from '@/components/states/ErrorState'
import LoadingState from '@/components/states/LoadingState'
import { Button } from '@/components/ui/button'
import { useMyBookings } from '@/hooks/useMyBookings'
import { useLocale } from '@/hooks/useLocale'

/**
 * "My bookings" (Phase 7) — every booking of the signed-in customer,
 * scoped server-side by RLS. Cards show number, caftan, dates, days,
 * total, deposit and status, and open the detail page.
 */
export default function MyBookingsPage() {
  const { t } = useTranslation()
  const { localePath } = useLocale()
  const { bookings, loading, error, refetch } = useMyBookings()

  if (loading) return <LoadingState className="py-16" label={t('catalog.loading')} />
  if (error) {
    return <ErrorState className="py-16" description={t('account.error_body')} onRetry={refetch} />
  }

  if (bookings.length === 0) {
    return (
      <EmptyState
        className="py-16"
        title={t('account.bookings_empty_title')}
        description={t('account.bookings_empty_body')}
        action={
          <Button asChild>
            <Link to={localePath('/caftans')}>{t('account.browse_cta')}</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="sr-only">{t('account.bookings_title')}</h2>
      <ul className="flex flex-col gap-3">
        {bookings.map((booking) => (
          <li key={booking.id}>
            <BookingCard booking={booking} />
          </li>
        ))}
      </ul>
    </div>
  )
}
