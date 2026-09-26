import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { categoryCaftan, categoryTakchita, makeCaftan } from '@/test/fixtures'
import CatalogPage from './CatalogPage'

const mockUseCaftans = vi.fn()
vi.mock('@/hooks/useCaftans', () => ({ useCaftans: () => mockUseCaftans() }))

const idle = { loading: false, error: null, refetch: vi.fn() }

const rouge = makeCaftan({
  id: 'c1',
  slug: 'caftan-andalou-rouge',
  name: { ar: 'قفطان أندلسي أحمر', fr: 'Caftan Andalou Rouge', en: 'Red Andalusian Caftan' },
  price_per_day: 800,
  featured: true,
})
const takchita = makeCaftan({
  id: 'c2',
  slug: 'takchita-royale-doree',
  category_id: categoryTakchita.id,
  category: categoryTakchita,
  name: { ar: 'تكشيطة ملكية ذهبية', fr: 'Takchita Royale Dorée', en: 'Golden Royal Takchita' },
  price_per_day: 1200,
})
const mariee = makeCaftan({
  id: 'c3',
  slug: 'caftan-blanc-mariee',
  name: { ar: 'قفطان أبيض للعروس', fr: 'Caftan Blanc Mariée', en: 'Bridal White Caftan' },
  price_per_day: 1800,
  status: 'maintenance',
})

function renderCatalog() {
  return render(
    <MemoryRouter initialEntries={['/fr/caftans']}>
      <CatalogPage />
    </MemoryRouter>,
  )
}

describe('CatalogPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(() => i18n.changeLanguage('fr'))
  })

  it('shows a loading state', () => {
    mockUseCaftans.mockReturnValue({ ...idle, loading: true, caftans: [], categories: [] })
    renderCatalog()
    expect(screen.getByRole('status')).toHaveTextContent('Chargement de la collection')
  })

  it('shows an error state with a working retry', async () => {
    const refetch = vi.fn()
    mockUseCaftans.mockReturnValue({
      loading: false,
      error: 'network failed',
      refetch,
      caftans: [],
      categories: [],
    })
    renderCatalog()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('shows the empty state when nothing matches', () => {
    mockUseCaftans.mockReturnValue({ ...idle, caftans: [], categories: [] })
    renderCatalog()
    expect(screen.getByText('Aucun caftan trouvé')).toBeInTheDocument()
  })

  it('renders cards with localized names, prices and badges', () => {
    mockUseCaftans.mockReturnValue({
      ...idle,
      caftans: [rouge, takchita, mariee],
      categories: [categoryCaftan, categoryTakchita],
    })
    renderCatalog()
    expect(screen.getByText('Caftan Andalou Rouge')).toBeInTheDocument()
    expect(screen.getByText('Takchita Royale Dorée')).toBeInTheDocument()
    expect(screen.getByText(/^800,00/)).toBeInTheDocument()
    expect(screen.getByText('Coup de cœur')).toBeInTheDocument()
    expect(screen.getByText('En entretien')).toBeInTheDocument()
    // Card links to the locale-prefixed detail page
    expect(
      screen.getByRole('link', { name: /Caftan Andalou Rouge/ }),
    ).toHaveAttribute('href', '/fr/caftans/caftan-andalou-rouge')
  })

  it('filters by category', async () => {
    mockUseCaftans.mockReturnValue({
      ...idle,
      caftans: [rouge, takchita],
      categories: [categoryCaftan, categoryTakchita],
    })
    renderCatalog()
    await userEvent.click(screen.getByRole('button', { name: 'Takchita' }))
    expect(screen.queryByText('Caftan Andalou Rouge')).not.toBeInTheDocument()
    expect(screen.getByText('Takchita Royale Dorée')).toBeInTheDocument()
    // Toggle back to all
    await userEvent.click(screen.getByRole('button', { name: 'Tous' }))
    expect(screen.getByText('Caftan Andalou Rouge')).toBeInTheDocument()
  })

  it('searches across translations and colors', async () => {
    mockUseCaftans.mockReturnValue({
      ...idle,
      caftans: [rouge, takchita],
      categories: [categoryCaftan, categoryTakchita],
    })
    renderCatalog()
    await userEvent.type(screen.getByLabelText('Rechercher dans la collection'), 'royale')
    expect(screen.queryByText('Caftan Andalou Rouge')).not.toBeInTheDocument()
    expect(screen.getByText('Takchita Royale Dorée')).toBeInTheDocument()
    // Arabic keyword also matches while browsing in French
    await userEvent.clear(screen.getByLabelText('Rechercher dans la collection'))
    await userEvent.type(screen.getByLabelText('Rechercher dans la collection'), 'أندلسي')
    expect(screen.getByText('Caftan Andalou Rouge')).toBeInTheDocument()
  })

  it('renders Arabic names when the language is Arabic', async () => {
    mockUseCaftans.mockReturnValue({
      ...idle,
      caftans: [rouge],
      categories: [categoryCaftan],
    })
    await act(() => i18n.changeLanguage('ar'))
    renderCatalog()
    expect(screen.getByText('قفطان أندلسي أحمر')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'قفطان' })).toBeInTheDocument()
    await act(() => i18n.changeLanguage('fr'))
  })
})
