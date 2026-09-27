import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { CategoryFormValues } from '@/lib/validation/admin'
import type { Category } from '@/types/database.types'
import type { MutationResult } from './useCaftanMutations'
import { withRetry } from '@/lib/errors'

/**
 * Admin category management (Phase 10). The list embeds the caftan count
 * per category so the UI can warn before deleting one that is in use
 * (the DB still blocks it with 23001 via ON DELETE RESTRICT).
 */
export type AdminCategory = Category & { caftan_count: number }

type UseAdminCategoriesResult = {
  categories: AdminCategory[]
  loading: boolean
  error: string | null
  refetch: () => void
  saving: boolean
  saveCategory: (values: CategoryFormValues, categoryId?: string) => Promise<MutationResult>
  deleteCategory: (categoryId: string) => Promise<MutationResult>
}

type CategoryRowWithCount = Category & { caftans: { count: number }[] }

export function useAdminCategories(): UseAdminCategoriesResult {
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [loading, setLoading] = useState<boolean>(() => supabase !== null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!supabase) return
    const client = supabase
    setLoading(true)
    setError(null)
    const { data, error: queryError } = await withRetry(() =>
      client
        .from('categories')
        .select('*, caftans(count)')
        .order('sort_order', { ascending: true }),
    )
    if (queryError) {
      setError('admin.categories.error_load')
    } else {
      setCategories(
        ((data ?? []) as unknown as CategoryRowWithCount[]).map(({ caftans, ...row }) => ({
          ...row,
          caftan_count: caftans[0]?.count ?? 0,
        })),
      )
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const id = setTimeout(() => void load(), 0)
    return () => clearTimeout(id)
  }, [load])

  const saveCategory = useCallback(
    async (values: CategoryFormValues, categoryId?: string): Promise<MutationResult> => {
      if (!supabase) return { ok: false, errorKey: 'admin.categories.error_save' }
      setSaving(true)
      const payload = {
        slug: values.slug,
        name: { ar: values.nameAr, fr: values.nameFr, en: values.nameEn },
        sort_order: Number(values.sortOrder),
      }
      const { error } = categoryId
        ? await supabase.from('categories').update(payload).eq('id', categoryId)
        : await supabase.from('categories').insert(payload)
      setSaving(false)
      if (error) {
        return {
          ok: false,
          errorKey:
            error.code === '23505'
              ? 'admin.categories.error_slug_taken'
              : 'admin.categories.error_save',
        }
      }
      return { ok: true, errorKey: null }
    },
    [],
  )

  const deleteCategory = useCallback(async (categoryId: string): Promise<MutationResult> => {
    if (!supabase) return { ok: false, errorKey: 'admin.categories.error_delete' }
    const { error } = await supabase.from('categories').delete().eq('id', categoryId)
    if (error) {
      const inUse = error.code === '23001' || error.code === '23503'
      return {
        ok: false,
        errorKey: inUse ? 'admin.categories.error_in_use' : 'admin.categories.error_delete',
      }
    }
    return { ok: true, errorKey: null }
  }, [])

  return { categories, loading, error, refetch: load, saving, saveCategory, deleteCategory }
}
