import { CircleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/**
 * Error state (Phase 4) — role="alert" so failures are announced,
 * with an optional retry action for recoverable errors.
 */
type ErrorStateProps = {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}

export default function ErrorState({ title, description, onRetry, className }: ErrorStateProps) {
  const { t } = useTranslation()
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-4 py-12 text-center',
        className,
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <CircleAlert className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="font-display text-xl font-semibold text-foreground">
        {title ?? t('states.error_title')}
      </p>
      {description && (
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="mt-2">
          {t('states.retry')}
        </Button>
      )}
    </div>
  )
}
