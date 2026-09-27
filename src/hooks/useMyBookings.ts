import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { CatalogCaftan } from '@/lib/caftans'
import type { Booking } from '@/types/database.types'
import { mapSupabaseError, withRetry } from '@/lib/errors'

/**
 * The authenticated customer's own bookings (Phase 7).
 * RLS scopes the query server-side (`customer_id = auth.uid()`), so the
 * list can never contain another customer's booking — the frontend filter
 * below is only a display nicety, not a security boundary.
 *
 * `caftan` may be null when the piece has since been retired (the public
 * RLS policy hides retired caftans); the UI must degrade gracefully.
 */
export type MyBooking = Booking & { caftan: CatalogCaftan | null }

type UseMyBookingsResult = {
  bookings: MyBooking[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useMyBookings(): UseMyBookingsResult {
  const [bookings, setBookings] = useState<MyBooking[]>([])
  const [loading, setLoading] = useState<boolean>(() => supabase !== null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    const client = supabase
    setLoading(true)
    setError(null)

    const { data, error: queryError } = await withRetry(() =>
      client
        .from('bookings')
        .select('*, caftan:caftans(*, category:categories(*), images:caftan_images(*))')
        .order('created_at', { ascending: false }),
    )

    if (queryError) {
      setError(mapSupabaseError(queryError, 'account.error_body'))
    } else {
      setBookings((data ?? []) as MyBooking[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // Deferred so the synchronous setLoading(true) inside load() does not
    // run directly in the effect body (react-hooks/set-state-in-effect).
    const id = setTimeout(() => void load(), 0)
    return () => clearTimeout(id)
  }, [load])

  return { bookings, loading, error, refetch: load }
}
