import { describe, expect, it } from 'vitest'
import { isTransientError, mapAuthError, mapSupabaseError, withRetry } from './errors'

describe('mapSupabaseError', () => {
  it('maps the double-booking exclusion violation', () => {
    expect(mapSupabaseError({ code: '23P01' })).toBe('errors.booking_overlap')
    expect(mapSupabaseError({ message: 'no_overlapping_active_bookings' })).toBe(
      'errors.booking_overlap',
    )
  })

  it('maps permission/RLS denials', () => {
    expect(mapSupabaseError({ code: '42501' })).toBe('errors.permission')
  })

  it('maps unique/duplicate violations', () => {
    expect(mapSupabaseError({ code: '23505' })).toBe('errors.duplicate')
  })

  it('maps invalid data violations', () => {
    expect(mapSupabaseError({ code: '23514' })).toBe('errors.invalid_data')
    expect(mapSupabaseError({ code: '22P02' })).toBe('errors.invalid_data')
    expect(mapSupabaseError({ code: '22023' })).toBe('errors.invalid_data')
  })

  it('maps foreign-key restrict violations', () => {
    expect(mapSupabaseError({ code: '23503' })).toBe('errors.restricted')
    expect(mapSupabaseError({ code: '23001' })).toBe('errors.restricted')
  })

  it('maps not-found errors', () => {
    expect(mapSupabaseError({ code: 'P0002' })).toBe('errors.not_found')
    expect(mapSupabaseError({ code: 'PGRST116' })).toBe('errors.not_found')
  })

  it('maps expired sessions', () => {
    expect(mapSupabaseError({ status: 401 })).toBe('errors.session_expired')
    expect(mapSupabaseError({ message: 'JWT expired' })).toBe('errors.session_expired')
  })

  it('maps network and availability failures', () => {
    expect(mapSupabaseError({ message: 'Failed to fetch' })).toBe('errors.network')
    expect(mapSupabaseError({ status: 503 })).toBe('errors.network')
    expect(mapSupabaseError({ status: 429 })).toBe('errors.rate_limited')
  })

  it('maps the database booking rate-limit signal without leaking it', () => {
    expect(
      mapSupabaseError({ code: 'P0001', message: 'booking_rate_limited' }),
    ).toBe('errors.rate_limited')
  })

  it('falls back for unknown errors and never echoes the raw message', () => {
    expect(mapSupabaseError({ code: 'XX999', message: 'secret SQL detail' })).toBe('errors.generic')
    expect(mapSupabaseError({ message: 'relation "bookings" does not exist' }, 'booking.error_generic')).toBe(
      'booking.error_generic',
    )
    expect(mapSupabaseError(null)).toBe('errors.generic')
  })
})

describe('mapAuthError', () => {
  it('maps known Supabase Auth failures to keys', () => {
    expect(mapAuthError({ message: 'Invalid login credentials' })).toBe(
      'errors.auth_invalid_credentials',
    )
    expect(mapAuthError({ message: 'Email not confirmed' })).toBe('errors.auth_email_not_confirmed')
    expect(mapAuthError({ message: 'User already registered' })).toBe('errors.auth_email_taken')
    expect(mapAuthError({ message: 'Password should be at least 6 characters' })).toBe(
      'errors.auth_password_weak',
    )
    expect(mapAuthError({ message: 'email rate limit exceeded' })).toBe('errors.rate_limited')
  })

  it('falls back without exposing details', () => {
    expect(mapAuthError({ message: 'some internal auth detail' })).toBe('errors.auth_generic')
    expect(mapAuthError(null)).toBe('errors.auth_generic')
  })
})

describe('isTransientError', () => {
  it('flags network, server and rate-limit failures', () => {
    expect(isTransientError({ message: 'Failed to fetch' })).toBe(true)
    expect(isTransientError({ status: 500 })).toBe(true)
    expect(isTransientError({ status: 429 })).toBe(true)
  })

  it('does not flag validation, permission or conflict errors', () => {
    expect(isTransientError({ code: '42501' })).toBe(false)
    expect(isTransientError({ code: '23505' })).toBe(false)
    expect(isTransientError({ code: '23P01' })).toBe(false)
    expect(isTransientError({ status: 400 })).toBe(false)
    expect(isTransientError(null)).toBe(false)
  })
})

describe('withRetry', () => {
  it('returns immediately on success', async () => {
    let calls = 0
    const result = await withRetry(async () => {
      calls += 1
      return { data: 1, error: null }
    })
    expect(result.data).toBe(1)
    expect(calls).toBe(1)
  })

  it('retries transient failures until success', async () => {
    let calls = 0
    const result = await withRetry(
      async () => {
        calls += 1
        return calls < 3
          ? { data: null, error: { message: 'Failed to fetch' } }
          : { data: 7, error: null }
      },
      { baseDelayMs: 1 },
    )
    expect(result.data).toBe(7)
    expect(calls).toBe(3)
  })

  it('never retries non-transient errors', async () => {
    let calls = 0
    const result = await withRetry(
      async () => {
        calls += 1
        return { data: null, error: { code: '42501' } }
      },
      { baseDelayMs: 1 },
    )
    expect(result.error?.code).toBe('42501')
    expect(calls).toBe(1)
  })

  it('gives up after the retry budget', async () => {
    let calls = 0
    const result = await withRetry(
      async () => {
        calls += 1
        return { data: null, error: { status: 503 } }
      },
      { retries: 2, baseDelayMs: 1 },
    )
    expect(result.error?.status).toBe(503)
    expect(calls).toBe(3)
  })
})

describe('withRetry with thrown network errors', () => {
  it('classifies a thrown fetch failure as transient and returns an error result', async () => {
    let calls = 0
    const result = await withRetry(
      async () => {
        calls += 1
        throw new TypeError('Failed to fetch')
      },
      { baseDelayMs: 1 },
    )
    expect(result.error?.message).toContain('Failed to fetch')
    expect(calls).toBe(3)
  })

  it('recovers when a later attempt succeeds', async () => {
    let calls = 0
    const result = await withRetry(
      async () => {
        calls += 1
        if (calls === 1) throw new TypeError('Failed to fetch')
        return { data: 5, error: null }
      },
      { baseDelayMs: 1 },
    )
    expect(result.data).toBe(5)
    expect(calls).toBe(2)
  })
})
