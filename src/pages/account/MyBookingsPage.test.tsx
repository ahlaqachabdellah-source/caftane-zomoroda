import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { makeBooking } from '@/test/fixtures'
import MyBookingsPage from './MyBookingsPage'
import DashboardPage from './DashboardPage'

const mockUseMyBookings = vi.fn()
vi.mock('@/hooks/useMyBookings', () => ({
  useMyBookings: () => mockUseMyBookings(),
}))

function renderPage(path: string, component: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/fr/account/bookings" element={component} />
        <Route path="/fr/account" element={component} />
        <Route path="/fr/caftans" element={<div>COLLECTION</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

const bookings = [
  makeBooking({ id: 'b-1', booking_number: 'CF-2026-0007' }),
  makeBooking({ id: 'b-2', booking_number: 'CF-2026-0008', status: 'confirmed' }),
]

describe('MyBookingsPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(() => i18n.changeLanguage('fr'))
  })

  it('shows loading and error states', () => {
    mockUseMyBookings.mockReturnValue({
      bookings: [],
      loading: true,
      error: null,
      refetch: vi.fn(),
    })
    const { unmount } = renderPage('/fr/account/bookings', <MyBookingsPage />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    unmount()

    mockUseMyBookings.mockReturnValue({
      bookings: [],
      loading: false,
      error: 'boom',
      refetch: vi.fn(),
    })
    renderPage('/fr/account/bookings', <MyBookingsPage />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('shows a friendly empty state with a catalog CTA', () => {
    mockUseMyBookings.mockReturnValue({
      bookings: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    })
    renderPage('/fr/account/bookings', <MyBookingsPage />)
    expect(screen.getByText('Aucune réservation pour le moment')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Découvrir la collection' })).toHaveAttribute(
      'href',
      '/fr/caftans',
    )
  })

  it('lists bookings with number, caftan, dates, price and status', () => {
    mockUseMyBookings.mockReturnValue({ bookings, loading: false, error: null, refetch: vi.fn() })
    renderPage('/fr/account/bookings', <MyBookingsPage />)
    expect(screen.getByText('CF-2026-0007')).toBeInTheDocument()
    expect(screen.getByText('CF-2026-0008')).toBeInTheDocument()
    expect(screen.getAllByText('Caftan Test')).toHaveLength(2)
    expect(screen.getAllByText(/10 mai 2030/)).toHaveLength(2)
    expect(screen.getAllByText('2.400,00 MAD')).toHaveLength(2)
    expect(screen.getAllByText('En attente')).toHaveLength(1)
    expect(screen.getAllByText('Confirmée')).toHaveLength(1)
    // cards link to the detail page by public booking number
    const links = screen.getAllByRole('link')
    expect(links.map((l) => l.getAttribute('href'))).toContain('/fr/account/bookings/CF-2026-0007')
  })
})

describe('DashboardPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(() => i18n.changeLanguage('fr'))
  })

  it('shows real stats computed from the customer bookings', () => {
    mockUseMyBookings.mockReturnValue({
      bookings: [
        ...bookings,
        makeBooking({ id: 'b-3', booking_number: 'CF-2026-0009', status: 'cancelled' }),
      ],
      loading: false,
      error: null,
      refetch: vi.fn(),
    })
    renderPage('/fr/account', <DashboardPage />)
    // 3 total, 1 pending, 1 upcoming (confirmed, future dates)
    expect(screen.getByText('Réservations')).toBeInTheDocument()
    // "En attente" appears both as stat label and as a booking badge
    expect(screen.getAllByText('En attente').length).toBeGreaterThan(0)
    expect(screen.getByText('À venir')).toBeInTheDocument()
    const values = screen.getAllByText(/^[0-9]$/)
    expect(values.map((v) => v.textContent)).toEqual(['3', '1', '1'])
    expect(screen.getByText('Réservations récentes')).toBeInTheDocument()
    expect(screen.getByText('CF-2026-0007')).toBeInTheDocument()
  })

  it('shows the empty state without stats errors when there are no bookings', () => {
    mockUseMyBookings.mockReturnValue({
      bookings: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    })
    renderPage('/fr/account', <DashboardPage />)
    expect(screen.getByText('Aucune réservation pour le moment')).toBeInTheDocument()
  })
})
