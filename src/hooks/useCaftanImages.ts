import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { CAFTAN_IMAGES_BUCKET } from '@/lib/caftans'
import type { CaftanImage, LocalizedText } from '@/types/database.types'
import type { MutationResult } from './useCaftanMutations'

/**
 * Caftan image management (Phase 10) against the existing
 * `caftan-images` storage bucket + `caftan_images` metadata table.
 *
 * Storage writes are admin-only via the Phase 1 storage RLS policies —
 * a non-admin upload is rejected by Supabase Storage itself. Orphaned
 * storage objects are avoided by deleting the object together with its
 * metadata row.
 */

/** Keep only storage-safe characters in uploaded file names. */
function safeFileName(name: string): string {
  const cleaned = name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')
  return cleaned.replace(/^-+|-+$/g, '') || 'image'
}

export function useCaftanImages(caftanId: string | undefined) {
  const [busy, setBusy] = useState(false)

  const uploadImages = useCallback(
    async (files: File[], existing: CaftanImage[]): Promise<MutationResult> => {
      if (!supabase || !caftanId || files.length === 0) {
        return { ok: false, errorKey: 'admin.images.error_upload' }
      }
      setBusy(true)
      try {
        let nextSort = existing.reduce((max, img) => Math.max(max, img.sort_order), -1) + 1
        const makePrimary = existing.length === 0
        for (const [index, file] of files.entries()) {
          const path = `${caftanId}/${crypto.randomUUID()}-${safeFileName(file.name)}`
          const { error: uploadError } = await supabase.storage
            .from(CAFTAN_IMAGES_BUCKET)
            .upload(path, file, { cacheControl: '3600', upsert: false })
          if (uploadError) return { ok: false, errorKey: 'admin.images.error_upload' }

          const { error: rowError } = await supabase.from('caftan_images').insert({
            caftan_id: caftanId,
            storage_path: path,
            alt_text: {},
            sort_order: nextSort,
            is_primary: makePrimary && index === 0,
          })
          if (rowError) {
            // Roll back the orphaned object so storage stays clean.
            await supabase.storage.from(CAFTAN_IMAGES_BUCKET).remove([path])
            return { ok: false, errorKey: 'admin.images.error_upload' }
          }
          nextSort += 1
        }
        return { ok: true, errorKey: null }
      } finally {
        setBusy(false)
      }
    },
    [caftanId],
  )

  const deleteImage = useCallback(
    async (image: CaftanImage): Promise<MutationResult> => {
      if (!supabase) return { ok: false, errorKey: 'admin.images.error_delete' }
      setBusy(true)
      try {
        const { error: rowError } = await supabase
          .from('caftan_images')
          .delete()
          .eq('id', image.id)
        if (rowError) return { ok: false, errorKey: 'admin.images.error_delete' }
        // Best effort: the row is gone; a failed object delete only leaves
        // an unreachable orphan an admin can clean up later.
        await supabase.storage.from(CAFTAN_IMAGES_BUCKET).remove([image.storage_path])
        return { ok: true, errorKey: null }
      } finally {
        setBusy(false)
      }
    },
    [],
  )

  /** Persist a new visual order: index in `orderedIds` becomes sort_order. */
  const persistOrder = useCallback(
    async (orderedIds: string[]): Promise<MutationResult> => {
      if (!supabase) return { ok: false, errorKey: 'admin.images.error_reorder' }
      setBusy(true)
      try {
        for (const [index, id] of orderedIds.entries()) {
          const { error } = await supabase
            .from('caftan_images')
            .update({ sort_order: index })
            .eq('id', id)
          if (error) return { ok: false, errorKey: 'admin.images.error_reorder' }
        }
        return { ok: true, errorKey: null }
      } finally {
        setBusy(false)
      }
    },
    [],
  )

  const setPrimary = useCallback(
    async (image: CaftanImage): Promise<MutationResult> => {
      if (!supabase) return { ok: false, errorKey: 'admin.images.error_primary' }
      setBusy(true)
      try {
        const { error: clearError } = await supabase
          .from('caftan_images')
          .update({ is_primary: false })
          .eq('caftan_id', image.caftan_id)
        if (clearError) return { ok: false, errorKey: 'admin.images.error_primary' }
        const { error } = await supabase
          .from('caftan_images')
          .update({ is_primary: true })
          .eq('id', image.id)
        if (error) return { ok: false, errorKey: 'admin.images.error_primary' }
        return { ok: true, errorKey: null }
      } finally {
        setBusy(false)
      }
    },
    [],
  )

  const updateAltText = useCallback(
    async (imageId: string, altText: Partial<LocalizedText>): Promise<MutationResult> => {
      if (!supabase) return { ok: false, errorKey: 'admin.images.error_alt' }
      const clean: Partial<LocalizedText> = {}
      for (const [lang, text] of Object.entries(altText)) {
        const trimmed = text?.trim()
        if (trimmed) clean[lang as keyof LocalizedText] = trimmed
      }
      const { error } = await supabase
        .from('caftan_images')
        .update({ alt_text: clean })
        .eq('id', imageId)
      return error
        ? { ok: false, errorKey: 'admin.images.error_alt' }
        : { ok: true, errorKey: null }
    },
    [],
  )

  return { busy, uploadImages, deleteImage, persistOrder, setPrimary, updateAltText }
}
