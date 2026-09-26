import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import AccountLayout from './AccountLayout'

const mockSignOut = vi.fn(async () => {})
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    profile: { full_name: 'Cliente Test' },
    signOut: mockSignOut,
  }),
}))

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/fr/account']}>
      <Routes>
        <Route path="/fr/account" element={<AccountLayout />}>
          <Route index element={<div>TABLEAU</div>} />
        </Route>
        <Route path="/fr" element={<div>ACCUEIL</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AccountLayout', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(() => i18n.changeLanguage('fr'))
  })

  it('renders the greeting, the three tabs and the active page', () => {
    renderLayout()
    expect(screen.getByRole('heading', { level: 1, name: 'Mon compte' })).toBeInTheDocument()
    expect(screen.getByText(/Bonjour Cliente Test/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Aperçu' })).toHaveAttribute('href', '/fr/account')
    expect(screen.getByRole('link', { name: 'Mes réservations' })).toHaveAttribute(
      'href',
      '/fr/account/bookings',
    )
    expect(screen.getByRole('link', { name: 'Mon profil' })).toHaveAttribute(
      'href',
      '/fr/account/profile',
    )
    expect(screen.getByText('TABLEAU')).toBeInTheDocument()
  })

  it('signs out and returns to the home page', async () => {
    renderLayout()
    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }))
    expect(mockSignOut).toHaveBeenCalledOnce()
    expect(await screen.findByText('ACCUEIL')).toBeInTheDocument()
  })
})
