import { useState } from 'react'
import Logo from '@/components/brand/Logo'
import OrnamentDivider from '@/components/layout/OrnamentDivider'
import { getCaftanImageUrl } from '@/lib/caftans'
import { cn } from '@/lib/utils'

/**
 * Caftan photo (Phase 5) — resolves the storage path to the public
 * bucket URL. Until real photos are uploaded (or if one fails to load),
 * renders the branded placeholder: ivory ground, official logo, gold
 * ornament. Never a broken image, never a stock photo.
 */
type CaftanImageProps = {
  storagePath: string | null | undefined
  alt: string
  className?: string
}

export default function CaftanImage({ storagePath, alt, className }: CaftanImageProps) {
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
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('object-cover', className)}
    />
  )
}
