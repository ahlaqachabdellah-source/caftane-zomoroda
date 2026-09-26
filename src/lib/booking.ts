/**
 * Booking helpers (Phase 6).
 */

/** Inclusive rental day count between two ISO date strings (0 if invalid). */
export function rentalDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate || endDate < startDate) return 0
  const start = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T00:00:00Z`)
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
}

/**
 * Maps a PostgREST error to a translation key for display.
 * 23P01 = exclusion violation → the double-booking guard fired.
 * 42501 = RLS denied (e.g. caftan went into maintenance meanwhile).
 */
export function mapBookingError(error: { code?: string; message?: string }): string {
  if (
    error.code === '23P01' ||
    error.message?.includes('no_overlapping_active_bookings')
  ) {
    return 'booking.error_overlap'
  }
  if (error.code === '42501') return 'booking.error_permission'
  return 'booking.error_generic'
}
