import { describe, expect, it, vi } from 'vitest'
import type { CaftanImage } from '@/types/database.types'

vi.mock('@/lib/supabaseClient', () => ({
  supabase: null,
  isSupabaseConfigured: false,
}))

import { getCaftanImageUrl, sortCaftanImages } from './caftans'

function img(id: string, sortOrder: number, isPrimary: boolean): CaftanImage {
  return {
    id,
    caftan_id: 'c1',
    storage_path: `seed/${id}.jpg`,
    alt_text: {},
    sort_order: sortOrder,
    is_primary: isPrimary,
    created_at: '2026-01-01T00:00:00Z',
  }
}

describe('sortCaftanImages', () => {
  it('puts the primary image first, then ascending sort_order', () => {
    const sorted = sortCaftanImages([img('b', 2, false), img('c', 3, true), img('a', 1, false)])
    expect(sorted.map((i) => i.id)).toEqual(['c', 'a', 'b'])
  })

  it('does not mutate the input array', () => {
    const input = [img('b', 2, false), img('a', 1, false)]
    sortCaftanImages(input)
    expect(input.map((i) => i.id)).toEqual(['b', 'a'])
  })
})

describe('getCaftanImageUrl', () => {
  it('returns an empty string while the backend is not configured', () => {
    expect(getCaftanImageUrl('seed/x.jpg')).toBe('')
  })
})
