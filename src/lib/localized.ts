import type { Json } from '@/types/database.types'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from '@/lib/locale'

/**
 * Reads a translatable jsonb column ({ "ar": …, "fr": …, "en": … }) in the
 * requested locale, falling back through the remaining supported locales so
 * a partially-filled value never renders empty (Phase 5).
 */
export function localizedText(value: Json, locale: Locale): string {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ''
  const record = value as Record<string, unknown>
  const order: Locale[] = [
    locale,
    DEFAULT_LOCALE,
    ...SUPPORTED_LOCALES.filter((l) => l !== locale && l !== DEFAULT_LOCALE),
  ]
  for (const lng of order) {
    const text = record[lng]
    if (typeof text === 'string' && text.trim() !== '') return text
  }
  return ''
}

/**
 * Reads a single language from a translatable jsonb column WITHOUT fallback.
 * Used by admin screens that display/search each language explicitly.
 */
export function nameInLocale(value: Json, lang: Locale): string {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ''
  const text = (value as Record<string, unknown>)[lang]
  return typeof text === 'string' ? text : ''
}
