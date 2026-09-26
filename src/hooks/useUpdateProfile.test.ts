import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { Profile } from '@/types/database.types'

type Outcome = { profile: Profile | null; errorKey: string | null } | undefined
import { useUpdateProfile } from './useUpdateProfile'

const mocks = vi.hoisted(() => {
  const single = vi.fn()
  const select = vi.fn(() => ({ single }))
  const eq = vi.fn(() => ({ select }))
  const update = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ update }))
  const refreshProfile = vi.fn()
  return { single, select, eq, update, from, refreshProfile }
})

vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: mocks.from },
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    session: { user: { id: 'user-1' } },
    refreshProfile: mocks.refreshProfile,
  }),
}))

const updatedProfile: Profile = {
  id: 'user-1',
  full_name: 'Cliente Deluxe',
  phone: '+212600000001',
  whatsapp_number: '+212600000002',
  city: null,
  role: 'customer',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-09-27T10:00:00Z',
}

describe('useUpdateProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.select.mockReturnValue({ single: mocks.single })
    mocks.eq.mockReturnValue({ select: mocks.select })
    mocks.update.mockReturnValue({ eq: mocks.eq })
    mocks.from.mockReturnValue({ update: mocks.update })
  })

  it('persists trimmed values and refreshes the shared auth profile', async () => {
    mocks.single.mockResolvedValue({ data: updatedProfile, error: null })
    const { result } = renderHook(() => useUpdateProfile())

    let outcome: Outcome
    await act(async () => {
      outcome = await result.current.updateProfile({
        fullName: '  Cliente Deluxe  ',
        phone: ' +212600000001 ',
        whatsappNumber: '+212600000002',
      })
    })

    expect(outcome?.profile).toEqual(updatedProfile)
    expect(outcome?.errorKey).toBeNull()
    expect(mocks.update).toHaveBeenCalledWith({
      full_name: 'Cliente Deluxe',
      phone: '+212600000001',
      whatsapp_number: '+212600000002',
    })
    expect(mocks.eq).toHaveBeenCalledWith('id', 'user-1')
    expect(mocks.refreshProfile).toHaveBeenCalledOnce()
    expect(result.current.saving).toBe(false)
  })

  it('stores empty optional numbers as null', async () => {
    mocks.single.mockResolvedValue({ data: updatedProfile, error: null })
    const { result } = renderHook(() => useUpdateProfile())

    await act(async () => {
      await result.current.updateProfile({ fullName: 'Cliente', phone: '', whatsappNumber: '' })
    })

    expect(mocks.update).toHaveBeenCalledWith({
      full_name: 'Cliente',
      phone: null,
      whatsapp_number: null,
    })
  })

  it('returns the friendly error key on failure', async () => {
    mocks.single.mockResolvedValue({ data: null, error: { code: '42501', message: 'denied' } })
    const { result } = renderHook(() => useUpdateProfile())

    let outcome: Outcome
    await act(async () => {
      outcome = await result.current.updateProfile({ fullName: 'X y', phone: '', whatsappNumber: '' })
    })

    expect(outcome?.profile).toBeNull()
    expect(outcome?.errorKey).toBe('account.profile_error')
    expect(mocks.refreshProfile).not.toHaveBeenCalled()
  })
})
