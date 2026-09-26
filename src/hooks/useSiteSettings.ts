import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { mapSupabaseError, withRetry } from '@/lib/errors'
import type { SiteSettings } from '@/types/database.types'

/**
 * Reads the public singleton row of `site_settings` (Phase 4).
 *
 * The row is world-readable by RLS (public marketing contact data), so
 * this works for anonymous visitors. When the backend is not configured
 * yet, `settings` stays null — callers must render their honest fallback
 * (e.g. the footer omits the contact column) rather than fake data.
 */
type UseSiteSettingsResult = {
  settings: SiteSettings | null
  loading: boolean
  error: string | null
}

export function useSiteSettings(): UseSiteSettingsResult {
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [loading, setLoading] = useState<boolean>(() => supabase !== null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    const client = supabase
    let cancelled = false

    withRetry(() => client.from('site_settings').select('*').eq('id', 1).maybeSingle()).then(
      ({ data, error: queryError }) => {
        if (cancelled) return
        if (queryError) {
          setError(mapSupabaseError(queryError, 'errors.generic'))
        } else {
          setSettings(data)
        }
        setLoading(false)
      },
    )

    return () => {
      cancelled = true
    }
  }, [])

  return { settings, loading, error }
}
