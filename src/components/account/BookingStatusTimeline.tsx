import { useTranslation } from 'react-i18next'
import { Ban, CheckCircle2, CircleCheck, CircleX, Hourglass, Send } from 'lucide-react'
import { useLocale } from '@/hooks/useLocale'
import { formatDateTime } from '@/lib/format'
import type { BookingStatus, BookingStatusHistory } from '@/types/database.types'

/**
 * Booking status timeline (Phase 7) — renders exactly the transitions
 * stored in booking_status_history for this booking, nothing more.
 * The initial row (from_status = null) is the "request sent" event.
 */
const STATUS_ICONS: Record<BookingStatus, typeof Hourglass> = {
  pending: Hourglass,
  confirmed: CircleCheck,
  rejected: CircleX,
  completed: CheckCircle2,
  cancelled: Ban,
}

export default function BookingStatusTimeline({ history }: { history: BookingStatusHistory[] }) {
  const { t } = useTranslation()
  const { locale } = useLocale()

  if (history.length === 0) return null

  return (
    <ol className="relative flex flex-col gap-0">
      {history.map((entry, index) => {
        const isFirst = entry.from_status === null
        const Icon = isFirst ? Send : STATUS_ICONS[entry.to_status]
        const label = isFirst
          ? t('account.timeline_created')
          : t(`account.status.${entry.to_status}`)
        const isLast = index === history.length - 1
        return (
          <li key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast && (
              <span
                aria-hidden="true"
                className="absolute start-[13px] top-7 h-full w-px bg-border"
              />
            )}
            <span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold bg-background text-gold">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">{label}</span>
              <time dateTime={entry.created_at} className="text-xs text-muted-foreground">
                {formatDateTime(entry.created_at, locale)}
              </time>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
