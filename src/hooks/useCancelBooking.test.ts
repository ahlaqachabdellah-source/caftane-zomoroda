import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { makeBooking } from '@/test/fixtures'
import type { Booking } from '@/types/database.types'
import { useCancelBooking } from './useCancelBooking'

type Outcome = { booking: Booking | null; errorKey: string | null } | undefined

const mocks = vi.hoisted(() => {
  const single = vi.fn()
  const eqStatus = vi.fn(() => ({ select: () => ({ single }) }))
  const eqId = vi.fn(() => ({ eq: eqStatus }))
  const update = vi.fn(() => ({ eq: eqId }))
  const from = vi.fn(() => ({ update }))
  return { single, eqStatus, eqId, update, from }
})

vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: mocks.from },
}))

describe('useCancelBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const select = vi.fn(() => ({ single: mocks.single }))
    mocks.eqStatus.mockReturnValue({ select })
    mocks.eqId.mockReturnValue({ eq: mocks.eqStatus })
    mocks.update.mockReturnValue({ eq: mocks.eqId })
    mocks.from.mockReturnValue({ update: mocks.update })
  })

  it('cancels a pending booking and returns the updated row', async () => {
    const cancelled = { ...makeBooking({ id: 'b-1' }), status: 'cancelled' as const }
    mocks.single.mockResolvedValue({ data: cancelled, error: null })
    const { result } = renderHook(() => useCancelBooking())

    let outcome: Outcome
    await act(async () => {
      outcome = await result.current.cancelBooking('b-1')
    })

    expect(outcome?.booking?.status).toBe('cancelled')
    expect(outcome?.errorKey).toBeNull()
    expect(mocks.update).toHaveBeenCalledWith({ status: 'cancelled' })
    expect(mocks.eqId).toHaveBeenCalledWith('id', 'b-1')
    expect(mocks.eqStatus).toHaveBeenCalledWith('status', 'pending')
    expect(result.current.cancelling).toBe(false)
  })

  it('maps the no-rows rejection (not pending anymore) to cancel_not_allowed', async () => {
    mocks.single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' },
    })
    const { result } = renderHook(() => useCancelBooking())

    let outcome: Outcome
    await act(async () => {
      outcome = await result.current.cancelBooking('b-1')
    })

    expect(outcome?.booking).toBeNull()
    expect(outcome?.errorKey).toBe('account.cancel_not_allowed')
  })

  it('maps other failures to the generic cancellation error', async () => {
    mocks.single.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'boom' } })
    const { result } = renderHook(() => useCancelBooking())

    let outcome: Outcome
    await act(async () => {
      outcome = await result.current.cancelBooking('b-1')
    })

    expect(outcome?.errorKey).toBe('account.cancel_failed')
  })
})
