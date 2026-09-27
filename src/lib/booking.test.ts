import { describe, expect, it } from 'vitest'
import { mapBookingError, overlapsAnyPeriod, rangesOverlap, rentalDays } from './booking'

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

describe('rangesOverlap', () => {
  it('uses inclusive daterange [] semantics like the exclusion constraint', () => {
    expect(rangesOverlap('2026-12-10', '2026-12-12', '2026-12-12', '2026-12-14')).toBe(true)
    expect(rangesOverlap('2026-12-10', '2026-12-12', '2026-12-08', '2026-12-10')).toBe(true)
    expect(rangesOverlap('2026-12-10', '2026-12-12', '2026-12-13', '2026-12-15')).toBe(false)
    expect(rangesOverlap('2026-12-10', '2026-12-12', '2026-12-01', '2026-12-09')).toBe(false)
    expect(rangesOverlap('2026-12-10', '2026-12-12', '2026-12-11', '2026-12-11')).toBe(true)
  })
})

describe('overlapsAnyPeriod', () => {
  const periods = [
    { start_date: '2026-12-10', end_date: '2026-12-12' },
    { start_date: '2027-01-15', end_date: '2027-01-17' },
  ]

  it('detects overlap with any occupied period', () => {
    expect(overlapsAnyPeriod('2026-12-11', '2026-12-13', periods)).toBe(true)
    expect(overlapsAnyPeriod('2027-01-16', '2027-01-18', periods)).toBe(true)
  })

  it('accepts free ranges and incomplete input', () => {
    expect(overlapsAnyPeriod('2026-12-13', '2026-12-14', periods)).toBe(false)
    expect(overlapsAnyPeriod('', '', periods)).toBe(false)
    expect(overlapsAnyPeriod('2026-12-14', '2026-12-13', periods)).toBe(false)
    expect(overlapsAnyPeriod('2026-12-11', '2026-12-12', [])).toBe(false)
  })
})

describe('mapBookingError', () => {
  it('maps the double-booking exclusion violation', () => {
    expect(mapBookingError({ code: '23P01' })).toBe('booking.error_overlap')
    expect(
      mapBookingError({
        message:
          'conflicting key value violates exclusion constraint "no_overlapping_active_bookings"',
      }),
    ).toBe('booking.error_overlap')
  })

  it('maps RLS denials and falls back to a generic key', () => {
    expect(mapBookingError({ code: '42501' })).toBe('booking.error_permission')
    expect(mapBookingError({ code: '23514' })).toBe('booking.error_generic')
    expect(mapBookingError({})).toBe('booking.error_generic')
  })
})
