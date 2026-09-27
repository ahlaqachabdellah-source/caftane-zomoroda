import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { categoryCaftan, categoryTakchita, makeCaftan } from '@/test/fixtures'
import AdminCaftansPage from './AdminCaftansPage'

const mockUseAdminCaftans = vi.fn()
const mockUseAdminCategories = vi.fn()
const mockDeleteCaftan = vi.fn()
const mockUpdateCaftanFields = vi.fn()
vi.mock('@/hooks/useAdminCaftans', () => ({ useAdminCaftans: () => mockUseAdminCaftans() }))
vi.mock('@/hooks/useAdminCategories', () => ({
  useAdminCategories: () => mockUseAdminCategories(),
}))
vi.mock('@/hooks/useCaftanMutations', () => ({
  useCaftanMutations: () => ({
    deleteCaftan: mockDeleteCaftan,
    updateCaftanFields: mockUpdateCaftanFields,
    saveCaftan: vi.fn(),
    saving: false,
  }),
}))

const caftans = [
  makeCaftan({ id: 'c-1', slug: 'caftan-andalou-rouge', featured: true, status: 'available' }),
  makeCaftan({
    id: 'c-2',
    slug: 'takchita-royale',
    status: 'maintenance',
    category_id: categoryTakchita.id,
    category: categoryTakchita,
    name: { ar: 'تكشيطة ملكية', fr: 'Takchita Royale', en: 'Royal Takchita' },
  }),
  makeCaftan({ id: 'c-3', slug: 'jellaba-saumon', status: 'retired' }),
]

const refetch = vi.fn()

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/fr/admin/caftans']}>
      <AdminCaftansPage />
    </MemoryRouter>,
  )
}

describe('AdminCaftansPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(() => i18n.changeLanguage('fr'))
    mockUseAdminCaftans.mockReturnValue({ caftans, loading: false, error: null, refetch })
    mockUseAdminCategories.mockReturnValue({
      categories: [categoryCaftan, categoryTakchita],
      loading: false,
      error: null,
      refetch: vi.fn(),
      saving: false,
      saveCategory: vi.fn(),
      deleteCategory: vi.fn(),
    })
    mockDeleteCaftan.mockResolvedValue({ ok: true, errorKey: null })
    mockUpdateCaftanFields.mockResolvedValue({ ok: true, errorKey: null })
  })

  it('shows loading and error states', () => {
    mockUseAdminCaftans.mockReturnValue({ caftans: [], loading: true, error: null, refetch })
    const { unmount } = renderPage()
    expect(screen.getByRole('status')).toBeInTheDocument()
    unmount()

    mockUseAdminCaftans.mockReturnValue({
      caftans: [],
      loading: false,
      error: 'admin.caftans.error_load',
      refetch,
    })
    renderPage()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('lists all caftans including maintenance and retired, with badges and prices', () => {
    renderPage()
    expect(screen.getAllByText('Caftan Test')).toHaveLength(2) // c-1 + c-3 share the fixture name
    expect(screen.getByText('Takchita Royale')).toBeInTheDocument()
    // status labels appear both as filter options and as row badges
    expect(screen.getAllByText('Disponible').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('En entretien').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Retiré').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText(/800/).length).toBeGreaterThanOrEqual(3)
  })

  it('filters by search term across slug and translated names', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Rechercher'), 'takchita')
    expect(screen.queryAllByText('Caftan Test')).toHaveLength(0)
    expect(screen.getByText('Takchita Royale')).toBeInTheDocument()
  })

  it('filters by status', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.selectOptions(screen.getByLabelText('Statut'), 'retired')
    expect(screen.queryByText('Takchita Royale')).not.toBeInTheDocument()
    expect(screen.getAllByText('Caftan Test')).toHaveLength(1) // only c-3 (retired)
  })

  it('shows the filtered empty state when nothing matches', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Rechercher'), 'zzzz')
    expect(screen.getByText('Aucun résultat')).toBeInTheDocument()
  })

  it('toggles featured from the list', async () => {
    const user = userEvent.setup()
    renderPage()
    const stars = screen.getAllByRole('button', { name: 'Mettre en avant' })
    expect(stars[0]).toHaveAttribute('aria-pressed', 'true')
    await user.click(stars[1])
    expect(mockUpdateCaftanFields).toHaveBeenCalledWith('c-2', { featured: true })
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('mis en avant'))
  })

  it('deletes a caftan after confirmation', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getAllByRole('button', { name: 'Supprimer' })[0])
    const dialog = screen.getByRole('alertdialog')
    const confirm = Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent === 'Supprimer',
    )!
    await user.click(confirm)
    await waitFor(() => expect(mockDeleteCaftan).toHaveBeenCalledWith('c-1'))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('supprimé'))
  })

  it('offers retiring instead when the DB reports existing bookings', async () => {
    mockDeleteCaftan.mockResolvedValue({ ok: false, errorKey: 'admin.caftans.error_has_bookings' })
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getAllByRole('button', { name: 'Supprimer' })[0])
    const dialog = screen.getByRole('alertdialog')
    const confirm = Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent === 'Supprimer',
    )!
    await user.click(confirm)
    await screen.findByText(/lié à des réservations/)
    await user.click(screen.getByRole('button', { name: 'Retirer du catalogue' }))
    await waitFor(() =>
      expect(mockUpdateCaftanFields).toHaveBeenCalledWith('c-1', { status: 'retired' }),
    )
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('retiré du catalogue'))
  })

  it('shows the true empty state with a create CTA when the catalog is empty', () => {
    mockUseAdminCaftans.mockReturnValue({ caftans: [], loading: false, error: null, refetch })
    renderPage()
    expect(screen.getByText('Aucun caftan pour le moment')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Nouveau caftan' }).length).toBeGreaterThanOrEqual(1)
  })

  it('renders Arabic labels', async () => {
    await act(() => i18n.changeLanguage('ar'))
    renderPage()
    expect(screen.getByText('القفاطن')).toBeInTheDocument()
    expect(screen.getAllByText('متوفر').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('تكشيطة ملكية')).toBeInTheDocument()
    await act(() => i18n.changeLanguage('fr'))
  })
})
