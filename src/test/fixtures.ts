import type { CatalogCaftan } from '@/lib/caftans'
import type { CaftanImage, Category } from '@/types/database.types'

/** Shared catalog fixtures for Phase 5 tests. */

export const categoryCaftan: Category = {
  id: 'cat-1',
  slug: 'caftan',
  name: { ar: 'قفطان', fr: 'Caftan', en: 'Caftan' },
  description: {},
  sort_order: 1,
  created_at: '2026-01-01T00:00:00Z',
}

export const categoryTakchita: Category = {
  id: 'cat-2',
  slug: 'takchita',
  name: { ar: 'تكشيطة', fr: 'Takchita', en: 'Takchita' },
  description: {},
  sort_order: 2,
  created_at: '2026-01-01T00:00:00Z',
}

export function makeImage(caftanId: string, n: number, isPrimary = false): CaftanImage {
  return {
    id: `${caftanId}-img-${n}`,
    caftan_id: caftanId,
    storage_path: `seed/${caftanId}-${n}.jpg`,
    alt_text: { ar: 'صورة', fr: 'Photo', en: 'Photo' },
    sort_order: n,
    is_primary: isPrimary,
    created_at: '2026-01-01T00:00:00Z',
  }
}

type CaftanOverrides = Partial<CatalogCaftan> & { id: string }

export function makeCaftan(overrides: CaftanOverrides): CatalogCaftan {
  const base: CatalogCaftan = {
    id: overrides.id,
    slug: `slug-${overrides.id}`,
    category_id: categoryCaftan.id,
    name: { ar: 'قفطان تجريبي', fr: 'Caftan Test', en: 'Test Caftan' },
    description: { ar: 'وصف', fr: 'Description test', en: 'Test description' },
    size: 'M',
    color: 'Rouge',
    price_per_day: 800,
    deposit_amount: 2000,
    status: 'available',
    featured: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    category: categoryCaftan,
    images: [makeImage(overrides.id, 1, true)],
  }
  return { ...base, ...overrides }
}
