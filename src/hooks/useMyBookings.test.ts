import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeBooking } from '@/test/fixtures'

// Controllable mock: tests set `mocks.client` before rendering the hook.
const mocks = vi.hoisted(() => ({
  client: null as null | { from: (table: string) => unknown },
}))

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return mocks.client
  },
}))

import { useMyBookings } from './useMyBookings'
import { useBookingDetail } from './useBookingDetail'
import { makeHistoryEntry } from '@/test/fixtures'

function clientReturning(result: { data?: unknown; error?: { message: string } | null }) {
  return {
    from: vi.fn((table: string) => {
      expect(table).toBe('bookings')
      return {
        select: vi.fn(() => ({
          order: vi.fn(async () => ({ data: result.data ?? null, error: result.error ?? null })),
        })),
      }
    }),
  }
}

describe('useMyBookings', () => {
  beforeEach(() => {
    mocks.client = null
  })

  it('returns the customer bookings ordered by creation', async () => {
    const rows = [makeBooking({ id: 'b-1' }), makeBooking({ id: 'b-2', booking_number: 'CF-2026-0008' })]
    mocks.client = clientReturning({ data: rows })
    const { result } = renderHook(() => useMyBookings())
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.bookings).toHaveLength(2)
    expect(result.current.error).toBeNull()
  })

  it('surfaces query errors instead of an empty list', async () => {
    mocks.client = clientReturning({ error: { message: 'permission denied' } })
    const { result } = renderHook(() => useMyBookings())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.bookings).toHaveLength(0)
    expect(result.current.error).toBe('permission denied')
  })
})

describe('useBookingDetail', () => {
  beforeEach(() => {
    mocks.client = null
  })

  function detailClient(opts: {
    booking: unknown
    history?: unknown
    bookingError?: { message: string } | null
  }) {
    return {
      from: vi.fn((table: string) => {
        if (table === 'bookings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: opts.booking ?? null,
                  error: opts.bookingError ?? null,
                })),
              })),
            })),
          }
        }
        expect(table).toBe('booking_status_history')
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(async () => ({ data: opts.history ?? [], error: null })),
            })),
          })),
        }
      }),
    }
  }

  it('loads the booking and its status history', async () => {
    const booking = makeBooking({ id: 'b-1' })
    const history = [makeHistoryEntry('h-1', 'pending', null), makeHistoryEntry('h-2', 'confirmed')]
    mocks.client = detailClient({ booking, history })
    const { result } = renderHook(() => useBookingDetail('CF-2026-0007'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.booking?.booking_number).toBe('CF-2026-0007')
    expect(result.current.history).toHaveLength(2)
    expect(result.current.notFound).toBe(false)
  })

  it('reports notFound for an unknown or foreign booking number', async () => {
    mocks.client = detailClient({ booking: null })
    const { result } = renderHook(() => useBookingDetail('CF-2026-9999'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.booking).toBeNull()
    expect(result.current.notFound).toBe(true)
  })
})
