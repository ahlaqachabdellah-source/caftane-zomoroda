import { describe, it, expect } from 'vitest'
import { buildWhatsappLink, normalizeWhatsappNumber } from './whatsapp'

describe('normalizeWhatsappNumber', () => {
  it('accepts the international +212 format with separators', () => {
    expect(normalizeWhatsappNumber('+212 612 345 678')).toBe('212612345678')
    expect(normalizeWhatsappNumber('+212-612-34-56-78')).toBe('212612345678')
    expect(normalizeWhatsappNumber('212612345678')).toBe('212612345678')
  })

  it('converts the Moroccan local 06/07 format to international', () => {
    expect(normalizeWhatsappNumber('0612 345 678')).toBe('212612345678')
    expect(normalizeWhatsappNumber('06 12 34 56 78')).toBe('212612345678')
    expect(normalizeWhatsappNumber('0712345678')).toBe('212712345678')
  })

  it('converts the 00212 prefix', () => {
    expect(normalizeWhatsappNumber('00212612345678')).toBe('212612345678')
  })

  it('accepts Moroccan fixed-line 05 numbers', () => {
    expect(normalizeWhatsappNumber('0522 123 456')).toBe('212522123456')
  })

  it('rejects empty, malformed or non-Moroccan numbers', () => {
    expect(normalizeWhatsappNumber(null)).toBe('')
    expect(normalizeWhatsappNumber(undefined)).toBe('')
    expect(normalizeWhatsappNumber('')).toBe('')
    expect(normalizeWhatsappNumber('   ')).toBe('')
    expect(normalizeWhatsappNumber('12345')).toBe('')
    expect(normalizeWhatsappNumber('+33 6 12 34 56 78')).toBe('')
    expect(normalizeWhatsappNumber('abc')).toBe('')
    expect(normalizeWhatsappNumber('0412345678')).toBe('') // 04 is not a Moroccan prefix
  })
})

describe('buildWhatsappLink', () => {
  it('builds a wa.me link with a URL-encoded message', () => {
    const link = buildWhatsappLink('+212 612 345 678', 'Bonjour, ça va ?')
    expect(link).toBe(
      `https://wa.me/212612345678?text=${encodeURIComponent('Bonjour, ça va ?')}`,
    )
    expect(link).toContain('Bonjour%2C%20%C3%A7a%20va%20%3F')
  })

  it('encodes Arabic messages correctly', () => {
    const link = buildWhatsappLink('0612345678', 'مرحباً قفطان زمردة')
    expect(link).toBe(`https://wa.me/212612345678?text=${encodeURIComponent('مرحباً قفطان زمردة')}`)
    // every Arabic character is percent-encoded, none left raw
    expect(link).not.toContain('مرحباً')
  })

  it('encodes the booking number reference', () => {
    const link = buildWhatsappLink(
      '+212612345678',
      'Hello, I would like to ask about my booking CF-2026-0042.',
    )
    expect(link).toContain('CF-2026-0042')
    expect(link.startsWith('https://wa.me/212612345678?text=')).toBe(true)
  })

  it('returns an empty string when the number is missing or invalid', () => {
    expect(buildWhatsappLink(null, 'hello')).toBe('')
    expect(buildWhatsappLink('', 'hello')).toBe('')
    expect(buildWhatsappLink('123', 'hello')).toBe('')
  })

  it('omits the text parameter for an empty message', () => {
    expect(buildWhatsappLink('+212612345678', '')).toBe('https://wa.me/212612345678')
  })
})
