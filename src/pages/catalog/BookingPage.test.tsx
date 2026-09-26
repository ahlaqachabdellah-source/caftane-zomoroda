import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { makeCaftan } from '@/test/fixtures'
import type { Booking } from '@/types/database.types'
import BookingPage from './BookingPage'

const mockUseCaftanDetail = vi.fn()
const mockCreateBooking = vi.fn()
const mockUseSiteSettings = vi.fn()
vi.mock('@/hooks/useCaftanDetail', () => ({ useCaftanDetail: (slug?: string) => mockUseCaftanDetail(slug) }))
vi.mock('@/hooks/useCreateBooking', () => ({
  useCreateBooking: () => ({ createBooking: mockCreateBooking, submitting: false }),
}))
vi.mock('@/hooks/useSiteSettings', () => ({ useSiteSettings: () => mockUseSiteSettings() }))

const caftan = makeCaftan({
  id: 'c1',
  slug: 'caftan-andalou-rouge',
  name: { ar: 'قفطان أندلسي أحمر', fr: 'Caftan Andalou Rouge', en: 'Red Andalusian Caftan' },
  price_per_day: 800,
  deposit_amount: 2000,
})

const createdBooking: Booking = {
  id: 'b-1',
  booking_number: 'CF-2026-0042',
  caftan_id: 'c1',
  customer_id: 'user-1',
  start_date: '2030-05-10',
  end_date: '2030-05-12',
  total_price: 2400,
  status: 'pending',
  deposit_status: 'unpaid',
  customer_notes: '',
  rental_period: '[2030-05-10,2030-05-13)',
  created_at: '2026-09-26T10:00:00Z',
  updated_at: '2026-09-26T10:00:00Z',
}

function renderBooking(slug = 'caftan-andalou-rouge') {
  return render(
    <MemoryRouter initialEntries={[`/fr/caftans/${slug}/book`]}>
      <Routes>
        <Route path="/fr/caftans/:slug/book" element={<BookingPage />} />
        <Route path="/fr/caftans/:slug" element={<div>DETAIL</div>} />
        <Route path="/fr/caftans" element={<div>CATALOGUE</div>} />
        <Route path="/fr/account" element={<div>COMPTE</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function fillDates(start = '2030-05-10', end = '2030-05-12') {
  fireEvent.change(screen.getByLabelText(/Date de début/), { target: { value: start } })
  fireEvent.change(screen.getByLabelText(/Date de fin/), { target: { value: end } })
}

describe('BookingPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockUseSiteSettings.mockReturnValue({
      settings: { whatsapp_number: '+212 612 345 678' },
      loading: false,
      error: null,
    })
    await act(() => i18n.changeLanguage('fr'))
  })

  it('shows loading, error and not-found states', () => {
    mockUseCaftanDetail.mockReturnValue({ caftan: null, loading: true, error: null, notFound: false, refetch: vi.fn() })
    const { unmount } = renderBooking()
    expect(screen.getByRole('status')).toBeInTheDocument()
    unmount()

    mockUseCaftanDetail.mockReturnValue({ caftan: null, loading: false, error: 'boom', notFound: false, refetch: vi.fn() })
    const { unmount: unmount2 } = renderBooking()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    unmount2()

    mockUseCaftanDetail.mockReturnValue({ caftan: null, loading: false, error: null, notFound: true, refetch: vi.fn() })
    renderBooking('inconnu')
    expect(screen.getByText('Caftan introuvable')).toBeInTheDocument()
  })

  it('renders the caftan summary and the booking form', () => {
    mockUseCaftanDetail.mockReturnValue({ caftan, loading: false, error: null, notFound: false, refetch: vi.fn() })
    renderBooking()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Caftan Andalou Rouge' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Date de début/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Date de fin/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Envoyer ma demande' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Retour au caftan/ })).toHaveAttribute(
      'href',
      '/fr/caftans/caftan-andalou-rouge',
    )
  })

  it('computes a live estimate from the selected dates', () => {
    mockUseCaftanDetail.mockReturnValue({ caftan, loading: false, error: null, notFound: false, refetch: vi.fn() })
    renderBooking()
    expect(screen.queryByText(/2\.400,00/)).not.toBeInTheDocument()
    fillDates() // 3 days × 800 MAD
    expect(screen.getByText(/3 jours/)).toBeInTheDocument()
    expect(screen.getByText(/2\.400,00/)).toBeInTheDocument()
  })

  it('blocks dates in the past before any server call', async () => {
    mockUseCaftanDetail.mockReturnValue({ caftan, loading: false, error: null, notFound: false, refetch: vi.fn() })
    renderBooking()
    fillDates('2020-01-10', '2020-01-12')
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }))
    expect(await screen.findByText(/ne peut pas être dans le passé/)).toBeInTheDocument()
    expect(mockCreateBooking).not.toHaveBeenCalled()
  })

  it('submits the booking and shows the confirmation with the booking number', async () => {
    mockUseCaftanDetail.mockReturnValue({ caftan, loading: false, error: null, notFound: false, refetch: vi.fn() })
    mockCreateBooking.mockResolvedValue({ booking: createdBooking, errorKey: null })
    renderBooking()
    fillDates()
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }))

    expect(await screen.findByText('CF-2026-0042')).toBeInTheDocument()
    expect(mockCreateBooking).toHaveBeenCalledWith({
      caftanId: 'c1',
      startDate: '2030-05-10',
      endDate: '2030-05-12',
      customerNotes: '',
    })
    expect(screen.getByText(/2\.400,00/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Suivre ma réservation' })).toHaveAttribute(
      'href',
      '/fr/account/bookings/CF-2026-0042',
    )
    // WhatsApp follow-up includes the booking number, number from site_settings
    const wa = screen.getByRole('link', { name: 'Poser une question sur WhatsApp' })
    expect(wa).toHaveAttribute(
      'href',
      expect.stringContaining('https://wa.me/212612345678?text='),
    )
    expect(wa.getAttribute('href')).toContain('CF-2026-0042')
  })

  it('hides the WhatsApp follow-up when the number is not configured', async () => {
    mockUseSiteSettings.mockReturnValue({ settings: { whatsapp_number: '' }, loading: false, error: null })
    mockUseCaftanDetail.mockReturnValue({ caftan, loading: false, error: null, notFound: false, refetch: vi.fn() })
    mockCreateBooking.mockResolvedValue({ booking: createdBooking, errorKey: null })
    renderBooking()
    fillDates()
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }))
    expect(await screen.findByText('CF-2026-0042')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /WhatsApp/ }),
    ).not.toBeInTheDocument()
  })

  it('shows the friendly overlap message when the dates are already taken', async () => {
    mockUseCaftanDetail.mockReturnValue({ caftan, loading: false, error: null, notFound: false, refetch: vi.fn() })
    mockCreateBooking.mockResolvedValue({ booking: null, errorKey: 'booking.error_overlap' })
    renderBooking()
    fillDates()
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/déjà réservé sur cette période/)
    expect(screen.queryByText('CF-2026-0042')).not.toBeInTheDocument()
  })

  it('replaces the form with a notice for maintenance caftans', () => {
    mockUseCaftanDetail.mockReturnValue({
      caftan: { ...caftan, status: 'maintenance' },
      loading: false,
      error: null,
      notFound: false,
      refetch: vi.fn(),
    })
    renderBooking()
    expect(screen.getByRole('note')).toHaveTextContent('actuellement en entretien')
    expect(screen.queryByLabelText(/Date de début/)).not.toBeInTheDocument()
  })
})
