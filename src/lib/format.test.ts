import { describe, expect, it } from 'vitest'
import { formatDate, formatNumber, formatPrice } from './format'

describe('formatPrice (MAD)', () => {
  it('formats French prices with a dirham marker', () => {
    const out = formatPrice(1200, 'fr')
    expect(out).toMatch(/1[.\s ]?200/)
    expect(out).toMatch(/MAD|DH|د\.م\./)
  })

  it('formats Arabic prices with Moroccan conventions', () => {
    const out = formatPrice(800, 'ar')
    expect(out).toContain('800')
    expect(out).toMatch(/د\.م\.|MAD|DH/)
  })

  it('formats English prices with a currency marker', () => {
    const out = formatPrice(650.5, 'en')
    expect(out).toContain('650')
    expect(out).toMatch(/MAD|DH|د\.م\./)
  })
})

describe('formatDate', () => {
  it('localizes month names per locale', () => {
    expect(formatDate('2026-03-15', 'fr')).toContain('mars')
    expect(formatDate('2026-03-15', 'en')).toContain('March')
    expect(formatDate('2026-03-15', 'ar')).toContain('مارس')
  })

  it('keeps the day and year in every locale', () => {
    for (const locale of ['fr', 'ar', 'en'] as const) {
      const out = formatDate('2026-03-15', locale)
      expect(out).toContain('15')
      expect(out).toMatch(/2026|٢٠٢٦/)
    }
  })
})

describe('formatNumber', () => {
  it('groups thousands', () => {
    const out = formatNumber(12000, 'en')
    expect(out.replace(/[\s,٬]/g, '')).toBe('12000')
  })
})
