import { cn } from '@/lib/utils'

/**
 * Brand ornament (Phase 4) — thin gold rules flanking a small diamond.
 * Purely decorative; hidden from assistive technology.
 */
export default function OrnamentDivider({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('flex w-24 items-center gap-2 text-gold', className)}
    >
      <span className="h-px flex-1 bg-current opacity-60" />
      <span className="block h-1.5 w-1.5 rotate-45 bg-current" />
      <span className="h-px flex-1 bg-current opacity-60" />
    </div>
  )
}
