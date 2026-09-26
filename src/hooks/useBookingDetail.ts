import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { MyBooking } from '@/hooks/useMyBookings'
import type { BookingStatusHistory } from '@/types/database.types'

/**
 * One of the customer's own bookings, addressed by its public booking
 * number (CF-YYYY-NNNN) — never by the internal UUID (Phase 7).
 * RLS scopes both queries to the caller's own data; an unknown or foreign
 * booking number simply resolves to `notFound`.
 */
type UseBookingDetailResult = {
  booking: MyBooking | null
  history: BookingStatusHistory[]
  loading: boolean
  error: string | null
  notFound: boolean
  refetch: () => void
}

export function useBookingDetail(bookingNumber: string | undefined): UseBookingDetailResult {
  const [booking, setBooking] = useState<MyBooking | null>(null)
  const [history, setHistory] = useState<BookingStatusHistory[]>([])
  const [loading, setLoading] = useState<boolean>(() => supabase !== null)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async () => {
    if (!supabase || !bookingNumber) {
      if (!bookingNumber) setNotFound(true)
      return
    }
    setLoading(true)
    setError(null)
    setNotFound(false)

    const { data, error: bookingError } = await supabase
      .from('bookings')
      .select('*, caftan:caftans(*, category:categories(*), images:caftan_images(*))')
      .eq('booking_number', bookingNumber)
      .maybeSingle()

    if (bookingError) {
      setError(bookingError.message)
      setLoading(false)
      return
    }
    if (!data) {
      setBooking(null)
      setHistory([])
      setNotFound(true)
      setLoading(false)
      return
    }

    setBooking(data as MyBooking)

    const { data: historyRows, error: historyError } = await supabase
      .from('booking_status_history')
      .select('*')
      .eq('booking_id', data.id)
      .order('created_at', { ascending: true })

    if (historyError) {
      setError(historyError.message)
    } else {
      setHistory((historyRows ?? []) as BookingStatusHistory[])
    }
    setLoading(false)
  }, [bookingNumber])

  useEffect(() => {
    // Deferred so the synchronous setLoading(true) inside load() does not
    // run directly in the effect body (react-hooks/set-state-in-effect).
    const id = setTimeout(() => void load(), 0)
    return () => clearTimeout(id)
  }, [load])

  return { booking, history, loading, error, notFound, refetch: load }
}
