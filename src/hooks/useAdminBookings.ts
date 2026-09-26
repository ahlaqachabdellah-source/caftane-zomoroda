import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { AdminBookingListItem } from '@/types/admin'

/**
 * Admin booking list (Phase 11) — every booking with customer + caftan
 * embeds, computed server-side by admin_list_bookings() (admin-only,
 * SECURITY DEFINER). Status/date/caftan filters and search run
 * client-side in the page: the booking volume of a boutique rental
 * business is small, so one fetch keeps filters instant.
 */
type UseAdminBookingsResult = {
  bookings: AdminBookingListItem[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAdminBookings(): UseAdminBookingsResult {
  const [bookings, setBookings] = useState<AdminBookingListItem[]>([])
  const [loading, setLoading] = useState<boolean>(() => supabase !== null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)

    const { data, error: rpcError } = await supabase.rpc('admin_list_bookings')

    if (rpcError) {
      setError('admin.bookings.error_load')
    } else {
      setBookings((data ?? []) as AdminBookingListItem[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const id = setTimeout(() => void load(), 0)
    return () => clearTimeout(id)
  }, [load])

  return { bookings, loading, error, refetch: load }
}
