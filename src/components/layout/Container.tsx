import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Centered content column (Phase 4) — the single width/rhythm reference
 * for every page section (max-w-6xl, responsive gutters).
 */
type ContainerProps = {
  children: ReactNode
  className?: string
}

export default function Container({ children, className }: ContainerProps) {
  return <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6', className)}>{children}</div>
}
