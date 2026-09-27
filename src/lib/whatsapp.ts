/**
 * WhatsApp deep links (Phase 8).
 *
 * The business number always comes from the `site_settings` database row
 * (via useSiteSettings) — it is never hardcoded here. This module only
 * normalizes Moroccan numbers and builds wa.me URLs with correctly
 * encoded, already-localized messages.
 */

/**
 * Normalize a Moroccan phone number to the international digit-only form
 * wa.me expects ("212612345678"), accepting "+212 6 12 34 56 78",
 * "00212612345678", "0612-345678" etc. Returns '' when the input does not
 * look like a Moroccan number (national part: 9 digits, prefix 5/6/7).
 */
export function normalizeWhatsappNumber(raw: string | null | undefined): string {
  if (!raw) return ''
  let digits = raw.replace(/[^0-9]/g, '')
  if (digits.startsWith('00212')) digits = digits.slice(2)
  else if (digits.startsWith('0')) digits = `212${digits.slice(1)}`
  return /^212[5-7][0-9]{8}$/.test(digits) ? digits : ''
}

/**
 * Build a wa.me deep link with a URL-encoded prefilled message.
 * Returns '' when the number is missing or invalid, so callers can
 * simply hide the action — no broken links, no technical errors shown.
 */
export function buildWhatsappLink(rawNumber: string | null | undefined, message: string): string {
  const number = normalizeWhatsappNumber(rawNumber)
  if (!number) return ''
  const base = `https://wa.me/${number}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}
