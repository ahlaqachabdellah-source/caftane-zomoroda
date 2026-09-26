import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import AdminBookingDetailPage from './AdminBookingDetailPage'
import type { AdminBookingDetail } from '@/types/admin'

const mockUseAdminBooking = vi.fn()
const mockUpdateStatus = vi.fn()
const mockSaveNotes = vi.fn()
vi.mock('@/hooks/useAdminBooking', () => ({
  useAdminBooking: () => mockUseAdminBooking(),
}))
vi.mock('@/hooks/useAdminBookingActions', () => ({
  useAdminBookingActions: () => ({
    acting: false,
    updateStatus: mockUpdateStatus,
    saveNotes: mockSaveNotes,
  }),
}))

function detail(overrides: Partial<AdminBookingDetail['booking']> = {}): AdminBookingDetail {
  return {
    booking: {
      id: 'b-1',
      booking_number: 'CF-2026-0007',
      customer_id: 'cust-1',
      caftan_id: 'caftan-1',
      start_date: '2030-05-10',
      end_date: '2030-05-12',
      status: 'pending',
      total_price: 2400,
      deposit_status: 'unpaid',
      customer_notes: 'Merci de préparer le caftan la veille.',
      created_at: '2026-09-20T10:00:00Z',
      updated_at: '2026-09-20T10:00:00Z',
      ...overrides,
    },
    customer: {
      id: 'cust-1',
      full_name: 'Salma Bennani',
      phone: '+212611111111',
      whatsapp_number: '+212611111111',
      city: 'Casablanca',
      role: 'customer',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    caftan: {
      id: 'caftan-1',
      slug: 'caftan-royal',
      category_id: 'cat-1',
      name: { ar: 'قفطان ملكي', fr: 'Caftan Royal', en: 'Royal Caftan' },
      description: {},
      price_per_day: 800,
      deposit_amount: 2000,
      status: 'available',
      featured: true,
      size: 'M',
      color: 'Vert',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    history: [
      {
        id: 'h-1',
        booking_id: 'b-1',
        from_status: null,
        to_status: 'pending',
        changed_by: null,
        note: 'Booking created',
        created_at: '2026-09-20T10:00:00Z',
      },
    ],
    admin_notes: 'Dossier VIP',
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/fr/admin/bookings/b-1']}>
      <Routes>
        <Route path="/fr/admin/bookings/:bookingId" element={<AdminBookingDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminBookingDetailPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(() => i18n.changeLanguage('fr'))
    mockUseAdminBooking.mockReturnValue({
      detail: detail(),
      loading: false,
      error: null,
      notFound: false,
      refetch: vi.fn(),
    })
  })

  it('renders booking, customer, caftan, notes and history', () => {
    renderPage()
    expect(screen.getByText('CF-2026-0007')).toBeInTheDocument()
    expect(screen.getByText('Salma Bennani')).toBeInTheDocument()
    expect(screen.getByText('Caftan Royal')).toBeInTheDocument()
    expect(screen.getByText(/préparer le caftan la veille/)).toBeInTheDocument()
    expect(screen.getByDisplayValue('Dossier VIP')).toBeInTheDocument()
    expect(screen.getByText(/400,00/)).toBeInTheDocument()
  })

  it('offers confirm/reject/cancel on a pending booking', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Confirmer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refuser' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Marquer terminée' })).not.toBeInTheDocument()
  })

  it('offers complete/cancel on a confirmed booking', () => {
    mockUseAdminBooking.mockReturnValue({
      detail: detail({ status: 'confirmed' }),
      loading: false, error: null, notFound: false, refetch: vi.fn(),
    })
    renderPage()
    expect(screen.getByRole('button', { name: 'Marquer terminée' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirmer' })).not.toBeInTheDocument()
  })

  it('shows terminal message on a cancelled booking', () => {
    mockUseAdminBooking.mockReturnValue({
      detail: detail({ status: 'cancelled' }),
      loading: false, error: null, notFound: false, refetch: vi.fn(),
    })
    renderPage()
    expect(screen.getByText(/clôturée/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirmer' })).not.toBeInTheDocument()
  })

  it('confirms via dialog and offers the WhatsApp notification', async () => {
    const user = userEvent.setup()
    mockUpdateStatus.mockResolvedValue({ ok: true, errorKey: null })
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Confirmer' }))
    const dialog = screen.getByRole('alertdialog')
    await user.type(dialog.querySelector('#action-note')!, 'Confirmée par téléphone')
    const confirmBtn = Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent === 'Confirmer',
    )!
    await user.click(confirmBtn)
    await waitFor(() =>
      expect(mockUpdateStatus).toHaveBeenCalledWith('b-1', 'confirmed', 'Confirmée par téléphone'),
    )
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /Notifier la cliente/i })
      expect(link).toHaveAttribute('href', expect.stringContaining('wa.me/212611111111'))
    })
  })

  it('shows the server error when a transition is rejected', async () => {
    const user = userEvent.setup()
    mockUpdateStatus.mockResolvedValue({ ok: false, errorKey: 'admin.bookings.error_invalid_transition' })
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Confirmer' }))
    const dialog = screen.getByRole('alertdialog')
    const confirmBtn = Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent === 'Confirmer',
    )!
    await user.click(confirmBtn)
    expect(await screen.findByRole('alert')).toHaveTextContent(/changement de statut/)
  })

  it('saves admin notes', async () => {
    const user = userEvent.setup()
    mockSaveNotes.mockResolvedValue({ ok: true, errorKey: null })
    renderPage()
    const textarea = screen.getByDisplayValue('Dossier VIP')
    await user.clear(textarea)
    await user.type(textarea, 'Clientèle fidèle')
    await user.click(screen.getByRole('button', { name: 'Enregistrer les notes' }))
    await waitFor(() => expect(mockSaveNotes).toHaveBeenCalledWith('b-1', 'Clientèle fidèle'))
    expect(await screen.findByText('Notes enregistrées.')).toBeInTheDocument()
  })

  it('shows not-found state', () => {
    mockUseAdminBooking.mockReturnValue({
      detail: null, loading: false, error: null, notFound: true, refetch: vi.fn(),
    })
    renderPage()
    expect(screen.getByText('Réservation introuvable')).toBeInTheDocument()
  })
})
