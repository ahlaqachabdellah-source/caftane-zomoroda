import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { CatalogCaftan } from '@/lib/caftans'
import type { Category } from '@/types/database.types'

/**
 * Catalog data (Phase 5) — all publicly visible caftans with their
 * category and images, plus the category list for filtering.
 *
 * RLS already hides `retired` caftans from non-admins; the explicit
 * `.neq('status', 'retired')` keeps the public catalog consistent even
 * for admin sessions browsing the storefront.
 */
type UseCaftansResult = {
  caftans: CatalogCaftan[]
  categories: Category[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useCaftans(): UseCaftansResult {
  const [caftans, setCaftans] = useState<CatalogCaftan[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState<boolean>(() => supabase !== null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)

    const [caftansResult, categoriesResult] = await Promise.all([
      supabase
        .from('caftans')
        .select('*, category:categories(*), images:caftan_images(*)')
        .neq('status', 'retired')
        .order('featured', { ascending: false })
        .order('price_per_day', { ascending: true }),
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
    ])

    if (caftansResult.error) {
      setError(caftansResult.error.message)
    } else if (categoriesResult.error) {
      setError(categoriesResult.error.message)
    } else {
      setCaftans((caftansResult.data ?? []) as CatalogCaftan[])
      setCategories(categoriesResult.data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // Deferred so the synchronous setLoading(true) inside load() does not
    // run directly in the effect body (react-hooks/set-state-in-effect).
    const id = setTimeout(() => void load(), 0)
    return () => clearTimeout(id)
  }, [load])

  return { caftans, categories, loading, error, refetch: load }
}
