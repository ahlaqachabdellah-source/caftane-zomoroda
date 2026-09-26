import { z } from 'zod'

/**
 * Admin catalog validation (Phase 10) — caftan & category forms.
 * Messages are translation KEYS, resolved with t() at display time
 * (same convention as the auth/booking/profile schemas).
 *
 * Prices arrive as strings from text inputs and are validated with a
 * strict decimal pattern before being parsed on submit — this mirrors
 * the DB CHECK constraints (>= 0) without z.coerce pitfalls.
 */

/** Mirrors the DB CHECK: lowercase slug, dashes between segments. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

const slugField = z
  .string()
  .trim()
  .min(1, 'validation.slug_required')
  .regex(SLUG_PATTERN, 'validation.slug_invalid')

const translatedName = (key: string) => z.string().trim().min(2, key)

/** "0", "12", "12.5", "12.50" — never negative, max 2 decimals. */
const moneyField = (requiredKey: string, invalidKey: string) =>
  z
    .string()
    .trim()
    .min(1, requiredKey)
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), invalidKey)

export const caftanFormSchema = z.object({
  slug: slugField,
  nameAr: translatedName('validation.name_ar_required'),
  nameFr: translatedName('validation.name_fr_required'),
  nameEn: translatedName('validation.name_en_required'),
  descriptionAr: z.string().trim().max(2000, 'validation.description_max'),
  descriptionFr: z.string().trim().max(2000, 'validation.description_max'),
  descriptionEn: z.string().trim().max(2000, 'validation.description_max'),
  categoryId: z.string().min(1, 'validation.category_required'),
  pricePerDay: moneyField('validation.price_required', 'validation.price_invalid'),
  depositAmount: moneyField('validation.deposit_required', 'validation.deposit_invalid'),
  size: z.string().trim().max(50, 'validation.size_max'),
  color: z.string().trim().max(50, 'validation.color_max'),
  status: z.enum(['available', 'maintenance', 'retired']),
  featured: z.boolean(),
})

export type CaftanFormValues = z.infer<typeof caftanFormSchema>

export const categoryFormSchema = z.object({
  slug: slugField,
  nameAr: translatedName('validation.name_ar_required'),
  nameFr: translatedName('validation.name_fr_required'),
  nameEn: translatedName('validation.name_en_required'),
  sortOrder: z
    .string()
    .trim()
    .min(1, 'validation.sort_order_required')
    .refine((v) => /^\d+$/.test(v), 'validation.sort_order_invalid'),
})

export type CategoryFormValues = z.infer<typeof categoryFormSchema>

/** Image alt text: optional, one input per locale, capped length. */
export const altTextSchema = z.string().trim().max(200, 'validation.alt_max')
