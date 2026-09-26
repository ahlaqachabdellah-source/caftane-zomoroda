import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { CatalogCaftan } from '@/lib/caftans'
import { withRetry } from '@/lib/errors'

/**
 * Admin caftan list (Phase 10) — ALL caftans including maintenance and
 * retired (the public catalog hook hides those; admins must see them).
 * RLS already restricts writes to admins; reads of catalog rows are
 * public by design, so no privilege leak here.
 * Search/filter happen client-side in the page: the catalog is small
 * (a boutique collection), so one fetch keeps the UI snappy.
 */
type UseAdminCaftansResult = {
  caftans: CatalogCaftan[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAdminCaftans(): UseAdminCaftansResult {
  const [caftans, setCaftans] = useState<CatalogCaftan[]>([])
  const [loading, setLoading] = useState<boolean>(() => supabase !== null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    const client = supabase
    setLoading(true)
    setError(null)

    const { data, error: queryError } = await withRetry(() => client
      .from('caftans')
      .select('*, category:categories(*), images:caftan_images(*)')
      .order('created_at', { ascending: false }))

    if (queryError) {
      setError('admin.caftans.error_load')
    } else {
      setCaftans((data ?? []) as CatalogCaftan[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // Deferred: keeps the synchronous setLoading(true) out of the effect
    // body (react-hooks/set-state-in-effect).
    const id = setTimeout(() => void load(), 0)
    return () => clearTimeout(id)
  }, [load])

  return { caftans, loading, error, refetch: load }
}
