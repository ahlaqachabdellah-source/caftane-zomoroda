import { describe, expect, it } from 'vitest'
import { absoluteLocaleUrl, localeAlternates, ogLocale, siteOrigin } from '@/lib/seo'

describe('seo helpers', () => {
  it('builds absolute locale-aware URLs from the current origin when env is unset', () => {
    expect(siteOrigin()).toMatch(/^https?:\/\//)
    expect(absoluteLocaleUrl('/caftans/caftan-royal', 'ar')).toBe(
      `${siteOrigin()}/ar/caftans/caftan-royal`,
    )
    expect(absoluteLocaleUrl('/', 'fr')).toBe(`${siteOrigin()}/fr`)
  })

  it('emits hreflang alternates for all locales plus x-default to French', () => {
    const alternates = localeAlternates('/caftans')
    expect(alternates).toHaveLength(4)
    expect(alternates.map((a) => a.hreflang)).toEqual(['fr', 'ar', 'en', 'x-default'])
    expect(alternates.find((a) => a.hreflang === 'x-default')?.href).toBe(
      alternates.find((a) => a.hreflang === 'fr')?.href,
    )
    expect(alternates.find((a) => a.hreflang === 'ar')?.href).toContain('/ar/caftans')
  })

  it('maps locales to og:locale region tags', () => {
    expect(ogLocale('fr')).toBe('fr_MA')
    expect(ogLocale('ar')).toBe('ar_MA')
    expect(ogLocale('en')).toBe('en_US')
  })
})
