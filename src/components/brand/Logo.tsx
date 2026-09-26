import { cn } from '@/lib/utils'
import logoUrl from '@/assets/brand/logo.png'

/**
 * Official brand logo — Caftan Zomoroda.
 *
 * This component renders the exact official asset
 * (src/assets/brand/logo.png, 1024×1024). Never redraw, recolor or
 * distort it: only the rendered height changes, width always follows
 * the intrinsic 1:1 proportions.
 */
type LogoProps = {
  /** Tailwind height class, e.g. "h-10" — width is automatic (square asset) */
  className?: string
  alt?: string
}

export default function Logo({ className, alt = 'Caftan Zomoroda' }: LogoProps) {
  return (
    <img
      src={logoUrl}
      alt={alt}
      draggable={false}
      className={cn('h-10 w-auto select-none', className)}
    />
  )
}
