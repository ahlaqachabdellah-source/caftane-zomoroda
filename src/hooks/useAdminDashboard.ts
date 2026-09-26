import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { AdminActivityEvent, AdminKpis } from '@/types/admin'

/**
 * Admin overview data (Phase 9) — KPIs and the recent-activity feed.
 * Both come from the admin-only SECURITY DEFINER RPCs; a non-admin caller
 * gets SQLSTATE 42501 server-side, so this hook can never leak data to a
 * customer. Errors surface as a translation key, never as raw PostgREST
 * messages.
 */
type UseAdminDashboardResult = {
  kpis: AdminKpis | null
  activity: AdminActivityEvent[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export const ACTIVITY_LIMIT = 10

export function useAdminDashboard(): UseAdminDashboardResult {
  const [kpis, setKpis] = useState<AdminKpis | null>(null)
  const [activity, setActivity] = useState<AdminActivityEvent[]>([])
  const [loading, setLoading] = useState<boolean>(() => supabase !== null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)

    const [kpiResult, activityResult] = await Promise.all([
      supabase.rpc('admin_dashboard_kpis'),
      supabase.rpc('admin_recent_activity', { p_limit: ACTIVITY_LIMIT }),
    ])

    if (kpiResult.error || activityResult.error) {
      setError('admin.load_error')
      setKpis(null)
      setActivity([])
    } else {
      setKpis(kpiResult.data as unknown as AdminKpis)
      setActivity((activityResult.data as unknown as AdminActivityEvent[]) ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // Deferred so the synchronous setLoading(true) inside load() does not
    // run directly in the effect body (react-hooks/set-state-in-effect).
    const id = setTimeout(() => void load(), 0)
    return () => clearTimeout(id)
  }, [load])

  return { kpis, activity, loading, error, refetch: load }
}
