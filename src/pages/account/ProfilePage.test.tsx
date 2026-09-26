import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import type { Profile } from '@/types/database.types'
import ProfilePage from './ProfilePage'

const mockUpdateProfile = vi.fn()
vi.mock('@/hooks/useUpdateProfile', () => ({
  useUpdateProfile: () => ({ updateProfile: mockUpdateProfile, saving: false }),
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'cliente@example.com' },
    profile,
  }),
}))

const profile: Profile = {
  id: 'user-1',
  full_name: 'Cliente Test',
  phone: '+212600000001',
  whatsapp_number: '+212600000002',
  city: 'Casablanca',
  role: 'customer',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function renderProfile() {
  return render(
    <MemoryRouter initialEntries={['/fr/account/profile']}>
      <ProfilePage />
    </MemoryRouter>,
  )
}

describe('ProfilePage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(() => i18n.changeLanguage('fr'))
  })

  it('prefills the form with the current profile and shows email read-only', async () => {
    renderProfile()
    expect(await screen.findByDisplayValue('Cliente Test')).toBeInTheDocument()
    expect(screen.getByDisplayValue('+212600000001')).toBeInTheDocument()
    expect(screen.getByDisplayValue('+212600000002')).toBeInTheDocument()
    expect(screen.getByText('cliente@example.com')).toBeInTheDocument()
    expect(screen.queryByLabelText(/Email/)).not.toBeInTheDocument()
  })

  it('blocks invalid input client-side without calling the backend', async () => {
    renderProfile()
    const name = await screen.findByDisplayValue('Cliente Test')
    fireEvent.change(name, { target: { value: 'X' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByText(/2 caractères minimum/)).toBeInTheDocument()
    expect(mockUpdateProfile).not.toHaveBeenCalled()
  })

  it('saves valid changes and shows the localized success message', async () => {
    mockUpdateProfile.mockResolvedValue({ profile, errorKey: null })
    renderProfile()
    const whatsapp = await screen.findByDisplayValue('+212600000002')
    fireEvent.change(whatsapp, { target: { value: '+212699999999' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByText('Votre profil a été mis à jour.')).toBeInTheDocument()
    expect(mockUpdateProfile).toHaveBeenCalledWith({
      fullName: 'Cliente Test',
      phone: '+212600000001',
      whatsappNumber: '+212699999999',
    })
  })

  it('surfaces a friendly alert when the update fails', async () => {
    mockUpdateProfile.mockResolvedValue({ profile: null, errorKey: 'account.profile_error' })
    renderProfile()
    fireEvent.click(await screen.findByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('La mise à jour a échoué')
  })
})
