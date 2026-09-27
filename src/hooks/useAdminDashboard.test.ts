import { renderHook, waitFor, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Controllable mock: tests set `mocks.client` before rendering the hook.
const mocks = vi.hoisted(() => ({
  client: null as null | {
    rpc: (
      fn: string,
      args?: unknown,
    ) => Promise<{ data?: unknown; error?: { message: string } | null }>
  },
}))

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return mocks.client
  },
}))

import { useAdminDashboard, ACTIVITY_LIMIT } from './useAdminDashboard'

const KPI_PAYLOAD = {
  bookings_this_month: 3,
  pending_count: 2,
  revenue_estimate: 7200,
  revenue_statuses: ['confirmed', 'completed'],
  top_caftans: [
    {
      caftan_id: 'c-1',
      slug: 'caftan-andalou-rouge',
      name: { fr: 'Caftan Andalou Rouge', ar: 'قفطان أندلسي أحمر', en: 'Red Andalusian Caftan' },
      booking_count: 5,
    },
  ],
  generated_at: '2026-09-27T10:00:00Z',
}

const ACTIVITY_PAYLOAD = [
  {
    type: 'status_change',
    booking_number: 'CF-2026-0042',
    customer_name: 'Salma Bennis',
    from_status: 'pending',
    to_status: 'confirmed',
    occurred_at: '2026-09-27T09:00:00Z',
  },
]

function clientReturning(opts: {
  kpis?: { data?: unknown; error?: { message: string } | null }
  activity?: { data?: unknown; error?: { message: string } | null }
  onRpc?: (fn: string, args?: unknown) => void
}) {
  return {
    rpc: vi.fn(async (fn: string, args?: unknown) => {
      opts.onRpc?.(fn, args)
      if (fn === 'admin_dashboard_kpis') {
        return { data: opts.kpis?.data ?? null, error: opts.kpis?.error ?? null }
      }
      if (fn === 'admin_recent_activity') {
        return { data: opts.activity?.data ?? null, error: opts.activity?.error ?? null }
      }
      throw new Error(`unexpected rpc ${fn}`)
    }),
  }
}

describe('useAdminDashboard', () => {
  beforeEach(() => {
    mocks.client = null
  })

  it('loads KPIs and activity from the admin RPCs', async () => {
    const calls: Array<[string, unknown]> = []
    mocks.client = clientReturning({
      kpis: { data: KPI_PAYLOAD },
      activity: { data: ACTIVITY_PAYLOAD },
      onRpc: (fn, args) => calls.push([fn, args]),
    })

    const { result } = renderHook(() => useAdminDashboard())
    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeNull()
    expect(result.current.kpis?.bookings_this_month).toBe(3)
    expect(result.current.kpis?.revenue_estimate).toBe(7200)
    expect(result.current.activity).toHaveLength(1)
    expect(calls).toContainEqual(['admin_dashboard_kpis', undefined])
    expect(calls).toContainEqual(['admin_recent_activity', { p_limit: ACTIVITY_LIMIT }])
  })

  it('surfaces a translation key when the KPI call fails (never a raw error)', async () => {
    mocks.client = clientReturning({
      kpis: { error: { message: 'insufficient_privilege' } },
      activity: { data: ACTIVITY_PAYLOAD },
    })
    const { result } = renderHook(() => useAdminDashboard())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('admin.load_error')
    expect(result.current.kpis).toBeNull()
    expect(result.current.activity).toEqual([])
  })

  it('surfaces a translation key when the activity call fails', async () => {
    mocks.client = clientReturning({
      kpis: { data: KPI_PAYLOAD },
      activity: { error: { message: 'boom' } },
    })
    const { result } = renderHook(() => useAdminDashboard())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('admin.load_error')
  })

  it('refetch reloads the data', async () => {
    mocks.client = clientReturning({
      kpis: { data: KPI_PAYLOAD },
      activity: { data: ACTIVITY_PAYLOAD },
    })
    const { result } = renderHook(() => useAdminDashboard())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const updated = { ...KPI_PAYLOAD, pending_count: 7 }
    mocks.client = clientReturning({
      kpis: { data: updated },
      activity: { data: [] },
    })
    await act(async () => {
      result.current.refetch()
    })
    await waitFor(() => expect(result.current.kpis?.pending_count).toBe(7))
    expect(result.current.activity).toEqual([])
  })
})
