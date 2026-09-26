/**
 * Booking helpers (Phase 6).
 */

import { mapSupabaseError } from '@/lib/errors'

/** Inclusive rental day count between two ISO date strings (0 if invalid). */
export function rentalDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate || endDate < startDate) return 0
  const start = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T00:00:00Z`)
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
}

/**
 * Maps a PostgREST error to a translation key for display (Phase 12:
 * delegates to the shared error-mapping layer, keeping booking-specific
 * keys for the cases the booking flow already distinguishes).
 * 23P01 = exclusion violation → the double-booking guard fired.
 * 42501 = RLS denied (e.g. caftan went into maintenance meanwhile).
 */
export function mapBookingError(error: { code?: string; message?: string }): string {
  const shared = mapSupabaseError(error, 'booking.error_generic')
  if (shared === 'errors.booking_overlap') return 'booking.error_overlap'
  if (shared === 'errors.permission') return 'booking.error_permission'
  if (shared === 'errors.session_expired') return shared
  if (shared === 'errors.network' || shared === 'errors.rate_limited') return shared
  return 'booking.error_generic'
}
