import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import Home from './Home'

const mockUseSiteSettings = vi.fn()
vi.mock('@/hooks/useSiteSettings', () => ({ useSiteSettings: () => mockUseSiteSettings() }))

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/fr']}>
      <Home />
    </MemoryRouter>,
  )
}

describe('Home', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockUseSiteSettings.mockReturnValue({ settings: null, loading: false, error: null })
    await act(() => i18n.changeLanguage('fr'))
  })

  it('renders the hero with real CTAs only', () => {
    renderHome()
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: "L'élégance du caftan, pour vos plus beaux moments",
      }),
    ).toBeInTheDocument()
    // Primary contact CTA → WhatsApp deep link (when a number is
    // configured), catalog → real route, register → real /register route
    expect(screen.getByRole('link', { name: 'Créer un compte' })).toHaveAttribute(
      'href',
      '/fr/register',
    )
    expect(screen.getByRole('link', { name: 'Découvrir la collection' })).toHaveAttribute(
      'href',
      '/fr/caftans',
    )
    // Without a configured WhatsApp number the CTA is hidden, never broken
    expect(screen.queryByRole('link', { name: /WhatsApp/ })).not.toBeInTheDocument()
  })

  it('renders the WhatsApp hero CTA with the exact prefilled message', () => {
    mockUseSiteSettings.mockReturnValue({
      settings: { whatsapp_number: '+212 612 345 678' },
      loading: false,
      error: null,
    })
    renderHome()
    const links = screen.getAllByRole('link', { name: /Discuter sur WhatsApp/ })
    expect(links.length).toBeGreaterThanOrEqual(1)
    const href = links[0].getAttribute('href') ?? ''
    expect(href).toContain('https://wa.me/212612345678?text=')
    expect(href).toContain(
      encodeURIComponent(
        'Bonjour, je souhaite avoir plus d’informations sur la location de caftans.',
      ),
    )
    expect(links[0]).toHaveAttribute('target', '_blank')
    expect(links[0]).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('renders the Google Maps location button with the exact URL in a new tab', () => {
    renderHome()
    const link = screen.getByRole('link', { name: /Ouvrir dans Google Maps/ })
    expect(link).toHaveAttribute('href', 'https://maps.app.goo.gl/HBVGMER7b4Uor8neA')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('renders the three rental steps and the anchor target', () => {
    const { container } = renderHome()
    expect(container.querySelector('#how-it-works')).toBeInTheDocument()
    expect(screen.getByText('Choisissez votre caftan')).toBeInTheDocument()
    expect(screen.getByText('Réservez vos dates')).toBeInTheDocument()
    expect(screen.getByText('Brillez le jour J')).toBeInTheDocument()
  })

  it('renders the values band and final CTA', () => {
    renderHome()
    expect(screen.getByText('Pièces authentiques')).toBeInTheDocument()
    expect(screen.getByText('Entretien expert')).toBeInTheDocument()
    expect(screen.getByText('Accompagnement direct')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Prête pour votre prochaine occasion ?' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Créer mon compte' })).toHaveAttribute(
      'href',
      '/fr/register',
    )
  })

  it('renders fully in Arabic with locale-prefixed links', async () => {
    await act(() => i18n.changeLanguage('ar'))
    renderHome()
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'أناقة القفطان المغربي لأجمل لحظاتك',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'إنشاء حساب' })).toHaveAttribute('href', '/ar/register')
    await act(() => i18n.changeLanguage('fr'))
  })
})
