import { supabase } from '@/lib/supabaseClient'
import type { Caftan, CaftanImage, Category } from '@/types/database.types'

/**
 * Catalog data shapes & helpers (Phase 5).
 *
 * The binary photos live in the public `caftan-images` storage bucket;
 * rows in `caftan_images` only carry the object path.
 */

/** Caftan row with its embedded category and image list (sorted by sort_order). */
export type CatalogCaftan = Caftan & {
  category: Category | null
  images: CaftanImage[]
}

export const CAFTAN_IMAGES_BUCKET = 'caftan-images'

/**
 * Public URL for an image stored in the caftan-images bucket.
 * Returns '' while the backend is not configured — the UI then renders
 * its branded placeholder instead of a broken image.
 *
 * Phase 14: optional on-the-fly resize via Supabase image transformations
 * (/render/image/ instead of /object/). The CDN negotiates a modern
 * format (WebP/AVIF) from the request's Accept header, so callers get
 * smaller files without changing the stored originals.
 */
export function getCaftanImageUrl(
  storagePath: string,
  options?: { width?: number; quality?: number },
): string {
  if (!supabase) return ''
  const publicUrl = supabase.storage
    .from(CAFTAN_IMAGES_BUCKET)
    .getPublicUrl(storagePath).data.publicUrl
  if (!options?.width) return publicUrl
  const renderUrl = publicUrl.replace('/storage/v1/object/', '/storage/v1/render/image/')
  const params = new URLSearchParams({
    width: String(options.width),
    quality: String(options.quality ?? 75),
    resize: 'cover',
  })
  return `${renderUrl}?${params.toString()}`
}

/**
 * srcset string over several rendered widths, for responsive <img> usage.
 * Browsers pick the smallest adequate width — users never download the
 * full original for a card or thumbnail.
 */
export function getCaftanImageSrcSet(
  storagePath: string,
  widths: readonly number[],
  quality = 75,
): string {
  return widths
    .map((w) => `${getCaftanImageUrl(storagePath, { width: w, quality })} ${w}w`)
    .join(', ')
}

/** Images sorted for display: primary first, then ascending sort_order. */
export function sortCaftanImages(images: CaftanImage[]): CaftanImage[] {
  return [...images].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
    return a.sort_order - b.sort_order
  })
}
