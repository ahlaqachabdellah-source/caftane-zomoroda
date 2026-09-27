import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import AdminBookingsPage from './AdminBookingsPage'
import type { AdminBookingListItem } from '@/types/admin'

const mockUseAdminBookings = vi.fn()
vi.mock('@/hooks/useAdminBookings', () => ({
  useAdminBookings: () => mockUseAdminBookings(),
}))

const CAFTAN_A = {
  id: 'caftan-1',
  slug: 'caftan-royal',
  name: { ar: 'قفطان ملكي', fr: 'Caftan Royal', en: 'Royal Caftan' },
}
const CAFTAN_B = {
  id: 'caftan-2',
  slug: 'takchita-perles',
  name: { ar: 'تكشيطة', fr: 'Takchita Perles', en: 'Pearl Takchita' },
}

function row(overrides: Partial<AdminBookingListItem>): AdminBookingListItem {
  return {
    id: 'b-x',
    booking_number: 'CF-2026-0001',
    customer_id: 'cust-1',
    caftan_id: CAFTAN_A.id,
    start_date: '2030-05-10',
    end_date: '2030-05-12',
    status: 'pending',
    total_price: 2400,
    deposit_status: 'unpaid',
    customer_notes: '',
    created_at: '2026-09-20T10:00:00Z',
    customer: {
      id: 'cust-1',
      full_name: 'Salma Bennani',
      phone: '+212611111111',
      whatsapp_number: null,
      city: 'Casablanca',
    },
    caftan: CAFTAN_A,
    ...overrides,
  }
}

const bookings: AdminBookingListItem[] = [
  row({
    id: 'b-1',
    booking_number: 'CF-2026-0001',
    status: 'pending',
    start_date: '2030-05-10',
    end_date: '2030-05-12',
  }),
  row({
    id: 'b-2',
    booking_number: 'CF-2026-0002',
    status: 'confirmed',
    deposit_status: 'paid',
    start_date: '2030-06-01',
    end_date: '2030-06-03',
    customer: {
      id: 'cust-2',
      full_name: 'Nadia El Fassi',
      phone: null,
      whatsapp_number: '+212622222222',
      city: null,
    },
    caftan_id: CAFTAN_B.id,
    caftan: CAFTAN_B,
  }),
  row({
    id: 'b-3',
    booking_number: 'CF-2026-0003',
    status: 'cancelled',
    start_date: '2030-07-05',
    end_date: '2030-07-06',
  }),
]

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/fr/admin/bookings']}>
      <AdminBookingsPage />
    </MemoryRouter>,
  )
}

describe('AdminBookingsPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(() => i18n.changeLanguage('fr'))
    mockUseAdminBookings.mockReturnValue({
      bookings,
      loading: false,
      error: null,
      refetch: vi.fn(),
    })
  })

  it('lists bookings with numbers, customers, statuses, prices and dates', () => {
    renderPage()
    expect(screen.getByText('CF-2026-0001')).toBeInTheDocument()
    expect(screen.getByText('CF-2026-0002')).toBeInTheDocument()
    // Salma has two bookings in the fixture
    expect(screen.getAllByText('Salma Bennani').length).toBe(2)
    expect(screen.getByText('Nadia El Fassi')).toBeInTheDocument()
    expect(screen.getAllByText('En attente').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Confirmée').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/400,00/).length).toBeGreaterThanOrEqual(1)
  })

  it('filters by status', async () => {
    const user = userEvent.setup()
    renderPage()
    const statusSelect = screen.getByLabelText('Statut')
    await user.selectOptions(statusSelect, 'confirmed')
    expect(screen.queryByText('CF-2026-0001')).not.toBeInTheDocument()
    expect(screen.getByText('CF-2026-0002')).toBeInTheDocument()
    expect(screen.queryByText('CF-2026-0003')).not.toBeInTheDocument()
  })

  it('filters by caftan', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.selectOptions(screen.getByLabelText('Caftan'), CAFTAN_B.id)
    expect(screen.queryByText('CF-2026-0001')).not.toBeInTheDocument()
    expect(screen.getByText('CF-2026-0002')).toBeInTheDocument()
  })

  it('filters by date range (overlap)', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Du'), '2030-06-01')
    await user.type(screen.getByLabelText('Au'), '2030-06-30')
    expect(screen.queryByText('CF-2026-0001')).not.toBeInTheDocument()
    expect(screen.getByText('CF-2026-0002')).toBeInTheDocument()
    expect(screen.queryByText('CF-2026-0003')).not.toBeInTheDocument()
  })

  it('searches by booking number and customer name', async () => {
    const user = userEvent.setup()
    renderPage()
    const input = screen.getByLabelText('Rechercher')
    await user.type(input, 'nadia')
    expect(screen.queryByText('CF-2026-0001')).not.toBeInTheDocument()
    expect(screen.getByText('CF-2026-0002')).toBeInTheDocument()
    await user.clear(input)
    await user.type(input, 'CF-2026-0003')
    expect(screen.getByText('CF-2026-0003')).toBeInTheDocument()
    expect(screen.queryByText('CF-2026-0002')).not.toBeInTheDocument()
  })

  it('shows empty state when there are no bookings', () => {
    mockUseAdminBookings.mockReturnValue({
      bookings: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    })
    renderPage()
    expect(screen.getByText('Aucune réservation')).toBeInTheDocument()
  })

  it('shows error state on failure', () => {
    mockUseAdminBookings.mockReturnValue({
      bookings: [],
      loading: false,
      error: 'admin.bookings.error_load',
      refetch: vi.fn(),
    })
    renderPage()
    expect(screen.getByText(/Impossible de charger les réservations/)).toBeInTheDocument()
  })
})
