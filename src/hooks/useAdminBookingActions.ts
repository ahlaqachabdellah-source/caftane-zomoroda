import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { BookingStatus } from '@/types/database.types'

/**
 * Admin booking mutations (Phase 11).
 * Both actions go through SECURITY DEFINER RPCs that re-check is_admin(),
 * validate the booking exists, and enforce the lifecycle server-side:
 *   42501 → not an admin (or tampered client)
 *   P0002 → booking not found
 *   22023 → invalid / duplicate transition
 * The history row is written by the bookings status trigger — never skipped.
 */
export type AdminActionResult = {
  ok: boolean
  errorKey: string | null
}

function mapError(error: { code?: string } | null): string {
  if (error?.code === '42501') return 'admin.bookings.error_permission'
  if (error?.code === 'P0002') return 'admin.bookings.error_not_found'
  if (error?.code === '22023') return 'admin.bookings.error_invalid_transition'
  return 'admin.bookings.error_action'
}

export function useAdminBookingActions() {
  const [acting, setActing] = useState(false)

  const updateStatus = useCallback(
    async (
      bookingId: string,
      newStatus: BookingStatus,
      note = '',
    ): Promise<AdminActionResult> => {
      if (!supabase) return { ok: false, errorKey: 'admin.bookings.error_action' }
      setActing(true)
      const { error } = await supabase.rpc('admin_update_booking_status', {
        p_booking_id: bookingId,
        p_new_status: newStatus,
        p_note: note,
      })
      setActing(false)
      if (error) return { ok: false, errorKey: mapError(error) }
      return { ok: true, errorKey: null }
    },
    [],
  )

  const saveNotes = useCallback(
    async (bookingId: string, notes: string): Promise<AdminActionResult> => {
      if (!supabase) return { ok: false, errorKey: 'admin.bookings.error_action' }
      setActing(true)
      const { error } = await supabase.rpc('admin_set_booking_notes', {
        p_booking_id: bookingId,
        p_notes: notes,
      })
      setActing(false)
      if (error) return { ok: false, errorKey: mapError(error) }
      return { ok: true, errorKey: null }
    },
    [],
  )

  return { acting, updateStatus, saveNotes }
}
