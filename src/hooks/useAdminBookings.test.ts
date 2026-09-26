import { renderHook, waitFor, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))
vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return { rpc: mockRpc }
  },
}))

import { useAdminBookingActions } from './useAdminBookingActions'
import { useAdminBookings } from './useAdminBookings'
import { useAdminBooking } from './useAdminBooking'
import { useAdminCustomers, useAdminCustomer } from './useAdminCustomers'
import { useAdminOccupancy } from './useAdminOccupancy'

describe('useAdminBookingActions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updateStatus calls the RPC with id, status and note', async () => {
    mockRpc.mockResolvedValue({ data: {}, error: null })
    const { result } = renderHook(() => useAdminBookingActions())
    let res: { ok: boolean; errorKey: string | null } | undefined
    await act(async () => {
      res = await result.current.updateStatus('b-1', 'confirmed', 'par téléphone')
    })
    expect(mockRpc).toHaveBeenCalledWith('admin_update_booking_status', {
      p_booking_id: 'b-1',
      p_new_status: 'confirmed',
      p_note: 'par téléphone',
    })
    expect(res).toEqual({ ok: true, errorKey: null })
  })

  it('maps 22023 to the invalid-transition message', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: '22023', message: 'invalid' } })
    const { result } = renderHook(() => useAdminBookingActions())
    let res: { ok: boolean; errorKey: string | null } | undefined
    await act(async () => {
      res = await result.current.updateStatus('b-1', 'completed')
    })
    expect(res).toEqual({ ok: false, errorKey: 'admin.bookings.error_invalid_transition' })
  })

  it('maps oversized-note 22023 to the note validation keys', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: '22023', message: 'Status note too long' },
    })
    const { result } = renderHook(() => useAdminBookingActions())
    let res: { ok: boolean; errorKey: string | null } | undefined
    await act(async () => {
      res = await result.current.updateStatus('b-1', 'confirmed', 'x'.repeat(501))
    })
    expect(res).toEqual({ ok: false, errorKey: 'validation.notes_max' })

    mockRpc.mockResolvedValue({
      data: null,
      error: { code: '22023', message: 'Notes too long' },
    })
    await act(async () => {
      res = await result.current.saveNotes('b-1', 'x'.repeat(2001))
    })
    expect(res).toEqual({ ok: false, errorKey: 'validation.admin_notes_max' })
  })

  it('maps P0002 and 42501', async () => {
    const { result } = renderHook(() => useAdminBookingActions())
    mockRpc.mockResolvedValue({ data: null, error: { code: 'P0002' } })
    let res: { ok: boolean; errorKey: string | null } | undefined
    await act(async () => {
      res = await result.current.updateStatus('b-x', 'confirmed')
    })
    expect(res?.errorKey).toBe('admin.bookings.error_not_found')
    mockRpc.mockResolvedValue({ data: null, error: { code: '42501' } })
    await act(async () => {
      res = await result.current.updateStatus('b-x', 'confirmed')
    })
    expect(res?.errorKey).toBe('admin.bookings.error_permission')
  })

  it('saveNotes calls admin_set_booking_notes', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })
    const { result } = renderHook(() => useAdminBookingActions())
    let res: { ok: boolean; errorKey: string | null } | undefined
    await act(async () => {
      res = await result.current.saveNotes('b-1', 'note interne')
    })
    expect(mockRpc).toHaveBeenCalledWith('admin_set_booking_notes', {
      p_booking_id: 'b-1',
      p_notes: 'note interne',
    })
    expect(res?.ok).toBe(true)
  })
})

describe('useAdminBookings', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads the RPC payload', async () => {
    mockRpc.mockResolvedValue({ data: [{ id: 'b-1', booking_number: 'CF-2026-0001' }], error: null })
    const { result } = renderHook(() => useAdminBookings())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockRpc).toHaveBeenCalledWith('admin_list_bookings')
    expect(result.current.bookings).toHaveLength(1)
    expect(result.current.error).toBeNull()
  })

  it('exposes an error key on failure', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: '42501' } })
    const { result } = renderHook(() => useAdminBookings())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('admin.bookings.error_load')
    expect(result.current.bookings).toEqual([])
  })
})

describe('useAdminBooking', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads detail and flags notFound on P0002', async () => {
    mockRpc.mockResolvedValue({ data: { booking: { id: 'b-1' }, history: [] }, error: null })
    const { result } = renderHook(() => useAdminBooking('b-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.detail?.booking.id).toBe('b-1')

    mockRpc.mockResolvedValue({ data: null, error: { code: 'P0002' } })
    const missing = renderHook(() => useAdminBooking('nope'))
    await waitFor(() => expect(missing.result.current.loading).toBe(false))
    expect(missing.result.current.notFound).toBe(true)
  })
})

describe('useAdminCustomers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads customers and detail; flags notFound', async () => {
    mockRpc.mockResolvedValue({ data: [{ id: 'c-1', booking_count: 2 }], error: null })
    const { result } = renderHook(() => useAdminCustomers())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.customers).toHaveLength(1)

    mockRpc.mockResolvedValue({
      data: { profile: { id: 'c-1' }, bookings: [] },
      error: null,
    })
    const detail = renderHook(() => useAdminCustomer('c-1'))
    await waitFor(() => expect(detail.result.current.loading).toBe(false))
    expect(detail.result.current.detail?.profile.id).toBe('c-1')

    mockRpc.mockResolvedValue({ data: null, error: { code: 'P0002' } })
    const missing = renderHook(() => useAdminCustomer('nope'))
    await waitFor(() => expect(missing.result.current.loading).toBe(false))
    expect(missing.result.current.notFound).toBe(true)
  })
})

describe('useAdminOccupancy', () => {
  beforeEach(() => vi.clearAllMocks())

  it('passes the date range to the RPC', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })
    const { result } = renderHook(() => useAdminOccupancy('2027-08-01', '2027-08-31'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockRpc).toHaveBeenCalledWith('admin_caftan_occupancy', {
      p_from: '2027-08-01',
      p_to: '2027-08-31',
    })
    expect(result.current.rows).toEqual([])
  })
})
