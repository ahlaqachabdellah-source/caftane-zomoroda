import { z } from 'zod'

/**
 * Shared validation schemas for all authentication forms.
 * Messages are translation KEYS (validated against src/i18n/locales/*)
 * and resolved through t() at display time.
 */

export const loginSchema = z.object({
  email: z.email('validation.email_invalid'),
  password: z.string().min(1, 'validation.password_required'),
})
export type LoginFormValues = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'validation.name_min'),
    email: z.email('validation.email_invalid'),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9\s-]{6,15}$/, 'validation.phone_invalid')
      .optional()
      .or(z.literal('')),
    password: z.string().min(8, 'validation.password_min'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'validation.password_mismatch',
    path: ['confirmPassword'],
  })
export type RegisterFormValues = z.infer<typeof registerSchema>

export const forgotPasswordSchema = z.object({
  email: z.email('validation.email_invalid'),
})
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'validation.password_min'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'validation.password_mismatch',
    path: ['confirmPassword'],
  })
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>
