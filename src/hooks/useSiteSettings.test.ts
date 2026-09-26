import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SiteSettings } from '@/types/database.types'

// Controllable mock: tests set `mocks.client` before rendering the hook.
const mocks = vi.hoisted(() => ({
  client: null as null | {
    from: (table: string) => unknown
  },
}))

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return mocks.client
  },
}))

import { useSiteSettings } from './useSiteSettings'

const row: SiteSettings = {
  id: 1,
  whatsapp_number: '+212612345678',
  phone: '+212522000000',
  email: 'contact@caftan-zomoroda.ma',
  address: { ar: '', fr: 'Casablanca', en: '' },
  social_links: { instagram: 'https://instagram.com/caftan.zomoroda', facebook: '', tiktok: '' },
  seo_defaults: {},
  updated_at: '2026-09-26T00:00:00Z',
} as SiteSettings

function clientReturning(result: { data?: SiteSettings | null; error?: { message: string } | null }) {
  return {
    from: vi.fn((table: string) => {
      expect(table).toBe('site_settings')
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: result.data ?? null, error: result.error ?? null })),
          })),
        })),
      }
    }),
  }
}

describe('useSiteSettings', () => {
  beforeEach(() => {
    mocks.client = null
  })

  it('stays empty and idle when the backend is not configured', () => {
    const { result } = renderHook(() => useSiteSettings())
    expect(result.current.loading).toBe(false)
    expect(result.current.settings).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('returns the singleton row when the query succeeds', async () => {
    mocks.client = clientReturning({ data: row })
    const { result } = renderHook(() => useSiteSettings())
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.settings?.whatsapp_number).toBe('+212612345678')
    expect(result.current.error).toBeNull()
  })

  it('surfaces query errors instead of pretending to have data', async () => {
    mocks.client = clientReturning({ error: { message: 'permission denied' } })
    const { result } = renderHook(() => useSiteSettings())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.settings).toBeNull()
    expect(result.current.error).toBe('errors.generic')
  })
})
