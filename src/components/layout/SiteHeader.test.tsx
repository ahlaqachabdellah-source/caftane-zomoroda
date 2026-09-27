import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import SiteHeader from './SiteHeader'

const mockUseAuth = vi.fn()
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }))

const anonymousAuth = {
  session: null,
  user: null,
  profile: null,
  role: null,
  isAdmin: false,
  loading: false,
  configured: true,
  signIn: vi.fn(),
  signUp: vi.fn(),
  sendPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
  signOut: vi.fn(),
}

function renderHeader() {
  return render(
    <MemoryRouter initialEntries={['/fr']}>
      <SiteHeader />
    </MemoryRouter>,
  )
}

describe('SiteHeader', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue(anonymousAuth)
    await act(() => i18n.changeLanguage('fr'))
  })

  it('renders the official logo with the home aria label', () => {
    renderHeader()
    expect(screen.getByRole('link', { name: 'Caftan Zomoroda — accueil' })).toHaveAttribute(
      'href',
      '/fr',
    )
    expect(screen.getAllByAltText('Caftan Zomoroda').length).toBeGreaterThan(0)
  })

  it('shows the primary navigation and login entry point (locale-prefixed)', () => {
    renderHeader()
    expect(screen.getByRole('navigation', { name: 'Navigation principale' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Accueil' })).toHaveAttribute('href', '/fr')
    expect(screen.getByRole('link', { name: 'Connexion' })).toHaveAttribute('href', '/fr/login')
    // Language switcher is present
    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0)
  })

  it('shows the account link when signed in', () => {
    mockUseAuth.mockReturnValue({
      ...anonymousAuth,
      session: { user: { id: 'u1' } },
      role: 'customer',
    })
    renderHeader()
    expect(screen.getByRole('link', { name: 'Mon compte' })).toHaveAttribute('href', '/fr/account')
  })

  it('opens and closes the mobile menu', async () => {
    renderHeader()
    const toggle = screen.getByRole('button', { name: 'Ouvrir le menu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(screen.getByRole('navigation', { name: 'Navigation mobile' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fermer le menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('renders Arabic labels when the language is Arabic', async () => {
    await act(() => i18n.changeLanguage('ar'))
    renderHeader()
    expect(screen.getByRole('link', { name: 'الرئيسية' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'تسجيل الدخول' })).toHaveAttribute('href', '/ar/login')
    await act(() => i18n.changeLanguage('fr'))
  })
})
