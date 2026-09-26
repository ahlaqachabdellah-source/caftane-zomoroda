import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/errors'
import type { Booking } from '@/types/database.types'

/**
 * Customer cancellation (Phase 7). The UI only offers this for pending
 * bookings, but the real rule lives in the database: the
 * bookings_customer_cancel RLS policy (pending → cancelled only) plus the
 * protect_booking_fields trigger make any other transition impossible,
 * regardless of what the client sends.
 *
 * When the rule rejects the update, zero rows match and PostgREST
 * reports PGRST116 ("no rows") — mapped here to a friendly message.
 */
type CancelBookingResult = {
  booking: Booking | null
  /** Translation key for display, or null on success */
  errorKey: string | null
}

export function useCancelBooking() {
  const [cancelling, setCancelling] = useState(false)

  async function cancelBooking(bookingId: string): Promise<CancelBookingResult> {
    if (!supabase) {
      return { booking: null, errorKey: 'account.cancel_failed' }
    }
    setCancelling(true)
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .eq('status', 'pending')
      .select()
      .single()
    setCancelling(false)

    if (error) {
      return {
        booking: null,
        errorKey:
          error.code === 'PGRST116'
            ? 'account.cancel_not_allowed'
            : mapSupabaseError(error, 'account.cancel_failed'),
      }
    }
    return { booking: data, errorKey: null }
  }

  return { cancelBooking, cancelling }
}
