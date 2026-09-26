import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { AdminBookingDetail } from '@/types/admin'
import { withRetry } from '@/lib/errors'

/**
 * Admin booking detail (Phase 11) — booking + customer + caftan +
 * full status history + internal admin notes, via admin_get_booking()
 * (admin-only RPC; a customer calling it gets 42501, so there is no
 * IDOR surface even with a known booking id).
 */
type UseAdminBookingResult = {
  detail: AdminBookingDetail | null
  loading: boolean
  error: string | null
  notFound: boolean
  refetch: () => void
}

export function useAdminBooking(bookingId: string | undefined): UseAdminBookingResult {
  const [detail, setDetail] = useState<AdminBookingDetail | null>(null)
  const [loading, setLoading] = useState<boolean>(() => supabase !== null)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async () => {
    if (!supabase || !bookingId) return
    const client = supabase
    setLoading(true)
    setError(null)
    setNotFound(false)

    const { data, error: rpcError } = await withRetry(() => client.rpc('admin_get_booking', {
      p_booking_id: bookingId,
    }))

    if (rpcError) {
      if (rpcError.code === 'P0002') setNotFound(true)
      else setError('admin.bookings.error_load')
    } else {
      setDetail(data as AdminBookingDetail)
    }
    setLoading(false)
  }, [bookingId])

  useEffect(() => {
    const id = setTimeout(() => void load(), 0)
    return () => clearTimeout(id)
  }, [load])

  return { detail, loading, error, notFound, refetch: load }
}
