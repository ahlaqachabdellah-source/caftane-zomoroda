import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { CatalogCaftan } from '@/lib/caftans'

/**
 * Single caftan by slug (Phase 5) — detail page data.
 * `notFound` distinguishes an unknown slug from a real query failure.
 */
type UseCaftanDetailResult = {
  caftan: CatalogCaftan | null
  loading: boolean
  error: string | null
  notFound: boolean
  refetch: () => void
}

export function useCaftanDetail(slug: string | undefined): UseCaftanDetailResult {
  const [caftan, setCaftan] = useState<CatalogCaftan | null>(null)
  const [loading, setLoading] = useState<boolean>(() => supabase !== null)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async () => {
    if (!supabase || !slug) {
      if (!slug) setNotFound(true)
      return
    }
    setLoading(true)
    setError(null)
    setNotFound(false)

    const { data, error: queryError } = await supabase
      .from('caftans')
      .select('*, category:categories(*), images:caftan_images(*)')
      .eq('slug', slug)
      .neq('status', 'retired')
      .maybeSingle()

    if (queryError) {
      setError(queryError.message)
    } else if (!data) {
      setNotFound(true)
    } else {
      setCaftan(data as CatalogCaftan)
    }
    setLoading(false)
  }, [slug])

  useEffect(() => {
    // Deferred so the synchronous setLoading(true) inside load() does not
    // run directly in the effect body (react-hooks/set-state-in-effect).
    const id = setTimeout(() => void load(), 0)
    return () => clearTimeout(id)
  }, [load])

  return { caftan, loading, error, notFound, refetch: load }
}
