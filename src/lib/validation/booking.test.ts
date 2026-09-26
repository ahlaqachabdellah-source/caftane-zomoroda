import { describe, expect, it } from 'vitest'
import { bookingSchema, todayString } from './booking'

const tomorrow = (() => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
})()

describe('bookingSchema', () => {
  it('accepts a valid range starting today', () => {
    const result = bookingSchema.safeParse({
      startDate: todayString(),
      endDate: tomorrow,
      customerNotes: '',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing dates', () => {
    const result = bookingSchema.safeParse({ startDate: '', endDate: '', customerNotes: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0])
      expect(paths).toContain('startDate')
      expect(paths).toContain('endDate')
    }
  })

  it('rejects a start date in the past', () => {
    const result = bookingSchema.safeParse({
      startDate: '2020-01-01',
      endDate: tomorrow,
      customerNotes: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('validation.start_in_past')
    }
  })

  it('rejects an end date before the start date', () => {
    const result = bookingSchema.safeParse({
      startDate: tomorrow,
      endDate: todayString(),
      customerNotes: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('validation.end_before_start')
    }
  })

  it('caps notes at 500 characters', () => {
    const result = bookingSchema.safeParse({
      startDate: todayString(),
      endDate: tomorrow,
      customerNotes: 'x'.repeat(501),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('validation.notes_max')
    }
  })
})
