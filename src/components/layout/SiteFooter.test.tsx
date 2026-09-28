import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import SiteFooter from './SiteFooter'

// Backend not configured in the test environment: supabase is null, so the
// footer must render its honest fallback (no contact column, no fake data).
vi.mock('@/lib/supabaseClient', () => ({
  supabase: null,
  isSupabaseConfigured: false,
}))

function renderFooter() {
  return render(
    <MemoryRouter initialEntries={['/fr']}>
      <SiteFooter />
    </MemoryRouter>,
  )
}

describe('SiteFooter', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('fr'))
  })

  it('renders the brand block, navigation and copyright', () => {
    renderFooter()
    expect(screen.getByAltText('Caftan Zomoroda')).toBeInTheDocument()
    expect(screen.getByText('Location de caftans')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Accueil' })).toHaveAttribute('href', '/fr')
    expect(screen.getByText(/© 2026 Caftan Zomoroda/)).toBeInTheDocument()
  })

  it('omits the contact column until the backend provides real data', () => {
    const { container } = renderFooter()
    // No contact data channels until site_settings provides them…
    expect(container.querySelector('a[href^="tel:"]')).not.toBeInTheDocument()
    expect(container.querySelector('a[href^="mailto:"]')).not.toBeInTheDocument()
    expect(container.querySelector('a[href*="wa.me"]')).not.toBeInTheDocument()
    // …the "Contact" nav entry is a real route link, not contact data.
    expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute(
      'href',
      '/fr/contact',
    )
  })

  it('renders Arabic labels when the language is Arabic', async () => {
    await act(() => i18n.changeLanguage('ar'))
    renderFooter()
    expect(screen.getByRole('link', { name: 'الرئيسية' })).toHaveAttribute('href', '/ar')
    await act(() => i18n.changeLanguage('fr'))
  })
})
