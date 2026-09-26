import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { makeCaftan, makeImage } from '@/test/fixtures'
import CaftanDetailPage from './CaftanDetailPage'

const mockUseCaftanDetail = vi.fn()
const mockUseSiteSettings = vi.fn()
const mockUseAuth = vi.fn()
vi.mock('@/hooks/useCaftanDetail', () => ({ useCaftanDetail: (slug?: string) => mockUseCaftanDetail(slug) }))
vi.mock('@/hooks/useSiteSettings', () => ({ useSiteSettings: () => mockUseSiteSettings() }))
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

const noSettings = { settings: null, loading: false, error: null }

const caftan = makeCaftan({
  id: 'c1',
  slug: 'caftan-andalou-rouge',
  name: { ar: 'قفطان أندلسي أحمر', fr: 'Caftan Andalou Rouge', en: 'Red Andalusian Caftan' },
  description: { ar: 'وصف القفطان', fr: 'Broderie main raffinée et fils dorés.', en: 'Hand embroidery.' },
  price_per_day: 800,
  deposit_amount: 2000,
  size: 'M',
  color: 'Rouge',
  images: [makeImage('c1', 1, true), makeImage('c1', 2, false)],
})

/** Shows where the login page would send the user back to. */
function LoginProbe() {
  const location = useLocation()
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? 'aucun'
  return <div>CONNEXION puis {from}</div>
}

function renderDetail(slug = 'caftan-andalou-rouge') {
  return render(
    <MemoryRouter initialEntries={[`/fr/caftans/${slug}`]}>
      <Routes>
        <Route path="/fr/caftans/:slug" element={<CaftanDetailPage />} />
        <Route path="/fr/caftans" element={<div>CATALOGUE</div>} />
        <Route path="/fr/login" element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CaftanDetailPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue(anonymousAuth)
    mockUseSiteSettings.mockReturnValue(noSettings)
    await act(() => i18n.changeLanguage('fr'))
  })

  it('shows loading, error and not-found states', () => {
    mockUseCaftanDetail.mockReturnValue({ caftan: null, loading: true, error: null, notFound: false, refetch: vi.fn() })
    const { unmount } = renderDetail()
    expect(screen.getByRole('status')).toBeInTheDocument()
    unmount()

    mockUseCaftanDetail.mockReturnValue({ caftan: null, loading: false, error: 'boom', notFound: false, refetch: vi.fn() })
    const { unmount: unmount2 } = renderDetail()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    unmount2()

    mockUseCaftanDetail.mockReturnValue({ caftan: null, loading: false, error: null, notFound: true, refetch: vi.fn() })
    renderDetail('inconnu')
    expect(screen.getByText('Caftan introuvable')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Retour à la collection' })).toHaveAttribute('href', '/fr/caftans')
  })

  it('renders localized details, prices and practical info', () => {
    mockUseCaftanDetail.mockReturnValue({ caftan, loading: false, error: null, notFound: false, refetch: vi.fn() })
    renderDetail()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Caftan Andalou Rouge' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Broderie main raffinée et fils dorés.')).toBeInTheDocument()
    expect(screen.getByText(/800,00/)).toBeInTheDocument()
    expect(screen.getByText(/2\.000,00/)).toBeInTheDocument()
    expect(screen.getByText(/Taille/)).toHaveTextContent('Taille: M')
    expect(screen.getByText(/Couleur/)).toHaveTextContent('Couleur: Rouge')
    // Two gallery thumbnails
    expect(screen.getAllByRole('button', { name: 'Photo' })).toHaveLength(2)
  })

  it('offers sign-in to anonymous visitors when WhatsApp is not configured', async () => {
    mockUseCaftanDetail.mockReturnValue({ caftan, loading: false, error: null, notFound: false, refetch: vi.fn() })
    renderDetail()
    expect(
      screen.getByRole('link', { name: 'Connectez-vous pour réserver' }),
    ).toHaveAttribute('href', '/fr/login')
    expect(screen.getByRole('link', { name: 'Créez-le en une minute' })).toHaveAttribute(
      'href',
      '/fr/register',
    )
    // The login link carries the return location so the customer lands
    // back on this caftan after signing in.
    fireEvent.click(screen.getByRole('link', { name: 'Connectez-vous pour réserver' }))
    expect(await screen.findByText('CONNEXION puis /fr/caftans/caftan-andalou-rouge')).toBeInTheDocument()
  })

  it('links signed-in customers to the real booking page', () => {
    mockUseAuth.mockReturnValue({
      ...anonymousAuth,
      session: { user: { id: 'user-1' } },
      user: { id: 'user-1' },
    })
    mockUseCaftanDetail.mockReturnValue({ caftan, loading: false, error: null, notFound: false, refetch: vi.fn() })
    renderDetail()
    expect(screen.getByRole('link', { name: 'Réserver ce caftan' })).toHaveAttribute(
      'href',
      '/fr/caftans/caftan-andalou-rouge/book',
    )
    expect(
      screen.queryByRole('link', { name: 'Connectez-vous pour réserver' }),
    ).not.toBeInTheDocument()
  })

  it('offers a pre-filled WhatsApp inquiry when the number is configured', () => {
    mockUseSiteSettings.mockReturnValue({
      settings: { whatsapp_number: '+212 612 345 678' },
      loading: false,
      error: null,
    })
    mockUseCaftanDetail.mockReturnValue({ caftan, loading: false, error: null, notFound: false, refetch: vi.fn() })
    renderDetail()
    const link = screen.getByRole('link', { name: /demander sur WhatsApp/i })
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('https://wa.me/212612345678?text='),
    )
    expect(link.getAttribute('href')).toContain(encodeURIComponent('« Caftan Andalou Rouge »'))
  })

  it('shows an honest notice instead of a CTA for maintenance caftans', () => {
    mockUseCaftanDetail.mockReturnValue({
      caftan: { ...caftan, status: 'maintenance' },
      loading: false,
      error: null,
      notFound: false,
      refetch: vi.fn(),
    })
    renderDetail()
    expect(screen.getByRole('note')).toHaveTextContent('actuellement en entretien')
    expect(screen.queryByRole('link', { name: /WhatsApp/ })).not.toBeInTheDocument()
  })

  it('renders Arabic content when the language is Arabic', async () => {
    mockUseCaftanDetail.mockReturnValue({ caftan, loading: false, error: null, notFound: false, refetch: vi.fn() })
    await act(() => i18n.changeLanguage('ar'))
    renderDetail()
    expect(
      screen.getByRole('heading', { level: 1, name: 'قفطان أندلسي أحمر' }),
    ).toBeInTheDocument()
    expect(screen.getByText('وصف القفطان')).toBeInTheDocument()
    await act(() => i18n.changeLanguage('fr'))
  })
})
