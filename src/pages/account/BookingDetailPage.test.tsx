import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { makeBooking, makeHistoryEntry } from '@/test/fixtures'
import BookingDetailPage from './BookingDetailPage'

const mockUseBookingDetail = vi.fn()
const mockCancelBooking = vi.fn()
vi.mock('@/hooks/useBookingDetail', () => ({
  useBookingDetail: (n?: string) => mockUseBookingDetail(n),
}))
vi.mock('@/hooks/useCancelBooking', () => ({
  useCancelBooking: () => ({ cancelBooking: mockCancelBooking, cancelling: false }),
}))

const booking = makeBooking({
  id: 'b-1',
  booking_number: 'CF-2026-0007',
  start_date: '2030-05-10',
  end_date: '2030-05-12',
  total_price: 2400,
  status: 'pending',
})
const history = [
  makeHistoryEntry('h-1', 'pending', null),
  makeHistoryEntry('h-2', 'confirmed', 'pending'),
]

function renderDetail(number = 'CF-2026-0007') {
  return render(
    <MemoryRouter initialEntries={[`/fr/account/bookings/${number}`]}>
      <Routes>
        <Route path="/fr/account/bookings/:bookingNumber" element={<BookingDetailPage />} />
        <Route path="/fr/account/bookings" element={<div>LISTE</div>} />
        <Route path="/fr/caftans/:slug" element={<div>FICHE</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function loaded(overrides: Record<string, unknown> = {}) {
  mockUseBookingDetail.mockReturnValue({
    booking,
    history,
    loading: false,
    error: null,
    notFound: false,
    refetch: vi.fn(),
    ...overrides,
  })
}

describe('BookingDetailPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(() => i18n.changeLanguage('fr'))
  })

  it('shows loading, error and not-found states', () => {
    mockUseBookingDetail.mockReturnValue({
      booking: null,
      history: [],
      loading: true,
      error: null,
      notFound: false,
      refetch: vi.fn(),
    })
    const { unmount } = renderDetail()
    expect(screen.getByRole('status')).toBeInTheDocument()
    unmount()

    mockUseBookingDetail.mockReturnValue({
      booking: null,
      history: [],
      loading: false,
      error: 'boom',
      notFound: false,
      refetch: vi.fn(),
    })
    const { unmount: unmount2 } = renderDetail()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    unmount2()

    mockUseBookingDetail.mockReturnValue({
      booking: null,
      history: [],
      loading: false,
      error: null,
      notFound: true,
      refetch: vi.fn(),
    })
    renderDetail('CF-2026-9999')
    expect(screen.getByText('Réservation introuvable')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Retour à mes réservations' })).toHaveAttribute(
      'href',
      '/fr/account/bookings',
    )
  })

  it('renders booking number, caftan, dates, breakdown and statuses', () => {
    loaded()
    renderDetail()
    expect(screen.getByRole('heading', { level: 2, name: 'CF-2026-0007' })).toBeInTheDocument()
    expect(screen.getByText('Caftan Test')).toBeInTheDocument()
    expect(screen.getByText(/10 mai 2030/)).toBeInTheDocument()
    expect(screen.getAllByText(/3 jours/).length).toBeGreaterThan(0)
    expect(screen.getByText('2.400,00 MAD')).toBeInTheDocument()
    expect(screen.getByText(/2\.000,00/)).toBeInTheDocument()
    expect(screen.getAllByText('En attente').length).toBeGreaterThan(0)
    expect(screen.getByText('Non payée')).toBeInTheDocument()
    // never exposes internal ids
    expect(screen.queryByText('b-1')).not.toBeInTheDocument()
  })

  it('renders only the transitions that actually happened', () => {
    loaded()
    renderDetail()
    expect(screen.getByText('Demande envoyée')).toBeInTheDocument()
    expect(screen.getByText('Confirmée')).toBeInTheDocument()
    expect(screen.queryByText('Terminée')).not.toBeInTheDocument()
    expect(screen.queryByText('Annulée')).not.toBeInTheDocument()
  })

  it('lets the customer cancel a pending booking via confirmation dialog', async () => {
    const refetch = vi.fn()
    loaded({ refetch })
    mockCancelBooking.mockResolvedValue({
      booking: { ...booking, status: 'cancelled' },
      errorKey: null,
    })
    renderDetail()

    fireEvent.click(screen.getAllByRole('button', { name: 'Annuler cette réservation' })[0])
    fireEvent.click(await screen.findByRole('button', { name: 'Oui, annuler' }))

    expect(await screen.findByText('Votre réservation a été annulée.')).toBeInTheDocument()
    expect(mockCancelBooking).toHaveBeenCalledWith('b-1')
    expect(refetch).toHaveBeenCalled()
  })

  it('shows the friendly message when the booking is no longer pending', async () => {
    loaded()
    mockCancelBooking.mockResolvedValue({ booking: null, errorKey: 'account.cancel_not_allowed' })
    renderDetail()

    fireEvent.click(screen.getAllByRole('button', { name: 'Annuler cette réservation' })[0])
    fireEvent.click(await screen.findByRole('button', { name: 'Oui, annuler' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('ne peut plus être annulée en ligne')
  })

  it('offers no cancellation for non-pending bookings', () => {
    loaded({ booking: { ...booking, status: 'confirmed' } })
    renderDetail()
    expect(
      screen.queryByRole('button', { name: 'Annuler cette réservation' }),
    ).not.toBeInTheDocument()
  })
})
