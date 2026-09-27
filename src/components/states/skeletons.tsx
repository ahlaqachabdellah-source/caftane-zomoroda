import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * Skeleton loading states (Phase 14) — placeholder layouts that mirror
 * the real content's dimensions, so nothing shifts when data arrives
 * (CLS-safe). All carry role="status" for assistive technology and reuse
 * the shadcn Skeleton pulse primitive.
 */

type SkeletonProps = { className?: string; label?: string }

/** Visually-hidden live label so screen readers announce the busy state. */
function SrLabel({ label }: { label?: string }) {
  return label ? <span className="sr-only">{label}</span> : null
}

/** Catalog grid: image card (aspect 3/4) + two text lines, 1/2/3 columns. */
export function CatalogGridSkeleton({ className, label }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className={cn('grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3', className)}
    >
      <SrLabel label={label} />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex flex-col overflow-hidden rounded-xl border border-border">
          <Skeleton className="aspect-[3/4] w-full rounded-none" />
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Caftan detail: gallery column + details column, matching lg:grid-cols-2. */
export function CaftanDetailSkeleton({ className, label }: SkeletonProps) {
  return (
    <div role="status" aria-busy="true" className={cn('grid gap-10 lg:grid-cols-2', className)}>
      <SrLabel label={label} />
      <div className="flex flex-col gap-4">
        <Skeleton className="aspect-[3/4] w-full rounded-xl" />
        <div className="flex gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-16 shrink-0 rounded-md" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-48" />
      </div>
    </div>
  )
}

/** Admin overview: KPI cards + activity block. */
export function DashboardSkeleton({ className, label }: SkeletonProps) {
  return (
    <div role="status" aria-busy="true" className={cn('flex flex-col gap-8 py-4', className)}>
      <SrLabel label={label} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-xl border border-border p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

/** Generic row list: bookings, customers, account pages. */
export function ListRowsSkeleton({
  rows = 5,
  className,
  label,
}: SkeletonProps & { rows?: number }) {
  return (
    <div role="status" aria-busy="true" className={cn('flex flex-col gap-3 py-4', className)}>
      <SrLabel label={label} />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border border-border p-4">
          <Skeleton className="h-12 w-12 shrink-0 rounded-md" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  )
}
