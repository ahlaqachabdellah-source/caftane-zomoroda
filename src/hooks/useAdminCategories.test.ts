import { renderHook, waitFor, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { categoryCaftan } from '@/test/fixtures'

const mocks = vi.hoisted(() => ({
  listResult: { data: [] as unknown[], error: null as null | { message: string } },
  writeResult: { error: null as null | { code?: string; message: string } },
  lastWrite: null as unknown,
  client: null as unknown,
}))

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return mocks.client
  },
}))

import { useAdminCategories } from './useAdminCategories'

function makeClient() {
  return {
    from: vi.fn((table: string) => {
      expect(table).toBe('categories')
      return {
        select: vi.fn(() => ({
          order: vi.fn(async () => mocks.listResult),
        })),
        insert: vi.fn(async (payload: unknown) => {
          mocks.lastWrite = payload
          return mocks.writeResult
        }),
        update: vi.fn((payload: unknown) => {
          mocks.lastWrite = payload
          return { eq: vi.fn(async () => mocks.writeResult) }
        }),
        delete: vi.fn(() => ({ eq: vi.fn(async () => mocks.writeResult) })),
      }
    }),
  }
}

const ROW = { ...categoryCaftan, caftans: [{ count: 4 }] }

const VALUES = {
  slug: 'mariage',
  nameAr: 'زفاف',
  nameFr: 'Mariage',
  nameEn: 'Wedding',
  sortOrder: '3',
}

describe('useAdminCategories', () => {
  beforeEach(() => {
    mocks.listResult = { data: [ROW], error: null }
    mocks.writeResult = { error: null }
    mocks.lastWrite = null
    mocks.client = makeClient()
  })

  it('loads categories with their caftan counts', async () => {
    const { result } = renderHook(() => useAdminCategories())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.categories).toHaveLength(1)
    expect(result.current.categories[0].caftan_count).toBe(4)
    expect(result.current.categories[0].slug).toBe('caftan')
  })

  it('surfaces the load error key', async () => {
    mocks.listResult = { data: [], error: { message: 'down' } }
    const { result } = renderHook(() => useAdminCategories())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('admin.categories.error_load')
  })

  it('creates a category with translated names and numeric sort order', async () => {
    const { result } = renderHook(() => useAdminCategories())
    await waitFor(() => expect(result.current.loading).toBe(false))
    let outcome: Awaited<ReturnType<typeof result.current.saveCategory>> | undefined
    await act(async () => {
      outcome = await result.current.saveCategory(VALUES)
    })
    expect(outcome).toEqual({ ok: true, errorKey: null })
    expect(mocks.lastWrite).toEqual({
      slug: 'mariage',
      name: { ar: 'زفاف', fr: 'Mariage', en: 'Wedding' },
      sort_order: 3,
    })
  })

  it('maps 23505 to the slug-taken message', async () => {
    mocks.writeResult = { error: { code: '23505', message: 'dup' } }
    const { result } = renderHook(() => useAdminCategories())
    await waitFor(() => expect(result.current.loading).toBe(false))
    let outcome: Awaited<ReturnType<typeof result.current.saveCategory>> | undefined
    await act(async () => {
      outcome = await result.current.saveCategory(VALUES)
    })
    expect(outcome).toEqual({ ok: false, errorKey: 'admin.categories.error_slug_taken' })
  })

  it('maps FK restrict (23001) on delete to the in-use message', async () => {
    mocks.writeResult = { error: { code: '23001', message: 'restrict' } }
    const { result } = renderHook(() => useAdminCategories())
    await waitFor(() => expect(result.current.loading).toBe(false))
    let outcome: Awaited<ReturnType<typeof result.current.deleteCategory>> | undefined
    await act(async () => {
      outcome = await result.current.deleteCategory('cat-1')
    })
    expect(outcome).toEqual({ ok: false, errorKey: 'admin.categories.error_in_use' })
  })

  it('deletes an unused category cleanly', async () => {
    const { result } = renderHook(() => useAdminCategories())
    await waitFor(() => expect(result.current.loading).toBe(false))
    let outcome: Awaited<ReturnType<typeof result.current.deleteCategory>> | undefined
    await act(async () => {
      outcome = await result.current.deleteCategory('cat-1')
    })
    expect(outcome).toEqual({ ok: true, errorKey: null })
  })
})
