import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { withRetry } from '@/lib/errors'

/**
 * Availability filter feed (final audit, Phase 5/6) — ids of bookable
 * caftans free for a date range, via the public available_caftan_ids() RPC
 * (security definer; returns ids only, same pending/confirmed overlap
 * semantics as the no_overlapping_active_bookings constraint).
 *
 * Inert until BOTH dates form a valid range: `ids` is null (filter off).
 * On error the filter fails open (null) so a network hiccup never empties
 * the catalog — the server-side constraint still protects actual bookings.
 *
 * State is keyed by the date range and derived at render time, so no
 * synchronous setState happens inside the effect (react-hooks v6 rule).
 */
export function useAvailableCaftanIds(startDate: string, endDate: string) {
  const [result, setResult] = useState<{ key: string; ids: string[] | null } | null>(null)

  useEffect(() => {
    const client = supabase
    if (!client || !startDate || !endDate || endDate < startDate) return
    const key = `${startDate}|${endDate}`
    let cancelled = false
    withRetry(() =>
      client.rpc('available_caftan_ids', { p_start: startDate, p_end: endDate }),
    ).then(({ data, error }) => {
      if (cancelled) return
      setResult({
        key,
        ids: error || !Array.isArray(data) ? null : data.map(String), // fail open
      })
    })
    return () => {
      cancelled = true
    }
  }, [startDate, endDate])

  const valid = Boolean(supabase && startDate && endDate && endDate >= startDate)
  const key = `${startDate}|${endDate}`
  const current = result && result.key === key ? result : null
  return {
    ids: valid ? (current?.ids ?? null) : null,
    loading: valid && current === null,
  }
}
