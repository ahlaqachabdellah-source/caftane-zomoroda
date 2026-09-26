import { useTranslation } from 'react-i18next'
import type { CaftanStatus } from '@/types/database.types'
import { cn } from '@/lib/utils'

/**
 * Caftan status badge for admin lists (Phase 10).
 * Solid-border tokens only (primary/gold lack <alpha-value> in the
 * Tailwind config — opacity modifiers would not generate).
 */
const STATUS_STYLES: Record<CaftanStatus, string> = {
  available: 'border-primary bg-primary text-primary-foreground',
  maintenance: 'border-gold bg-accent text-foreground',
  retired: 'border-border bg-muted text-muted-foreground',
}

export default function CaftanStatusBadge({ status }: { status: CaftanStatus }) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        STATUS_STYLES[status] ?? STATUS_STYLES.retired,
      )}
    >
      {t(`admin.caftans.status_${status}`)}
    </span>
  )
}
