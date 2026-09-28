import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import ContactPage from './ContactPage'

const mockUseSiteSettings = vi.fn()
vi.mock('@/hooks/useSiteSettings', () => ({ useSiteSettings: () => mockUseSiteSettings() }))

function withSettings(settings: Record<string, unknown> | null) {
  mockUseSiteSettings.mockReturnValue({ settings, loading: false, error: null })
}

function renderContact() {
  return render(
    <MemoryRouter initialEntries={['/fr/contact']}>
      <ContactPage />
    </MemoryRouter>,
  )
}

describe('ContactPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(() => i18n.changeLanguage('fr'))
    withSettings(null)
  })

  it('renders the localized heading', () => {
    renderContact()
    expect(screen.getByRole('heading', { level: 1, name: 'Contactez-nous' })).toBeInTheDocument()
  })

  it('shows a WhatsApp CTA with the exact prefilled contact message', () => {
    withSettings({ whatsapp_number: '+212 612 345 678' })
    renderContact()
    const link = screen.getByRole('link', { name: /Nous contacter sur WhatsApp/ })
    const href = link.getAttribute('href') ?? ''
    expect(href).toContain('https://wa.me/212612345678?text=')
    expect(href).toContain(encodeURIComponent('Bonjour, je souhaite contacter Caftane Zomoroda.'))
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('hides the WhatsApp CTA when no number is configured', () => {
    withSettings({ whatsapp_number: '' })
    renderContact()
    expect(screen.queryByRole('link', { name: /WhatsApp/ })).not.toBeInTheDocument()
  })

  it('shows real business info when configured', () => {
    withSettings({
      whatsapp_number: '+212612345678',
      address: { fr: 'Quissariat Al Khalil n° 29, Oulad Teima (Houara), Maroc' },
      opening_hours: '10:00–20:00',
      plus_code: '9QVP+M8G',
    })
    renderContact()
    expect(screen.getByText(/Quissariat Al Khalil/)).toBeInTheDocument()
    expect(screen.getByText(/10:00–20:00/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Itinéraire' })).toHaveAttribute(
      'href',
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('9QVP+M8G')}`,
    )
  })

  it('renders fully in Arabic', async () => {
    await act(() => i18n.changeLanguage('ar'))
    withSettings({ whatsapp_number: '+212612345678' })
    renderContact()
    expect(screen.getByRole('heading', { level: 1, name: 'تواصلي معنا' })).toBeInTheDocument()
    const href =
      screen.getByRole('link', { name: /تواصلي معنا عبر واتساب/ }).getAttribute('href') ?? ''
    expect(href).toContain(encodeURIComponent('مرحباً، أودّ التواصل مع قفطان زمردة.'))
    await act(() => i18n.changeLanguage('fr'))
  })
})
