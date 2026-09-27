import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { makeImage } from '@/test/fixtures'
import CaftanImageManager from './CaftanImageManager'

const mockUploadImages = vi.fn()
const mockDeleteImage = vi.fn()
const mockPersistOrder = vi.fn()
const mockSetPrimary = vi.fn()
const mockUpdateAltText = vi.fn()
vi.mock('@/hooks/useCaftanImages', () => ({
  useCaftanImages: () => ({
    busy: false,
    uploadImages: mockUploadImages,
    deleteImage: mockDeleteImage,
    persistOrder: mockPersistOrder,
    setPrimary: mockSetPrimary,
    updateAltText: mockUpdateAltText,
  }),
}))

const onChanged = vi.fn()
const images = [makeImage('c-1', 0, true), makeImage('c-1', 1, false), makeImage('c-1', 2, false)]

function renderManager(imageList = images) {
  return render(
    <MemoryRouter>
      <CaftanImageManager caftanId="c-1" images={imageList} onChanged={onChanged} />
    </MemoryRouter>,
  )
}

describe('CaftanImageManager', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(() => i18n.changeLanguage('fr'))
    for (const mock of [
      mockUploadImages,
      mockDeleteImage,
      mockPersistOrder,
      mockSetPrimary,
      mockUpdateAltText,
    ]) {
      mock.mockResolvedValue({ ok: true, errorKey: null })
    }
  })

  it('renders images with the primary badge and correct move-button states', () => {
    renderManager()
    expect(screen.getByText('Principale')).toBeInTheDocument()
    const ups = screen.getAllByRole('button', { name: 'Déplacer vers le haut' })
    const downs = screen.getAllByRole('button', { name: 'Déplacer vers le bas' })
    expect(ups[0]).toBeDisabled()
    expect(downs[2]).toBeDisabled()
    expect(ups[1]).toBeEnabled()
  })

  it('shows the empty state without images', () => {
    renderManager([])
    expect(screen.getByText(/Aucune photo pour le moment/)).toBeInTheDocument()
  })

  it('reorders via the move buttons (index-based id list)', async () => {
    const user = userEvent.setup()
    renderManager()
    await user.click(screen.getAllByRole('button', { name: 'Déplacer vers le haut' })[1])
    await waitFor(() =>
      expect(mockPersistOrder).toHaveBeenCalledWith(['c-1-img-1', 'c-1-img-0', 'c-1-img-2']),
    )
    expect(onChanged).toHaveBeenCalled()
  })

  it('sets the primary image', async () => {
    const user = userEvent.setup()
    renderManager()
    const stars = screen.getAllByRole('button', { name: 'Définir comme image principale' })
    expect(stars[0]).toBeDisabled() // already primary
    await user.click(stars[1])
    await waitFor(() => expect(mockSetPrimary).toHaveBeenCalledWith(images[1]))
  })

  it('deletes an image after confirmation', async () => {
    const user = userEvent.setup()
    renderManager()
    await user.click(screen.getAllByRole('button', { name: 'Supprimer cette image' })[0])
    const dialog = screen.getByRole('alertdialog')
    const confirm = Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent === 'Supprimer',
    )!
    await user.click(confirm)
    await waitFor(() => expect(mockDeleteImage).toHaveBeenCalledWith(images[0]))
  })

  it('edits alt text per locale and saves the draft', async () => {
    const user = userEvent.setup()
    renderManager()
    const altInput = screen.getAllByLabelText('Texte alternatif en français')[0]
    await user.clear(altInput)
    await user.type(altInput, 'Vue de dos')
    await user.click(screen.getAllByRole('button', { name: 'Enregistrer le texte alternatif' })[0])
    await waitFor(() =>
      expect(mockUpdateAltText).toHaveBeenCalledWith('c-1-img-0', { fr: 'Vue de dos' }),
    )
  })

  it('rejects overly long alt text without calling the mutation', async () => {
    const user = userEvent.setup()
    renderManager()
    const altInput = screen.getAllByLabelText('Texte alternatif en français')[0]
    await user.clear(altInput)
    await user.type(altInput, 'x'.repeat(201))
    await user.click(screen.getAllByRole('button', { name: 'Enregistrer le texte alternatif' })[0])
    expect(mockUpdateAltText).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('200')
  })

  it('surfaces the error key when an operation fails', async () => {
    mockPersistOrder.mockResolvedValue({ ok: false, errorKey: 'admin.images.error_reorder' })
    const user = userEvent.setup()
    renderManager()
    await user.click(screen.getAllByRole('button', { name: 'Déplacer vers le bas' })[0])
    await screen.findByRole('alert')
    expect(screen.getByRole('alert')).toHaveTextContent('réordonnancement a échoué')
  })
})
