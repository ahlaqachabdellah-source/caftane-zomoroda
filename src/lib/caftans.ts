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
 */
export function getCaftanImageUrl(storagePath: string): string {
  if (!supabase) return ''
  return supabase.storage.from(CAFTAN_IMAGES_BUCKET).getPublicUrl(storagePath).data.publicUrl
}

/** Images sorted for display: primary first, then ascending sort_order. */
export function sortCaftanImages(images: CaftanImage[]): CaftanImage[] {
  return [...images].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
    return a.sort_order - b.sort_order
  })
}
