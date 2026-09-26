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
    renderFooter()
    expect(screen.queryByText('Contact')).not.toBeInTheDocument()
  })

  it('renders Arabic labels when the language is Arabic', async () => {
    await act(() => i18n.changeLanguage('ar'))
    renderFooter()
    expect(screen.getByRole('link', { name: 'الرئيسية' })).toHaveAttribute('href', '/ar')
    await act(() => i18n.changeLanguage('fr'))
  })
})
