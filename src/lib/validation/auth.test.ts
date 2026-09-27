import { describe, expect, it } from 'vitest'
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from './auth'

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const r = loginSchema.safeParse({ email: 'cliente@example.com', password: 'x' })
    expect(r.success).toBe(true)
  })

  it('rejects an invalid email', () => {
    const r = loginSchema.safeParse({ email: 'pas-un-email', password: 'secret' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0]?.path).toEqual(['email'])
    }
  })

  it('rejects an empty password', () => {
    const r = loginSchema.safeParse({ email: 'cliente@example.com', password: '' })
    expect(r.success).toBe(false)
  })
})

describe('registerSchema', () => {
  const valid = {
    fullName: 'Fatima Zahra',
    email: 'fatima@example.com',
    phone: '+212612345678',
    password: 'motdepasse8',
    confirmPassword: 'motdepasse8',
  }

  it('accepts a complete valid form', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts an empty optional phone', () => {
    expect(registerSchema.safeParse({ ...valid, phone: '' }).success).toBe(true)
  })

  it('rejects a short full name', () => {
    expect(registerSchema.safeParse({ ...valid, fullName: 'F' }).success).toBe(false)
  })

  it('rejects an invalid phone number', () => {
    expect(registerSchema.safeParse({ ...valid, phone: 'abc' }).success).toBe(false)
  })

  it('rejects a password under 8 characters', () => {
    const r = registerSchema.safeParse({
      ...valid,
      password: '1234567',
      confirmPassword: '1234567',
    })
    expect(r.success).toBe(false)
  })

  it('rejects mismatched password confirmation on the confirmPassword field', () => {
    const r = registerSchema.safeParse({ ...valid, confirmPassword: 'autre chose' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0]?.path).toEqual(['confirmPassword'])
    }
  })
})

describe('forgotPasswordSchema', () => {
  it('accepts a valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'a@b.co' }).success).toBe(true)
  })

  it('rejects an invalid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'a@b' }).success).toBe(false)
  })
})

describe('resetPasswordSchema', () => {
  it('accepts matching passwords of 8+ characters', () => {
    const r = resetPasswordSchema.safeParse({
      password: 'nouveaumot1',
      confirmPassword: 'nouveaumot1',
    })
    expect(r.success).toBe(true)
  })

  it('rejects short passwords', () => {
    const r = resetPasswordSchema.safeParse({ password: 'court', confirmPassword: 'court' })
    expect(r.success).toBe(false)
  })

  it('rejects mismatched passwords', () => {
    const r = resetPasswordSchema.safeParse({
      password: 'nouveaumot1',
      confirmPassword: 'nouveaumot2',
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0]?.path).toEqual(['confirmPassword'])
    }
  })
})
