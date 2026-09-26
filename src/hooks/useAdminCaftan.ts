import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { CatalogCaftan } from '@/lib/caftans'
import type { Category } from '@/types/database.types'

/**
 * Single caftan for the admin edit form (Phase 10), plus the category
 * list the form's select needs. Addressed by internal id (admin area
 * only — customers never see this). maybeSingle → notFound on 0 rows.
 */
type UseAdminCaftanResult = {
  caftan: CatalogCaftan | null
  categories: Category[]
  loading: boolean
  error: string | null
  notFound: boolean
  refetch: () => void
}

export function useAdminCaftan(caftanId: string | undefined): UseAdminCaftanResult {
  const [caftan, setCaftan] = useState<CatalogCaftan | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState<boolean>(() => supabase !== null && Boolean(caftanId))
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async () => {
    if (!supabase || !caftanId) return
    setLoading(true)
    setError(null)
    setNotFound(false)

    const [caftanResult, categoriesResult] = await Promise.all([
      supabase
        .from('caftans')
        .select('*, category:categories(*), images:caftan_images(*)')
        .eq('id', caftanId)
        .maybeSingle(),
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
    ])

    if (caftanResult.error || categoriesResult.error) {
      setError('admin.caftans.error_load')
    } else if (!caftanResult.data) {
      setNotFound(true)
    } else {
      setCaftan(caftanResult.data as CatalogCaftan)
      setCategories(categoriesResult.data ?? [])
    }
    setLoading(false)
  }, [caftanId])

  useEffect(() => {
    const id = setTimeout(() => void load(), 0)
    return () => clearTimeout(id)
  }, [load])

  return { caftan, categories, loading, error, notFound, refetch: load }
}
