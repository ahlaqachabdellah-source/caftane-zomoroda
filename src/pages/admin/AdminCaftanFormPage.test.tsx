import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { categoryCaftan, makeCaftan } from '@/test/fixtures'
import AdminCaftanFormPage from './AdminCaftanFormPage'

const mockSaveCaftan = vi.fn()
const mockUseAdminCaftan = vi.fn()
const mockUseAdminCategories = vi.fn()
vi.mock('@/hooks/useAdminCaftan', () => ({
  useAdminCaftan: (id?: string) => mockUseAdminCaftan(id),
}))
vi.mock('@/hooks/useAdminCategories', () => ({
  useAdminCategories: () => mockUseAdminCategories(),
}))
vi.mock('@/hooks/useCaftanMutations', () => ({
  useCaftanMutations: () => ({
    saving: false,
    saveCaftan: mockSaveCaftan,
    deleteCaftan: vi.fn(),
    updateCaftanFields: vi.fn(),
  }),
}))
vi.mock('@/components/admin/CaftanImageManager', () => ({
  default: () => <div data-testid="image-manager" />,
}))

const categories = [categoryCaftan]

function renderPage(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/fr/admin/caftans/new" element={<AdminCaftanFormPage />} />
        <Route path="/fr/admin/caftans/:caftanId/edit" element={<AdminCaftanFormPage />} />
        <Route path="/fr/admin/caftans" element={<div>LIST PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminCaftanFormPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(() => i18n.changeLanguage('fr'))
    mockUseAdminCategories.mockReturnValue({
      categories,
      loading: false,
      error: null,
      refetch: vi.fn(),
      saving: false,
      saveCategory: vi.fn(),
      deleteCategory: vi.fn(),
    })
    mockUseAdminCaftan.mockReturnValue({
      caftan: makeCaftan({ id: 'c-1', slug: 'caftan-andalou-rouge' }),
      categories,
      loading: false,
      error: null,
      notFound: false,
      refetch: vi.fn(),
    })
    mockSaveCaftan.mockResolvedValue({ ok: true, errorKey: null, data: { id: 'new-id' } })
  })

  it('create mode: validates required multilingual fields before submitting', async () => {
    const user = userEvent.setup()
    renderPage('/fr/admin/caftans/new')
    await user.click(screen.getByRole('button', { name: 'Créer le caftan' }))
    expect(mockSaveCaftan).not.toHaveBeenCalled()
    const alerts = await screen.findAllByRole('alert')
    expect(alerts.length).toBeGreaterThanOrEqual(4) // 3 names + slug + price + deposit + category
  })

  it('create mode: submits valid values and navigates to the edit page for images', async () => {
    const user = userEvent.setup()
    renderPage('/fr/admin/caftans/new')

    const fieldsets = screen.getAllByRole('group')
    const [arFieldset, frFieldset, enFieldset] = fieldsets
    await user.type(arFieldset.querySelector('input')!, 'قفطان اختبار')
    await user.type(frFieldset.querySelector('input')!, 'Caftan Test')
    await user.type(enFieldset.querySelector('input')!, 'Test Caftan')
    await user.selectOptions(screen.getByLabelText('Catégorie'), categoryCaftan.id)
    await user.type(screen.getByLabelText(/Prix par jour/), '800')
    await user.type(screen.getByLabelText(/Caution/), '2000')
    await user.type(screen.getByLabelText(/Slug/), 'caftan-test')
    await user.click(screen.getByRole('button', { name: 'Créer le caftan' }))

    await waitFor(() => expect(mockSaveCaftan).toHaveBeenCalled())
    const [values, id] = mockSaveCaftan.mock.calls[0]
    expect(id).toBeUndefined()
    expect(values).toMatchObject({
      slug: 'caftan-test',
      nameAr: 'قفطان اختبار',
      nameFr: 'Caftan Test',
      nameEn: 'Test Caftan',
      categoryId: categoryCaftan.id,
      pricePerDay: '800',
      depositAmount: '2000',
      status: 'available',
      featured: false,
    })
  })

  it('create mode: shows the slug-taken error from the server', async () => {
    mockSaveCaftan.mockResolvedValue({ ok: false, errorKey: 'admin.caftans.error_slug_taken' })
    const user = userEvent.setup()
    renderPage('/fr/admin/caftans/new')
    const fieldsets = screen.getAllByRole('group')
    await user.type(fieldsets[0].querySelector('input')!, 'قفطان')
    await user.type(fieldsets[1].querySelector('input')!, 'Caftan Test')
    await user.type(fieldsets[2].querySelector('input')!, 'Test Caftan')
    await user.selectOptions(screen.getByLabelText('Catégorie'), categoryCaftan.id)
    await user.type(screen.getByLabelText(/Prix par jour/), '800')
    await user.type(screen.getByLabelText(/Caution/), '2000')
    await user.type(screen.getByLabelText(/Slug/), 'caftan-test')
    await user.click(screen.getByRole('button', { name: 'Créer le caftan' }))
    await screen.findByText('Ce slug est déjà utilisé par un autre caftan.')
  })

  it('edit mode: prefills the form, saves changes, shows the image manager', async () => {
    const user = userEvent.setup()
    renderPage('/fr/admin/caftans/c-1/edit')
    await waitFor(() => expect(screen.getByLabelText(/Slug/)).toHaveValue('caftan-andalou-rouge'))
    expect(screen.getByTestId('image-manager')).toBeInTheDocument()

    const priceInput = screen.getByLabelText(/Prix par jour/)
    await user.clear(priceInput)
    await user.type(priceInput, '900')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(mockSaveCaftan).toHaveBeenCalled())
    expect(mockSaveCaftan.mock.calls[0][1]).toBe('c-1')
    expect(mockSaveCaftan.mock.calls[0][0].pricePerDay).toBe('900')
    await screen.findByText('Modifications enregistrées.')
  })

  it('edit mode: shows a friendly not-found state for an unknown id', () => {
    mockUseAdminCaftan.mockReturnValue({
      caftan: null,
      categories,
      loading: false,
      error: null,
      notFound: true,
      refetch: vi.fn(),
    })
    renderPage('/fr/admin/caftans/unknown/edit')
    expect(screen.getByText('Caftan introuvable')).toBeInTheDocument()
  })

  it('edit mode: shows loading then error states', () => {
    mockUseAdminCaftan.mockReturnValue({
      caftan: null,
      categories: [],
      loading: true,
      error: null,
      notFound: false,
      refetch: vi.fn(),
    })
    const { unmount } = renderPage('/fr/admin/caftans/c-1/edit')
    expect(screen.getByRole('status')).toBeInTheDocument()
    unmount()
    mockUseAdminCaftan.mockReturnValue({
      caftan: null,
      categories: [],
      loading: false,
      error: 'admin.caftans.error_load',
      notFound: false,
      refetch: vi.fn(),
    })
    renderPage('/fr/admin/caftans/c-1/edit')
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('create mode: blocks the form when no category exists yet', () => {
    mockUseAdminCategories.mockReturnValue({
      categories: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
      saving: false,
      saveCategory: vi.fn(),
      deleteCategory: vi.fn(),
    })
    renderPage('/fr/admin/caftans/new')
    expect(screen.getByText('Aucune catégorie')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Catégories' })).toHaveAttribute(
      'href',
      '/fr/admin/categories',
    )
  })
})
