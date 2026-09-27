import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { withRetry } from '@/lib/errors'
import type { BookedPeriod } from '@/lib/booking'

/**
 * Occupied date ranges for one caftan (final audit, Phase 6) via the
 * public booked_periods() RPC — date ranges only, never customer data.
 * Powers the booking form's occupied-dates warning; the database
 * exclusion constraint remains the enforcement layer.
 *
 * Fails open (empty list) so a network hiccup never blocks a legitimate
 * request — the server still rejects real conflicts with 23P01.
 *
 * State is keyed by caftan id and derived at render time, so no
 * synchronous setState happens inside the effect (react-hooks v6 rule).
 */
export function useBookedPeriods(caftanId: string | undefined) {
  const [result, setResult] = useState<{ id: string; periods: BookedPeriod[] } | null>(null)

  useEffect(() => {
    const client = supabase
    if (!client || !caftanId) return
    let cancelled = false
    withRetry(() => client.rpc('booked_periods', { p_caftan_id: caftanId })).then(
      ({ data, error }) => {
        if (cancelled) return
        const periods =
          error || !Array.isArray(data)
            ? [] // fail open — see header comment
            : data
                .filter(
                  (p): p is { start_date: string; end_date: string } =>
                    Boolean(p) &&
                    typeof p === 'object' &&
                    typeof (p as BookedPeriod).start_date === 'string' &&
                    typeof (p as BookedPeriod).end_date === 'string',
                )
                .map((p) => ({ start_date: p.start_date, end_date: p.end_date }))
        setResult({ id: caftanId, periods })
      },
    )
    return () => {
      cancelled = true
    }
  }, [caftanId])

  const current = result && result.id === caftanId ? result : null
  return {
    periods: current?.periods ?? [],
    loading: Boolean(supabase && caftanId) && current === null,
  }
}
