import type { LucideIcon } from 'lucide-react'
import { PackageOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import OrnamentDivider from '@/components/layout/OrnamentDivider'

/**
 * Empty state (Phase 4) — shown whenever a list/query returns nothing.
 * Calm, branded, with an optional call-to-action slot.
 */
type EmptyStateProps = {
  title?: string
  description?: string
  icon?: LucideIcon
  action?: React.ReactNode
  className?: string
}

export default function EmptyState({
  title,
  description,
  icon: Icon = PackageOpen,
  action,
  className,
}: EmptyStateProps) {
  const { t } = useTranslation()
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-4 py-12 text-center',
        className,
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-gold">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="font-display text-xl font-semibold text-foreground">
        {title ?? t('states.empty_title')}
      </p>
      {description && (
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      <OrnamentDivider />
      {action}
    </div>
  )
}
