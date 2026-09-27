import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import CaftanImage from '@/components/catalog/CaftanImage'
import { BookingStatusBadge } from '@/components/account/BookingStatusBadge'
import { useLocale } from '@/hooks/useLocale'
import { rentalDays } from '@/lib/booking'
import { sortCaftanImages } from '@/lib/caftans'
import { formatDate, formatPrice } from '@/lib/format'
import { localizedText } from '@/lib/localized'
import type { MyBooking } from '@/hooks/useMyBookings'

/**
 * One booking in the "My bookings" list (Phase 7). Links to the detail
 * page via the public booking number. Degrades gracefully when the
 * caftan has been retired (embed hidden by RLS).
 */
export default function BookingCard({ booking }: { booking: MyBooking }) {
  const { t } = useTranslation()
  const { locale, localePath } = useLocale()

  const caftan = booking.caftan
  const name = caftan ? localizedText(caftan.name, locale) : t('account.caftan_unavailable')
  const primary = caftan ? (sortCaftanImages(caftan.images)[0] ?? null) : null
  const days = rentalDays(booking.start_date, booking.end_date)

  return (
    <Link
      to={localePath(`/account/bookings/${booking.booking_number}`)}
      className="group flex gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-gold sm:items-center"
    >
      <div className="hidden w-20 shrink-0 overflow-hidden rounded-lg sm:block">
        <CaftanImage
          storagePath={primary?.storage_path}
          alt={name}
          className="aspect-[3/4] w-full"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono text-xs text-muted-foreground">{booking.booking_number}</span>
          <BookingStatusBadge status={booking.status} />
        </div>
        <h3 className="truncate font-display text-lg font-semibold text-foreground">{name}</h3>
        <p className="text-sm text-muted-foreground">
          {formatDate(booking.start_date, locale)} → {formatDate(booking.end_date, locale)}
          {days > 0 && <> · {t('account.days_count', { count: days })}</>}
        </p>
        <p className="text-sm font-semibold text-foreground">
          {formatPrice(Number(booking.total_price), locale)}
        </p>
      </div>
      <ChevronRight
        className="h-5 w-5 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
        aria-hidden="true"
      />
    </Link>
  )
}
