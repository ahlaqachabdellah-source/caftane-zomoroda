import { useState } from 'react'
import Logo from '@/components/brand/Logo'
import OrnamentDivider from '@/components/layout/OrnamentDivider'
import { getCaftanImageSrcSet, getCaftanImageUrl } from '@/lib/caftans'
import { cn } from '@/lib/utils'

/**
 * Caftan photo (Phase 5) — resolves the storage path to the public
 * bucket URL. Until real photos are uploaded (or if one fails to load),
 * renders the branded placeholder: ivory ground, official logo, gold
 * ornament. Never a broken image, never a stock photo.
 *
 * Phase 14: responsive, performance-aware rendering.
 *  - `widths` + `sizes` emit a srcset of Supabase-rendered sizes so the
 *    browser downloads only the resolution it needs (WebP/AVIF via
 *    content negotiation).
 *  - below-the-fold by default (`loading="lazy"`, async decoding);
 *    `priority` marks the LCP candidate (eager + high fetch priority).
 */
type CaftanImageProps = {
  storagePath: string | null | undefined
  alt: string
  className?: string
  /** Rendered widths for the srcset; omit to serve the original. */
  widths?: readonly number[]
  /** Required when `widths` is set — the CSS size the image occupies. */
  sizes?: string
  /** LCP candidate: load eagerly with high fetch priority. */
  priority?: boolean
}

export default function CaftanImage({
  storagePath,
  alt,
  className,
  widths,
  sizes,
  priority = false,
}: CaftanImageProps) {
  const [failed, setFailed] = useState(false)
  const url = storagePath && !failed ? getCaftanImageUrl(storagePath) : ''

  if (!url) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          'flex flex-col items-center justify-center gap-3 bg-accent/60 p-6',
          className,
        )}
      >
        <Logo className="h-16 w-auto opacity-70" />
        <OrnamentDivider className="w-16" />
      </div>
    )
  }

  return (
    <img
      src={url}
      srcSet={widths && storagePath ? getCaftanImageSrcSet(storagePath, widths) : undefined}
      sizes={widths ? sizes : undefined}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn('object-cover', className)}
    />
  )
}
