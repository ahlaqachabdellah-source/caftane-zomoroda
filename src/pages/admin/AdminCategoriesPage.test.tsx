import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { categoryCaftan, categoryTakchita } from '@/test/fixtures'
import AdminCategoriesPage from './AdminCategoriesPage'

const mockSaveCategory = vi.fn()
const mockDeleteCategory = vi.fn()
const mockRefetch = vi.fn()
const mockUseAdminCategories = vi.fn()
vi.mock('@/hooks/useAdminCategories', () => ({
  useAdminCategories: () => mockUseAdminCategories(),
}))

const categories = [
  { ...categoryCaftan, caftan_count: 5 },
  { ...categoryTakchita, caftan_count: 0 },
]

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/fr/admin/categories']}>
      <AdminCategoriesPage />
    </MemoryRouter>,
  )
}

describe('AdminCategoriesPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(() => i18n.changeLanguage('fr'))
    mockUseAdminCategories.mockReturnValue({
      categories,
      loading: false,
      error: null,
      refetch: mockRefetch,
      saving: false,
      saveCategory: mockSaveCategory,
      deleteCategory: mockDeleteCategory,
    })
    mockSaveCategory.mockResolvedValue({ ok: true, errorKey: null })
    mockDeleteCategory.mockResolvedValue({ ok: true, errorKey: null })
  })

  it('lists categories with names in three languages, slug and caftan count', () => {
    renderPage()
    expect(screen.getByText('Caftan')).toBeInTheDocument()
    expect(screen.getByText('قفطان')).toBeInTheDocument()
    expect(screen.getByText('5 caftans')).toBeInTheDocument()
    expect(screen.getByText('Aucun caftan')).toBeInTheDocument()
    expect(screen.getAllByText(/takchita/).length).toBeGreaterThanOrEqual(1)
  })

  it('creates a category through the dialog', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Nouvelle catégorie' }))
    await user.type(screen.getByLabelText(/Français/), 'Mariage')
    await user.type(screen.getByLabelText(/العربية/), 'زفاف')
    await user.type(screen.getByLabelText(/English/), 'Wedding')
    await user.clear(screen.getByLabelText(/Slug/))
    await user.type(screen.getByLabelText(/Slug/), 'mariage')
    await user.click(screen.getByRole('button', { name: 'Créer la catégorie' }))
    await waitFor(() =>
      expect(mockSaveCategory).toHaveBeenCalledWith(
        { slug: 'mariage', nameAr: 'زفاف', nameFr: 'Mariage', nameEn: 'Wedding', sortOrder: '0' },
        undefined,
      ),
    )
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Catégorie créée'))
  })

  it('edits a category with prefilled values', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getAllByRole('button', { name: 'Modifier' })[0])
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Modifier la catégorie')
    expect(screen.getByLabelText(/Slug/)).toHaveValue('caftan')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(mockSaveCategory).toHaveBeenCalledWith(expect.anything(), 'cat-1'))
  })

  it('blocks dialog submit when a translated name is missing', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Nouvelle catégorie' }))
    await user.click(screen.getByRole('button', { name: 'Créer la catégorie' }))
    expect(mockSaveCategory).not.toHaveBeenCalled()
    expect((await screen.findAllByRole('alert')).length).toBeGreaterThanOrEqual(3)
  })

  it('deletes an unused category after confirmation', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getAllByRole('button', { name: 'Supprimer' })[1])
    const dialog = screen.getByRole('alertdialog')
    const confirm = Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent === 'Supprimer',
    )!
    await user.click(confirm)
    await waitFor(() => expect(mockDeleteCategory).toHaveBeenCalledWith('cat-2'))
  })

  it('shows the in-use message when the DB refuses deletion', async () => {
    mockDeleteCategory.mockResolvedValue({ ok: false, errorKey: 'admin.categories.error_in_use' })
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getAllByRole('button', { name: 'Supprimer' })[0])
    const dialog = screen.getByRole('alertdialog')
    const confirm = Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent === 'Supprimer',
    )!
    await user.click(confirm)
    await screen.findByText(/contient encore des caftans/)
  })

  it('shows loading, error and empty states', async () => {
    mockUseAdminCategories.mockReturnValue({
      categories: [],
      loading: true,
      error: null,
      refetch: mockRefetch,
      saving: false,
      saveCategory: mockSaveCategory,
      deleteCategory: mockDeleteCategory,
    })
    const { unmount } = renderPage()
    expect(screen.getByRole('status')).toBeInTheDocument()
    unmount()

    mockUseAdminCategories.mockReturnValue({
      categories: [],
      loading: false,
      error: 'admin.categories.error_load',
      refetch: mockRefetch,
      saving: false,
      saveCategory: mockSaveCategory,
      deleteCategory: mockDeleteCategory,
    })
    const { unmount: unmount2 } = renderPage()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    unmount2()

    mockUseAdminCategories.mockReturnValue({
      categories: [],
      loading: false,
      error: null,
      refetch: mockRefetch,
      saving: false,
      saveCategory: mockSaveCategory,
      deleteCategory: mockDeleteCategory,
    })
    renderPage()
    expect(screen.getByText('Aucune catégorie')).toBeInTheDocument()
  })
})
