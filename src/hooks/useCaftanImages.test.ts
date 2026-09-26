import { renderHook, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeImage } from '@/test/fixtures'
import type { CaftanImage } from '@/types/database.types'

// Controllable supabase mock with storage support.
const mocks = vi.hoisted(() => ({
  uploads: [] as Array<{ path: string }>,
  removes: [] as string[][],
  inserts: [] as Array<Record<string, unknown>>,
  updates: [] as Array<{ payload: Record<string, unknown>; eq: [string, string] }>,
  deletes: [] as Array<[string, string]>,
  uploadError: null as null | { message: string },
  insertError: null as null | { message: string },
  updateError: null as null | { message: string },
  deleteError: null as null | { message: string },
  client: null as unknown,
}))

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return mocks.client
  },
}))

import { useCaftanImages } from './useCaftanImages'

function makeClient() {
  return {
    storage: {
      from: vi.fn((bucket: string) => {
        expect(bucket).toBe('caftan-images')
        return {
          upload: vi.fn(async (path: string) => {
            mocks.uploads.push({ path })
            return { error: mocks.uploadError }
          }),
          remove: vi.fn(async (paths: string[]) => {
            mocks.removes.push(paths)
            return { error: null }
          }),
          getPublicUrl: vi.fn((path: string) => ({ data: { publicUrl: `https://cdn/${path}` } })),
        }
      }),
    },
    from: vi.fn((table: string) => {
      expect(table).toBe('caftan_images')
      return {
        insert: vi.fn(async (row: Record<string, unknown>) => {
          mocks.inserts.push(row)
          return { error: mocks.insertError }
        }),
        update: vi.fn((payload: Record<string, unknown>) => ({
          eq: vi.fn(async (col: string, val: string) => {
            mocks.updates.push({ payload, eq: [col, val] })
            return { error: mocks.updateError }
          }),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(async (col: string, val: string) => {
            mocks.deletes.push([col, val])
            return { error: mocks.deleteError }
          }),
        })),
      }
    }),
  }
}

const FILE_A = new File(['a'], 'Photo Une.JPG', { type: 'image/jpeg' })
const FILE_B = new File(['b'], 'photo-two.png', { type: 'image/png' })

describe('useCaftanImages', () => {
  beforeEach(() => {
    mocks.uploads = []
    mocks.removes = []
    mocks.inserts = []
    mocks.updates = []
    mocks.deletes = []
    mocks.uploadError = null
    mocks.insertError = null
    mocks.updateError = null
    mocks.deleteError = null
    mocks.client = makeClient()
  })

  it('uploads multiple files: storage object + metadata row each, first image becomes primary on an empty caftan', async () => {
    const { result } = renderHook(() => useCaftanImages('c-1'))
    let outcome: Awaited<ReturnType<typeof result.current.uploadImages>> | undefined
    await act(async () => {
      outcome = await result.current.uploadImages([FILE_A, FILE_B], [])
    })
    expect(outcome).toEqual({ ok: true, errorKey: null })
    expect(mocks.uploads).toHaveLength(2)
    expect(mocks.uploads[0].path).toMatch(/^c-1\/.+-photo-une.jpg$/)
    expect(mocks.inserts).toHaveLength(2)
    expect(mocks.inserts[0]).toMatchObject({ caftan_id: 'c-1', sort_order: 0, is_primary: true })
    expect(mocks.inserts[1]).toMatchObject({ caftan_id: 'c-1', sort_order: 1, is_primary: false })
    expect(mocks.inserts[0].storage_path).toBe(mocks.uploads[0].path)
  })

  it('continues sort_order after existing images and never steals the primary flag', async () => {
    const existing = [makeImage('c-1', 0, true), makeImage('c-1', 4, false)]
    const { result } = renderHook(() => useCaftanImages('c-1'))
    await act(async () => {
      await result.current.uploadImages([FILE_A], existing)
    })
    expect(mocks.inserts[0]).toMatchObject({ sort_order: 5, is_primary: false })
  })

  it('rolls back the storage object when the metadata insert fails', async () => {
    mocks.insertError = { message: 'rls' }
    const { result } = renderHook(() => useCaftanImages('c-1'))
    let outcome: Awaited<ReturnType<typeof result.current.uploadImages>> | undefined
    await act(async () => {
      outcome = await result.current.uploadImages([FILE_A], [])
    })
    expect(outcome).toEqual({ ok: false, errorKey: 'admin.images.error_upload' })
    expect(mocks.removes).toEqual([[mocks.uploads[0].path]])
  })

  it('surfaces the upload error key when storage rejects the file', async () => {
    mocks.uploadError = { message: 'policy' }
    const { result } = renderHook(() => useCaftanImages('c-1'))
    let outcome: Awaited<ReturnType<typeof result.current.uploadImages>> | undefined
    await act(async () => {
      outcome = await result.current.uploadImages([FILE_A], [])
    })
    expect(outcome).toEqual({ ok: false, errorKey: 'admin.images.error_upload' })
    expect(mocks.inserts).toHaveLength(0)
  })

  it('deletes the metadata row then removes the storage object', async () => {
    const image: CaftanImage = makeImage('c-1', 1, true)
    const { result } = renderHook(() => useCaftanImages('c-1'))
    let outcome: Awaited<ReturnType<typeof result.current.deleteImage>> | undefined
    await act(async () => {
      outcome = await result.current.deleteImage(image)
    })
    expect(outcome).toEqual({ ok: true, errorKey: null })
    expect(mocks.deletes).toEqual([['id', image.id]])
    expect(mocks.removes).toEqual([[image.storage_path]])
  })

  it('keeps the error key when the row delete fails', async () => {
    mocks.deleteError = { message: 'rls' }
    const { result } = renderHook(() => useCaftanImages('c-1'))
    let outcome: Awaited<ReturnType<typeof result.current.deleteImage>> | undefined
    await act(async () => {
      outcome = await result.current.deleteImage(makeImage('c-1', 1))
    })
    expect(outcome).toEqual({ ok: false, errorKey: 'admin.images.error_delete' })
    expect(mocks.removes).toHaveLength(0)
  })

  it('persists a new order as sequential sort_order values', async () => {
    const { result } = renderHook(() => useCaftanImages('c-1'))
    await act(async () => {
      await result.current.persistOrder(['img-b', 'img-a', 'img-c'])
    })
    expect(mocks.updates).toEqual([
      { payload: { sort_order: 0 }, eq: ['id', 'img-b'] },
      { payload: { sort_order: 1 }, eq: ['id', 'img-a'] },
      { payload: { sort_order: 2 }, eq: ['id', 'img-c'] },
    ])
  })

  it('setPrimary clears all flags for the caftan then sets the target', async () => {
    const image = makeImage('c-1', 2)
    const { result } = renderHook(() => useCaftanImages('c-1'))
    await act(async () => {
      await result.current.setPrimary(image)
    })
    expect(mocks.updates).toEqual([
      { payload: { is_primary: false }, eq: ['caftan_id', 'c-1'] },
      { payload: { is_primary: true }, eq: ['id', image.id] },
    ])
  })

  it('trims alt text and drops empty translations', async () => {
    const { result } = renderHook(() => useCaftanImages('c-1'))
    await act(async () => {
      await result.current.updateAltText('img-1', { ar: '  ', fr: ' Vue de face ', en: '' })
    })
    expect(mocks.updates[0]).toEqual({
      payload: { alt_text: { fr: 'Vue de face' } },
      eq: ['id', 'img-1'],
    })
  })
})
