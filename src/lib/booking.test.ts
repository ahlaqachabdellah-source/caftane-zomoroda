import { describe, expect, it } from 'vitest'
import { mapBookingError, rentalDays } from './booking'

describe('rentalDays', () => {
  it('counts days inclusively', () => {
    expect(rentalDays('2026-11-10', '2026-11-10')).toBe(1)
    expect(rentalDays('2026-11-10', '2026-11-12')).toBe(3)
  })

  it('returns 0 for missing or inverted ranges', () => {
    expect(rentalDays('', '')).toBe(0)
    expect(rentalDays('2026-11-12', '2026-11-10')).toBe(0)
  })
})

describe('mapBookingError', () => {
  it('maps the double-booking exclusion violation', () => {
    expect(mapBookingError({ code: '23P01' })).toBe('booking.error_overlap')
    expect(
      mapBookingError({ message: 'conflicting key value violates exclusion constraint "no_overlapping_active_bookings"' }),
    ).toBe('booking.error_overlap')
  })

  it('maps RLS denials and falls back to a generic key', () => {
    expect(mapBookingError({ code: '42501' })).toBe('booking.error_permission')
    expect(mapBookingError({ code: '23514' })).toBe('booking.error_generic')
    expect(mapBookingError({})).toBe('booking.error_generic')
  })
})
