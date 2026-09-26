import { renderHook, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CaftanFormValues } from '@/lib/validation/admin'

// Controllable supabase mock: tests configure `mocks`.
const mocks = vi.hoisted(() => ({
  insertResult: { data: { id: 'new-id' }, error: null as null | { code?: string; message: string } },
  updateResult: { data: { id: 'c-1' }, error: null as null | { code?: string; message: string } },
  deleteResult: { error: null as null | { code?: string; message: string } },
  lastInsert: null as unknown,
  lastUpdate: null as unknown,
  lastEq: [] as Array<[string, string]>,
  client: null as unknown,
}))

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return mocks.client
  },
}))

import { useCaftanMutations } from './useCaftanMutations'

const VALUES: CaftanFormValues = {
  slug: 'caftan-test',
  nameAr: 'قفطان اختبار',
  nameFr: 'Caftan Test',
  nameEn: 'Test Caftan',
  descriptionAr: '',
  descriptionFr: 'Description FR',
  descriptionEn: '',
  categoryId: 'cat-1',
  pricePerDay: '800',
  depositAmount: '2000.50',
  size: 'M',
  color: 'Rouge',
  status: 'available',
  featured: true,
}

function makeClient() {
  const client = {
    from: vi.fn((table: string) => {
      expect(table).toBe('caftans')
      return {
        insert: vi.fn((payload: unknown) => {
          mocks.lastInsert = payload
          return {
            select: vi.fn(() => ({
              single: vi.fn(async () => mocks.insertResult),
            })),
          }
        }),
        update: vi.fn((payload: unknown) => {
          mocks.lastUpdate = payload
          return {
            eq: vi.fn((col: string, val: string) => {
              mocks.lastEq.push([col, val])
              // Thenable: supports both bare await (updateCaftanFields)
              // and .select().single() chaining (saveCaftan update).
              return Object.assign(Promise.resolve(mocks.updateResult), {
                select: vi.fn(() => ({ single: vi.fn(async () => mocks.updateResult) })),
              })
            }),
          }
        }),
        delete: vi.fn(() => ({
          eq: vi.fn(async (col: string, val: string) => {
            mocks.lastEq.push([col, val])
            return mocks.deleteResult
          }),
        })),
      }
    }),
  }
  return client
}

describe('useCaftanMutations', () => {
  beforeEach(() => {
    mocks.lastInsert = null
    mocks.lastUpdate = null
    mocks.lastEq = []
    mocks.insertResult = { data: { id: 'new-id' }, error: null }
    mocks.updateResult = { data: { id: 'c-1' }, error: null }
    mocks.deleteResult = { error: null }
    mocks.client = makeClient()
  })

  it('creates a caftan with translated names, trimmed descriptions and parsed numbers', async () => {
    const { result } = renderHook(() => useCaftanMutations())
    let outcome: Awaited<ReturnType<typeof result.current.saveCaftan>> | undefined
    await act(async () => {
      outcome = await result.current.saveCaftan(VALUES)
    })
    expect(outcome?.ok).toBe(true)
    expect(outcome?.data?.id).toBe('new-id')
    const payload = mocks.lastInsert as Record<string, unknown>
    expect(payload.slug).toBe('caftan-test')
    expect(payload.name).toEqual({ ar: 'قفطان اختبار', fr: 'Caftan Test', en: 'Test Caftan' })
    // Empty descriptions are omitted, only fr kept
    expect(payload.description).toEqual({ fr: 'Description FR' })
    expect(payload.price_per_day).toBe(800)
    expect(payload.deposit_amount).toBe(2000.5)
    expect(payload.status).toBe('available')
    expect(payload.featured).toBe(true)
  })

  it('updates an existing caftan scoped by id', async () => {
    const { result } = renderHook(() => useCaftanMutations())
    let outcome: Awaited<ReturnType<typeof result.current.saveCaftan>> | undefined
    await act(async () => {
      outcome = await result.current.saveCaftan(VALUES, 'c-9')
    })
    expect(outcome?.ok).toBe(true)
    expect(mocks.lastEq).toContainEqual(['id', 'c-9'])
  })

  it('maps 23505 to the slug-taken message', async () => {
    mocks.insertResult = { data: { id: '' }, error: { code: '23505', message: 'duplicate' } }
    const { result } = renderHook(() => useCaftanMutations())
    let outcome: Awaited<ReturnType<typeof result.current.saveCaftan>> | undefined
    await act(async () => {
      outcome = await result.current.saveCaftan(VALUES)
    })
    expect(outcome).toEqual({ ok: false, errorKey: 'admin.caftans.error_slug_taken' })
  })

  it('maps FK restrict (23001) on delete to the has-bookings message', async () => {
    mocks.deleteResult = { error: { code: '23001', message: 'restrict' } }
    const { result } = renderHook(() => useCaftanMutations())
    let outcome: Awaited<ReturnType<typeof result.current.deleteCaftan>> | undefined
    await act(async () => {
      outcome = await result.current.deleteCaftan('c-1')
    })
    expect(outcome).toEqual({ ok: false, errorKey: 'admin.caftans.error_has_bookings' })
  })

  it('maps FK violation (23503) on delete to the has-bookings message too', async () => {
    mocks.deleteResult = { error: { code: '23503', message: 'fk' } }
    const { result } = renderHook(() => useCaftanMutations())
    let outcome: Awaited<ReturnType<typeof result.current.deleteCaftan>> | undefined
    await act(async () => {
      outcome = await result.current.deleteCaftan('c-1')
    })
    expect(outcome).toEqual({ ok: false, errorKey: 'admin.caftans.error_has_bookings' })
  })

  it('deletes cleanly when nothing references the caftan', async () => {
    const { result } = renderHook(() => useCaftanMutations())
    let outcome: Awaited<ReturnType<typeof result.current.deleteCaftan>> | undefined
    await act(async () => {
      outcome = await result.current.deleteCaftan('c-1')
    })
    expect(outcome).toEqual({ ok: true, errorKey: null })
    expect(mocks.lastEq).toContainEqual(['id', 'c-1'])
  })

  it('toggles featured via a scoped field update', async () => {
    const { result } = renderHook(() => useCaftanMutations())
    let outcome: Awaited<ReturnType<typeof result.current.updateCaftanFields>> | undefined
    await act(async () => {
      outcome = await result.current.updateCaftanFields('c-1', { featured: true })
    })
    expect(outcome?.ok).toBe(true)
    expect(mocks.lastUpdate).toEqual({ featured: true })
    expect(mocks.lastEq).toContainEqual(['id', 'c-1'])
  })
})
