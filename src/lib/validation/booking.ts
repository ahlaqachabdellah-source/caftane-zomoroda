import { z } from 'zod'

/**
 * Booking form validation (Phase 6). Messages are translation KEYS,
 * resolved with t() at display time (same convention as auth forms).
 * Dates are ISO yyyy-mm-dd strings from native date inputs — plain
 * string comparison is chronological for this format.
 */

/** Today as an ISO date string (local timezone). */
export function todayString(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export const bookingSchema = z
  .object({
    startDate: z.string().min(1, 'validation.start_date_required'),
    endDate: z.string().min(1, 'validation.end_date_required'),
    customerNotes: z.string().max(500, 'validation.notes_max'),
  })
  .refine((v) => !v.startDate || v.startDate >= todayString(), {
    message: 'validation.start_in_past',
    path: ['startDate'],
  })
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, {
    message: 'validation.end_before_start',
    path: ['endDate'],
  })

export type BookingFormValues = z.infer<typeof bookingSchema>
