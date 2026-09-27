import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Ban, Loader2 } from 'lucide-react'
import BookingStatusTimeline from '@/components/account/BookingStatusTimeline'
import { BookingStatusBadge, DepositStatusBadge } from '@/components/account/BookingStatusBadge'
import CaftanImage from '@/components/catalog/CaftanImage'
import EmptyState from '@/components/states/EmptyState'
import ErrorState from '@/components/states/ErrorState'
import LoadingState from '@/components/states/LoadingState'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useBookingDetail } from '@/hooks/useBookingDetail'
import { useCancelBooking } from '@/hooks/useCancelBooking'
import { useLocale } from '@/hooks/useLocale'
import { rentalDays } from '@/lib/booking'
import { sortCaftanImages } from '@/lib/caftans'
import { formatDate, formatPrice } from '@/lib/format'
import { localizedText } from '@/lib/localized'

/**
 * Booking detail (Phase 7) — addressed by the public booking number.
 * Shows caftan info, rental dates, price breakdown, deposit status, the
 * real status timeline, and pending-only cancellation. Never exposes
 * internal IDs, errors, or implementation details.
 */
export default function BookingDetailPage() {
  const { bookingNumber } = useParams()
  const { t } = useTranslation()
  const { locale, localePath } = useLocale()
  const { booking, history, loading, error, notFound, refetch } = useBookingDetail(bookingNumber)
  const { cancelBooking, cancelling } = useCancelBooking()
  const [cancelErrorKey, setCancelErrorKey] = useState<string | null>(null)
  const [cancelledOk, setCancelledOk] = useState(false)

  async function handleCancel() {
    if (!booking) return
    setCancelErrorKey(null)
    const { errorKey } = await cancelBooking(booking.id)
    if (errorKey) {
      setCancelErrorKey(errorKey)
      return
    }
    setCancelledOk(true)
    refetch()
  }

  if (loading) return <LoadingState className="py-16" label={t('catalog.loading')} />
  if (error) {
    return <ErrorState className="py-16" description={t('account.error_body')} onRetry={refetch} />
  }
  if (notFound || !booking) {
    return (
      <EmptyState
        className="py-16"
        title={t('account.not_found_title')}
        description={t('account.not_found_body')}
        action={
          <Button asChild variant="outline">
            <Link to={localePath('/account/bookings')}>{t('account.back_to_bookings')}</Link>
          </Button>
        }
      />
    )
  }

  const caftan = booking.caftan
  const name = caftan ? localizedText(caftan.name, locale) : t('account.caftan_unavailable')
  const primary = caftan ? (sortCaftanImages(caftan.images)[0] ?? null) : null
  const days = rentalDays(booking.start_date, booking.end_date)
  const rate = caftan ? Number(caftan.price_per_day) : null

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Link
          to={localePath('/account/bookings')}
          className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          {t('account.back_to_bookings')}
        </Link>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-strong rtl:tracking-normal">
            {t('account.booking_label')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <h2 className="font-mono text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {booking.booking_number}
          </h2>
          <BookingStatusBadge status={booking.status} />
        </div>
      </div>

      {cancelledOk && (
        <p role="status" className="rounded-md bg-accent px-4 py-3 text-sm text-accent-foreground">
          {t('account.cancel_success')}
        </p>
      )}
      {cancelErrorKey && (
        <p role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {t(cancelErrorKey)}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Caftan */}
        <div className="flex gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="w-24 shrink-0 overflow-hidden rounded-lg sm:w-28">
            <CaftanImage
              storagePath={primary?.storage_path}
              alt={name}
              className="aspect-[3/4] w-full"
            />
          </div>
          <div className="flex min-w-0 flex-col justify-center gap-1.5">
            <h3 className="font-display text-xl font-semibold text-foreground">{name}</h3>
            {caftan && (
              <>
                <p className="text-sm text-muted-foreground">
                  {formatPrice(rate ?? 0, locale)} {t('catalog.per_day')}
                </p>
                <Button asChild variant="link" className="w-fit px-0">
                  <Link to={localePath(`/caftans/${caftan.slug}`)}>
                    {t('account.view_details')}
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Rental + price breakdown */}
        <dl className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-sm text-muted-foreground">{t('account.period_label')}</dt>
            <dd className="text-sm font-medium text-foreground">
              {formatDate(booking.start_date, locale)} → {formatDate(booking.end_date, locale)}
              {days > 0 && (
                <span className="text-muted-foreground">
                  {' '}
                  · {t('account.days_count', { count: days })}
                </span>
              )}
            </dd>
          </div>
          {rate !== null && days > 0 && (
            <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
              <dt className="text-sm text-muted-foreground">{t('account.rate_label')}</dt>
              <dd className="text-sm text-foreground">
                {formatPrice(rate, locale)} × {t('account.days_count', { count: days })}
              </dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
            <dt className="text-sm text-muted-foreground">{t('account.total_label')}</dt>
            <dd className="text-base font-semibold text-foreground">
              {formatPrice(Number(booking.total_price), locale)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
            <dt className="text-sm text-muted-foreground">{t('catalog.deposit_label')}</dt>
            <dd className="flex items-center gap-2 text-sm text-foreground">
              {caftan && formatPrice(Number(caftan.deposit_amount), locale)}
              <DepositStatusBadge status={booking.deposit_status} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
            <dt className="text-sm text-muted-foreground">{t('account.status_label')}</dt>
            <dd>
              <BookingStatusBadge status={booking.status} />
            </dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Status timeline — only transitions that actually happened */}
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h3 className="mb-5 font-display text-lg font-semibold text-foreground">
            {t('account.timeline_title')}
          </h3>
          <BookingStatusTimeline history={history} />
        </section>

        {/* Pending-only cancellation (enforced server-side by RLS + trigger) */}
        {booking.status === 'pending' && !cancelledOk && (
          <section className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-5 sm:p-6">
            <h3 className="font-display text-lg font-semibold text-foreground">
              {t('account.cancel_cta')}
            </h3>
            <p className="text-sm text-muted-foreground">{t('account.cancel_confirm_body')}</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={cancelling}>
                  {cancelling ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Ban aria-hidden="true" />
                  )}
                  {t('account.cancel_cta')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('account.cancel_confirm_title')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('account.cancel_confirm_body')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('account.cancel_back')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel} disabled={cancelling}>
                    {t('account.cancel_confirm_action')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </section>
        )}
      </div>
    </div>
  )
}
