import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { AdminOccupancyRow } from '@/types/admin'
import { withRetry } from '@/lib/errors'

/**
 * Admin occupancy feed (Phase 11) — real bookings overlapping a date
 * range, via admin_caftan_occupancy() (admin-only RPC). Read-only view
 * of the same bookings table guarded by the no_overlapping_active_bookings
 * exclusion constraint: cancelled/rejected bookings never occupy dates.
 */
type UseAdminOccupancyResult = {
  rows: AdminOccupancyRow[]
  loading: boolean
  error: string | null
}

export function useAdminOccupancy(from: string, to: string): UseAdminOccupancyResult {
  const [rows, setRows] = useState<AdminOccupancyRow[]>([])
  const [loading, setLoading] = useState<boolean>(() => supabase !== null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    const client = supabase
    setLoading(true)
    setError(null)

    const { data, error: rpcError } = await withRetry(() =>
      client.rpc('admin_caftan_occupancy', {
        p_from: from,
        p_to: to,
      }),
    )

    if (rpcError) {
      setError('admin.calendar.error_load')
    } else {
      setRows((data ?? []) as AdminOccupancyRow[])
    }
    setLoading(false)
  }, [from, to])

  useEffect(() => {
    const id = setTimeout(() => void load(), 0)
    return () => clearTimeout(id)
  }, [load])

  return { rows, loading, error }
}
