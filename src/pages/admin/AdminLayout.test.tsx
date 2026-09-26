import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import AdminLayout from './AdminLayout'

const mockSignOut = vi.fn(async () => {})
const defaultAuth = () => ({
  profile: { full_name: 'Test Admin' },
  user: { email: 'admin@test.local' },
  signOut: mockSignOut,
})
const mockUseAuth = vi.fn(defaultAuth)
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }))

vi.mock('@/components/brand/Logo', () => ({
  default: () => <div data-testid="logo" />,
}))

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/fr/admin']}>
      <Routes>
        <Route path="/fr/admin" element={<AdminLayout />}>
          <Route index element={<div>OVERVIEW PAGE</div>} />
        </Route>
        <Route path="/fr/" element={<div>PUBLIC HOME</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminLayout', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockUseAuth.mockImplementation(defaultAuth)
    await act(() => i18n.changeLanguage('fr'))
  })

  it('renders the sidebar nav with the active overview link and the page outlet', () => {
    renderLayout()
    const overviewLinks = screen.getAllByRole('link', { name: /Vue d'ensemble/i })
    expect(overviewLinks.length).toBeGreaterThanOrEqual(1)
    expect(overviewLinks[0]).toHaveAttribute('href', '/fr/admin')
    expect(overviewLinks[0]).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('OVERVIEW PAGE')).toBeInTheDocument()
  })

  it('shows the admin identity, a back-to-site link and a sign-out action', () => {
    renderLayout()
    expect(screen.getAllByText('Test Admin').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('admin@test.local').length).toBeGreaterThanOrEqual(1)
    const siteLinks = screen.getAllByRole('link', { name: /Voir le site/i })
    expect(siteLinks[0]).toHaveAttribute('href', '/fr')
    expect(screen.getAllByRole('button', { name: /Se déconnecter/i }).length).toBeGreaterThanOrEqual(1)
  })

  it('falls back to a neutral label when the profile has no name', () => {
    mockUseAuth.mockReturnValue({
      profile: { full_name: '' },
      user: { email: 'admin@test.local' },
      signOut: mockSignOut,
    } as never)
    renderLayout()
    expect(screen.getAllByText('Administratrice').length).toBeGreaterThanOrEqual(1)
  })

  it('signs out and lands on the public home page', async () => {
    const user = userEvent.setup()
    renderLayout()
    await user.click(screen.getAllByRole('button', { name: /Se déconnecter/i })[0])
    await waitFor(() => expect(mockSignOut).toHaveBeenCalled())
    await screen.findByText('PUBLIC HOME')
  })

  it('opens and closes the mobile drawer', async () => {
    const user = userEvent.setup()
    renderLayout()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Ouvrir le menu/i }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: /Fermer le menu/i })[0])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders Arabic labels (RTL shell)', async () => {
    await act(() => i18n.changeLanguage('ar'))
    renderLayout()
    expect(screen.getAllByRole('link', { name: 'نظرة عامة' }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('عرض الموقع').length).toBeGreaterThanOrEqual(1)
    await act(() => i18n.changeLanguage('fr'))
  })
})
