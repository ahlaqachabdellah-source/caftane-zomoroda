import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Controllable mock: tests set `mocks.client` before rendering the hooks.
const mocks = vi.hoisted(() => ({
  client: null as null | {
    rpc: (
      fn: string,
      args: unknown,
    ) => Promise<{ data: unknown; error: null | { message: string } }>
  },
}))

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return mocks.client
  },
}))

import { useBookedPeriods } from './useBookedPeriods'
import { useAvailableCaftanIds } from './useAvailableCaftanIds'

describe('useBookedPeriods', () => {
  beforeEach(() => {
    mocks.client = null
  })

  it('returns occupied periods from the RPC', async () => {
    const rpc = vi.fn(async (fn: string, args: unknown) => {
      expect(fn).toBe('booked_periods')
      expect(args).toEqual({ p_caftan_id: 'c1' })
      return {
        data: [{ start_date: '2026-12-10', end_date: '2026-12-12' }],
        error: null,
      }
    })
    mocks.client = { rpc }
    const { result } = renderHook(() => useBookedPeriods('c1'))
    await waitFor(() => expect(result.current.periods).toHaveLength(1))
    expect(result.current.periods[0]).toEqual({ start_date: '2026-12-10', end_date: '2026-12-12' })
  })

  it('fails open with an empty list on error', async () => {
    mocks.client = {
      rpc: vi.fn(async () => ({
        data: null,
        error: { message: 'permission denied for table bookings' },
      })),
    }
    const { result } = renderHook(() => useBookedPeriods('c1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.periods).toEqual([])
  })

  it('drops malformed entries defensively', async () => {
    mocks.client = {
      rpc: vi.fn(async () => ({
        data: [{ start_date: '2026-12-10', end_date: '2026-12-12' }, { nope: true }, null, 'x'],
        error: null,
      })),
    }
    const { result } = renderHook(() => useBookedPeriods('c1'))
    await waitFor(() => expect(result.current.periods).toHaveLength(1))
  })
})

describe('useAvailableCaftanIds', () => {
  beforeEach(() => {
    mocks.client = null
  })

  it('stays inert until both dates are set', async () => {
    const rpc = vi.fn(async () => ({ data: [], error: null }))
    mocks.client = { rpc }
    const { result, rerender } = renderHook(({ s, e }) => useAvailableCaftanIds(s, e), {
      initialProps: { s: '', e: '' },
    })
    expect(result.current.ids).toBeNull()
    expect(rpc).not.toHaveBeenCalled()
    rerender({ s: '2026-12-10', e: '' })
    expect(rpc).not.toHaveBeenCalled()
    rerender({ s: '2026-12-10', e: '2026-12-12' })
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith('available_caftan_ids', {
        p_start: '2026-12-10',
        p_end: '2026-12-12',
      }),
    )
  })

  it('ignores inverted ranges', () => {
    const rpc = vi.fn(async () => ({ data: [], error: null }))
    mocks.client = { rpc }
    renderHook(() => useAvailableCaftanIds('2026-12-12', '2026-12-10'))
    expect(rpc).not.toHaveBeenCalled()
  })

  it('fails open (null) on error so the catalog never empties spuriously', async () => {
    mocks.client = {
      rpc: vi.fn(async () => ({
        data: null,
        error: { message: 'permission denied for table bookings' },
      })),
    }
    const { result } = renderHook(() => useAvailableCaftanIds('2026-12-10', '2026-12-12'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.ids).toBeNull()
  })
})
