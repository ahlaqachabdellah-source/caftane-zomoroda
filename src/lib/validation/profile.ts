import { z } from 'zod'

/**
 * Profile editing schema (Phase 7).
 * Messages are translation KEYS resolved through t() at display time.
 * Phone / WhatsApp are optional but must look like a phone number when
 * provided (same rule as registration).
 */
const phoneField = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s-]{6,15}$/, 'validation.phone_invalid')
  .optional()
  .or(z.literal(''))

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'validation.name_min'),
  phone: phoneField,
  whatsappNumber: phoneField,
})
export type ProfileFormValues = z.infer<typeof profileSchema>
