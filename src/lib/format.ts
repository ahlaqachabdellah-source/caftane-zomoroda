import { LOCALE_META, type Locale } from './locale'

/**
 * Locale-aware formatting helpers (Phase 3) — prices in MAD, dates,
 * numbers. Built on Intl so Arabic gets proper Moroccan conventions.
 */

function intlTag(locale: Locale): string {
  return LOCALE_META[locale].intlTag
}

/** formatPrice(1200, 'fr') → "1 200,00 DH" ; ('ar') → "1.200,00 د.م." */
export function formatPrice(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(intlTag(locale), {
    style: 'currency',
    currency: 'MAD',
  }).format(amount)
}

/** formatDate('2026-03-15', 'ar') → "15 مارس 2026" */
export function formatDate(date: Date | string, locale: Locale): string {
  const d = typeof date === 'string' ? new Date(`${date}T00:00:00`) : date
  return new Intl.DateTimeFormat(intlTag(locale), { dateStyle: 'long' }).format(d)
}

/** formatNumber(12000, 'en') → "12,000" */
export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlTag(locale)).format(value)
}

/** formatDateTime('2026-03-15T14:30:00Z', 'fr') → "15 mars 2026 à 14:30" */
export function formatDateTime(date: Date | string, locale: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(intlTag(locale), {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(d)
}
