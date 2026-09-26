/**
 * Shared Supabase/Postgres/network error-mapping layer (Phase 12).
 *
 * Every backend failure is reduced to a translation KEY under `errors.*`
 * (resolved with t() at display time). Raw SQL/PostgREST/Auth messages,
 * stack traces and internal details NEVER reach the UI — they are only
 * logged through console.error in development/monitoring paths.
 *
 * SQLSTATE reference used below:
 *   23001 restrict_violation (FK restrict)   23505 unique_violation
 *   23503 foreign_key_violation              23514 check_violation
 *   23P01 exclusion_violation (double-booking guard)
 *   42501 insufficient_privilege (RLS)       P0002 not-found (custom raise)
 *   22023 invalid transition (custom raise)  PGRST116 PostgREST 0 rows
 */

export type AppError = {
  code?: string
  message?: string
  status?: number
}

/** True for temporary failures worth retrying (network, 5xx, rate limit). */
export function isTransientError(error: AppError | null | undefined): boolean {
  if (!error) return false
  const status = error.status ?? 0
  if (status === 429 || status >= 500) return true
  const message = (error.message ?? '').toLowerCase()
  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    message.includes('fetcherror') ||
    message.includes('timeout') ||
    message.includes('econnreset') ||
    message.includes('service unavailable')
  )
}

/**
 * Maps any Supabase/PostgREST/Auth/network error to a safe translation key.
 * `fallbackKey` lets a caller keep a domain-specific generic message.
 */
export function mapSupabaseError(
  error: AppError | null | undefined,
  fallbackKey = 'errors.generic',
): string {
  if (!error) return fallbackKey
  const code = error.code ?? ''
  const message = (error.message ?? '').toLowerCase()
  const status = error.status ?? 0

  // Network / availability first — these have no meaningful SQLSTATE.
  if (isTransientError(error)) {
    return status === 429 ? 'errors.rate_limited' : 'errors.network'
  }

  // Authentication & session.
  if (
    status === 401 ||
    code === '401' ||
    message.includes('invalid jwt') ||
    message.includes('jwt expired') ||
    message.includes('refresh token')
  ) {
    return 'errors.session_expired'
  }

  // Booking conflicts & invalid data.
  if (code === '23P01' || message.includes('no_overlapping_active_bookings')) {
    return 'errors.booking_overlap'
  }
  if (code === '23505') return 'errors.duplicate'
  if (code === '23514' || code === '22P02' || code === '22023') return 'errors.invalid_data'
  if (code === '23503' || code === '23001') return 'errors.restricted'

  // Authorization / RLS.
  if (code === '42501') return 'errors.permission'

  // Not found (custom raise + PostgREST single() with 0 rows).
  if (code === 'P0002' || code === 'PGRST116') return 'errors.not_found'

  return fallbackKey
}

/** Maps a Supabase Auth error message to a safe translation key. */
export function mapAuthError(error: AppError | null | undefined): string {
  if (!error) return 'errors.auth_generic'
  const message = (error.message ?? '').toLowerCase()
  const status = error.status ?? 0

  if (status === 429 || message.includes('rate limit')) return 'errors.rate_limited'
  if (isTransientError(error)) return 'errors.network'
  if (message.includes('invalid login credentials')) return 'errors.auth_invalid_credentials'
  if (message.includes('email not confirmed')) return 'errors.auth_email_not_confirmed'
  if (message.includes('user already registered')) return 'errors.auth_email_taken'
  if (message.includes('password') && message.includes('at least')) {
    return 'errors.auth_password_weak'
  }
  if (message.includes('session') || message.includes('token')) return 'errors.session_expired'
  return 'errors.auth_generic'
}

/**
 * Retries an async operation only for TRANSIENT failures (network, 5xx,
 * rate limit). Validation, authorization, conflict and not-found errors
 * are returned immediately — retrying them would never succeed.
 *
 * Accepts any thenable: Supabase/PostgREST query builders are PromiseLike
 * rather than native Promises. PostgREST ships its own internal retry loop
 * (1s/2s/4s × 3) which would multiply with this one — it is disabled per
 * request via `.retry(false)` when the builder supports it, so THIS layer
 * is the single, fast, controlled retry policy.
 *
 * A THROWN network error (aborted fetch, offline) is classified like a
 * returned one, so a broken connection can never leave a hook stuck in
 * its loading state. The operation must be idempotent (reads, not writes).
 */
export async function withRetry<T extends { error: AppError | null }>(
  operation: () => PromiseLike<T>,
  { retries = 2, baseDelayMs = 400 }: { retries?: number; baseDelayMs?: number } = {},
): Promise<T | { data: null; error: AppError }> {
  const run = async (): Promise<T | { data: null; error: AppError }> => {
    try {
      const builder = operation() as PromiseLike<T> & {
        retry?: (enabled: boolean) => unknown
      }
      if (typeof builder.retry === 'function') builder.retry(false)
      return await builder
    } catch (thrown) {
      return { data: null, error: thrownToAppError(thrown) }
    }
  }
  let result = await run()
  for (let attempt = 0; attempt < retries && isTransientError(result.error); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** attempt))
    result = await run()
  }
  return result
}

/** Normalizes a thrown value into an AppError (used for classification only). */
function thrownToAppError(thrown: unknown): AppError {
  if (thrown && typeof thrown === 'object' && 'message' in thrown) {
    return { message: String((thrown as { message: unknown }).message) }
  }
  return { message: String(thrown) }
}
