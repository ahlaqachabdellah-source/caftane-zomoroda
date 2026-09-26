import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { CaftanFormValues } from '@/lib/validation/admin'
import type { CaftanStatus, LocalizedText } from '@/types/database.types'

/**
 * Caftan write operations (Phase 10). RLS enforces admin-only writes
 * server-side; these helpers only map PostgREST outcomes to translation
 * keys — raw error messages never reach the UI.
 *
 * Error mapping:
 *   23505 (unique)        → slug already taken
 *   23001 / 23503 (FK)    → caftan has bookings: retire instead of delete
 */

export type MutationResult<T = undefined> = {
  ok: boolean
  errorKey: string | null
  data?: T
}

function toPayload(values: CaftanFormValues) {
  const description: Partial<LocalizedText> = {}
  if (values.descriptionAr) description.ar = values.descriptionAr
  if (values.descriptionFr) description.fr = values.descriptionFr
  if (values.descriptionEn) description.en = values.descriptionEn
  return {
    slug: values.slug,
    category_id: values.categoryId,
    name: { ar: values.nameAr, fr: values.nameFr, en: values.nameEn },
    description,
    size: values.size,
    color: values.color,
    price_per_day: Number(values.pricePerDay),
    deposit_amount: Number(values.depositAmount),
    status: values.status,
    featured: values.featured,
  }
}

export function useCaftanMutations() {
  const [saving, setSaving] = useState(false)

  const saveCaftan = useCallback(
    async (values: CaftanFormValues, caftanId?: string): Promise<MutationResult<{ id: string }>> => {
      if (!supabase) return { ok: false, errorKey: 'admin.caftans.error_save' }
      setSaving(true)
      const payload = toPayload(values)
      const query = caftanId
        ? supabase.from('caftans').update(payload).eq('id', caftanId).select('id').single()
        : supabase.from('caftans').insert(payload).select('id').single()
      const { data, error } = await query
      setSaving(false)
      if (error) {
        return {
          ok: false,
          errorKey: error.code === '23505' ? 'admin.caftans.error_slug_taken' : 'admin.caftans.error_save',
        }
      }
      return { ok: true, errorKey: null, data: { id: data.id } }
    },
    [],
  )

  const deleteCaftan = useCallback(async (caftanId: string): Promise<MutationResult> => {
    if (!supabase) return { ok: false, errorKey: 'admin.caftans.error_delete' }
    const { error } = await supabase.from('caftans').delete().eq('id', caftanId)
    if (error) {
      const inUse = error.code === '23001' || error.code === '23503'
      return { ok: false, errorKey: inUse ? 'admin.caftans.error_has_bookings' : 'admin.caftans.error_delete' }
    }
    return { ok: true, errorKey: null }
  }, [])

  /** Quick field updates from the list page (featured star, status). */
  const updateCaftanFields = useCallback(
    async (
      caftanId: string,
      fields: { featured?: boolean; status?: CaftanStatus },
    ): Promise<MutationResult> => {
      if (!supabase) return { ok: false, errorKey: 'admin.caftans.error_save' }
      const { error } = await supabase.from('caftans').update(fields).eq('id', caftanId)
      return error
        ? { ok: false, errorKey: 'admin.caftans.error_save' }
        : { ok: true, errorKey: null }
    },
    [],
  )

  return { saving, saveCaftan, deleteCaftan, updateCaftanFields }
}
