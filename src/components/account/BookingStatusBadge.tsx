import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import type { BookingStatus, DepositStatus } from '@/types/database.types'

/**
 * Localized booking / deposit status badges (Phase 7).
 * Colors follow the brand tokens: gold accent for pending, emerald for
 * confirmed, muted/destructive for the terminal states.
 */
const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: 'border-gold bg-accent text-accent-foreground',
  confirmed: 'border-primary bg-primary text-primary-foreground',
  rejected: 'border-destructive bg-destructive/10 text-destructive',
  completed: 'border-border bg-secondary text-secondary-foreground',
  cancelled: 'border-border bg-muted text-muted-foreground',
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { t } = useTranslation()
  return (
    <Badge variant="outline" className={STATUS_STYLES[status]}>
      {t(`account.status.${status}`)}
    </Badge>
  )
}

const DEPOSIT_STYLES: Record<DepositStatus, string> = {
  unpaid: 'border-border bg-muted text-muted-foreground',
  paid: 'border-primary bg-primary text-primary-foreground',
  refunded: 'border-border bg-secondary text-secondary-foreground',
  forfeited: 'border-destructive bg-destructive/10 text-destructive',
}

export function DepositStatusBadge({ status }: { status: DepositStatus }) {
  const { t } = useTranslation()
  return (
    <Badge variant="outline" className={DEPOSIT_STYLES[status]}>
      {t(`account.deposit.${status}`)}
    </Badge>
  )
}
