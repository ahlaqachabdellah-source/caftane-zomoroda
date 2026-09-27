/**
 * Phase 17 — error monitoring (Sentry), prepared but credential-free.
 *
 * The integration is INERT until the operations team sets
 *   VITE_SENTRY_DSN      — project DSN from sentry.io (never committed)
 *   VITE_APP_ENV         — 'production' | 'staging' | … (default 'production')
 *   VITE_APP_VERSION     — release identifier, e.g. the deploy git SHA
 *
 * Design decisions:
 * - @sentry/react is loaded via dynamic import ONLY when a DSN exists, so
 *   the monitoring vendor stays out of the bundle for development and for
 *   any deployment that has not configured Sentry yet.
 * - Privacy: @sentry/react v11 removed the sendDefaultPii option and no
 *   longer attaches any default PII (no IP, no user headers) unless
 *   explicitly enabled. On top of that, beforeSend scrubs emails/phones
 *   from messages and breadcrumbs — customer data is not shipped to a
 *   third party unnecessarily (Phase 13 privacy posture).
 * - Source maps: the build emits HIDDEN source maps (no sourceMappingURL
 *   comment) when VITE_SENTRY_DSN is set at build time; upload them to
 *   Sentry during deploy (see docs/deployment/monitoring.md) and do not
 *   serve them publicly.
 */

export type MonitoringError = {
  error: unknown
  context?: Record<string, unknown>
}

let capture: ((e: MonitoringError) => void) | null = null

/** Called once from main.tsx. No-op unless VITE_SENTRY_DSN is configured. */
export async function initMonitoring(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (!dsn) return
  try {
    const Sentry = await import('@sentry/react')
    Sentry.init({
      dsn,
      environment: (import.meta.env.VITE_APP_ENV as string | undefined) ?? 'production',
      release: import.meta.env.VITE_APP_VERSION as string | undefined,
      // v11 note: sendDefaultPii no longer exists — the SDK sends no
      // default PII at all unless integrations explicitly add it.
      // Auth endpoints and tokens must never leave the browser.
      denyUrls: [/\/auth\/v1\//],
      beforeSend(event) {
        const scrub = (v: unknown): unknown =>
          typeof v === 'string'
            ? v
                .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]')
                .replace(/(?:\+|00)?\d[\d\s-]{7,}\d/g, '[phone]')
            : v
        if (event.exception?.values) {
          for (const ex of event.exception.values) {
            if (ex.value) ex.value = scrub(ex.value) as string
          }
        }
        if (event.breadcrumbs) {
          for (const b of event.breadcrumbs) {
            if (b.message) b.message = scrub(b.message) as string
          }
        }
        // The user id alone is pseudonymous; keep it, drop everything else.
        if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined
        return event
      },
    })
    capture = ({ error, context }) => {
      Sentry.withScope((scope) => {
        if (context) scope.setExtras(context)
        Sentry.captureException(error)
      })
    }
  } catch {
    // Monitoring must never break the application it monitors.
    capture = null
  }
}

/** Report an error to the monitoring backend (no-op when unconfigured). */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  capture?.({ error, context })
}
