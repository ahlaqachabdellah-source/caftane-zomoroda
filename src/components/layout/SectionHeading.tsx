import { cn } from '@/lib/utils'
import OrnamentDivider from './OrnamentDivider'

/**
 * Section heading (Phase 4) — gold kicker + display-serif title +
 * optional lede, with the brand ornament. Used at the top of every
 * content section for a consistent editorial rhythm.
 */
type SectionHeadingProps = {
  kicker?: string
  title: string
  description?: string
  align?: 'center' | 'start'
  /** Render on the deep-green band (light text) */
  onDark?: boolean
  className?: string
}

export default function SectionHeading({
  kicker,
  title,
  description,
  align = 'center',
  onDark = false,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        align === 'center' ? 'items-center text-center' : 'items-start text-start',
        className,
      )}
    >
      {kicker && (
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold rtl:tracking-normal sm:text-sm">
          {kicker}
        </p>
      )}
      <h2
        className={cn(
          'text-3xl font-semibold tracking-tight sm:text-4xl',
          onDark ? 'text-primary-foreground' : 'text-foreground',
        )}
      >
        {title}
      </h2>
      <OrnamentDivider className={align === 'center' ? 'mx-auto' : ''} />
      {description && (
        <p
          className={cn(
            'max-w-2xl text-sm leading-relaxed sm:text-base',
            onDark ? 'text-primary-foreground/80' : 'text-muted-foreground',
          )}
        >
          {description}
        </p>
      )}
    </div>
  )
}
