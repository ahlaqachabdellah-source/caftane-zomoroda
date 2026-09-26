import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import type { Profile } from '@/types/database.types'

/**
 * Profile editing (Phase 7). Only full name, phone and WhatsApp number
 * are writable — role and id can never be touched from the client, and
 * RLS additionally restricts the update to the caller's own row.
 */
type UpdateProfileInput = {
  fullName: string
  phone: string
  whatsappNumber: string
}

type UpdateProfileResult = {
  profile: Profile | null
  /** Translation key for display, or null on success */
  errorKey: string | null
}

export function useUpdateProfile() {
  const { session, refreshProfile } = useAuth()
  const [saving, setSaving] = useState(false)

  async function updateProfile(input: UpdateProfileInput): Promise<UpdateProfileResult> {
    if (!supabase || !session) {
      return { profile: null, errorKey: 'account.profile_error' }
    }
    setSaving(true)
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: input.fullName.trim(),
        phone: input.phone.trim() || null,
        whatsapp_number: input.whatsappNumber.trim() || null,
      })
      .eq('id', session.user.id)
      .select()
      .single()
    setSaving(false)

    if (error) {
      return { profile: null, errorKey: 'account.profile_error' }
    }
    // Keep the shared auth state (header greeting etc.) in sync.
    await refreshProfile()
    return { profile: data, errorKey: null }
  }

  return { updateProfile, saving }
}
