import { describe, expect, it } from 'vitest'
import { localizedText } from './localized'

describe('localizedText', () => {
  const full = { ar: 'قفطان', fr: 'Caftan', en: 'Caftan EN' }

  it('returns the requested locale', () => {
    expect(localizedText(full, 'fr')).toBe('Caftan')
    expect(localizedText(full, 'ar')).toBe('قفطان')
    expect(localizedText(full, 'en')).toBe('Caftan EN')
  })

  it('falls back to the default locale, then any available one', () => {
    expect(localizedText({ ar: 'قفطان', fr: 'Caftan' }, 'en')).toBe('Caftan')
    expect(localizedText({ en: 'Only English' }, 'ar')).toBe('Only English')
  })

  it('skips empty strings and tolerates malformed values', () => {
    expect(localizedText({ ar: '', fr: 'Caftan' }, 'ar')).toBe('Caftan')
    expect(localizedText({}, 'fr')).toBe('')
    expect(localizedText(null, 'fr')).toBe('')
    expect(localizedText(['a'], 'fr')).toBe('')
    expect(localizedText('plain string', 'ar')).toBe('plain string')
  })
})
