import { describe, expect, it } from 'vitest'
import ar from './locales/ar.json'
import en from './locales/en.json'
import fr from './locales/fr.json'
import { SUPPORTED_LOCALES } from '@/lib/locale'

/** Recursively collect all leaf keys: {a:{b:'x'}} → ['a.b'] */
function leafKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object') {
      return leafKeys(value as Record<string, unknown>, path)
    }
    return [path]
  })
}

const locales: Record<string, Record<string, unknown>> = { ar, en, fr }

describe('i18n resources', () => {
  it('cover exactly the supported locales', () => {
    expect(Object.keys(locales).sort()).toEqual([...SUPPORTED_LOCALES].sort())
  })

  it('have identical key sets in ar, fr and en', () => {
    const reference = leafKeys(fr).sort()
    for (const lng of ['ar', 'en']) {
      const keys = leafKeys(locales[lng]).sort()
      expect(keys, `locale "${lng}" diverges from "fr"`).toEqual(reference)
    }
  })

  it('have no empty translation strings', () => {
    for (const [lng, resources] of Object.entries(locales)) {
      for (const key of leafKeys(resources)) {
        const value = key
          .split('.')
          .reduce<unknown>((acc, part) => (acc as Record<string, unknown>)[part], resources)
        expect(
          typeof value === 'string' && value.trim().length > 0,
          `empty translation: ${lng}:${key}`,
        ).toBe(true)
      }
    }
  })
})
