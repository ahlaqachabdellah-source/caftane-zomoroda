import { describe, it, expect } from 'vitest'
import { profileSchema } from './profile'

describe('profileSchema', () => {
  it('accepts a complete valid profile', () => {
    const result = profileSchema.safeParse({
      fullName: 'Cliente Test',
      phone: '+212 612 345 678',
      whatsappNumber: '0612-345678',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty optional numbers', () => {
    const result = profileSchema.safeParse({
      fullName: 'Cliente Test',
      phone: '',
      whatsappNumber: '',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a too-short name with the translation key', () => {
    const result = profileSchema.safeParse({ fullName: 'X', phone: '', whatsappNumber: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('validation.name_min')
    }
  })

  it('rejects malformed phone numbers', () => {
    const result = profileSchema.safeParse({
      fullName: 'Cliente Test',
      phone: 'abc!',
      whatsappNumber: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('validation.phone_invalid')
      expect(result.error.issues[0].path).toEqual(['phone'])
    }
  })

  it('rejects a malformed WhatsApp number', () => {
    const result = profileSchema.safeParse({
      fullName: 'Cliente Test',
      phone: '',
      whatsappNumber: '12',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['whatsappNumber'])
    }
  })
})
