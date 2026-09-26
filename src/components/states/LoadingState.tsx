import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

/**
 * Loading state (Phase 4) — gold spinner with an accessible label.
 * role="status" announces the busy state to assistive technology.
 */
type LoadingStateProps = {
  label?: string
  className?: string
}

export default function LoadingState({ label, className }: LoadingStateProps) {
  const { t } = useTranslation()
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-gold"
      />
      <span className="text-sm">{label ?? t('common.loading')}</span>
    </div>
  )
}
