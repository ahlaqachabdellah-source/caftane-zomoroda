import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import AdminCustomersPage from './AdminCustomersPage'
import AdminCustomerDetailPage from './AdminCustomerDetailPage'
import type { AdminCustomerListItem, AdminCustomerDetail } from '@/types/admin'

const mockUseAdminCustomers = vi.fn()
const mockUseAdminCustomer = vi.fn()
vi.mock('@/hooks/useAdminCustomers', () => ({
  useAdminCustomers: () => mockUseAdminCustomers(),
  useAdminCustomer: (id: string) => mockUseAdminCustomer(id),
}))

const customers: AdminCustomerListItem[] = [
  {
    id: 'c-1', full_name: 'Salma Bennani', phone: '+212611111111',
    whatsapp_number: '+212611111111', city: 'Casablanca',
    created_at: '2026-01-15T00:00:00Z', booking_count: 3,
    last_booking_at: '2026-09-20T10:00:00Z', last_booking_status: 'pending',
  },
  {
    id: 'c-2', full_name: 'Nadia El Fassi', phone: '+212622222222',
    whatsapp_number: null, city: 'Rabat',
    created_at: '2026-03-01T00:00:00Z', booking_count: 0,
    last_booking_at: null, last_booking_status: null,
  },
]

const customerDetail: AdminCustomerDetail = {
  profile: {
    id: 'c-1', full_name: 'Salma Bennani', phone: '+212611111111',
    whatsapp_number: '+212611111111', city: 'Casablanca', role: 'customer',
    created_at: '2026-01-15T00:00:00Z', updated_at: '2026-01-15T00:00:00Z',
  },
  bookings: [
    {
      id: 'b-1', booking_number: 'CF-2026-0007', customer_id: 'c-1', caftan_id: 'caftan-1',
      start_date: '2030-05-10', end_date: '2030-05-12', status: 'confirmed',
      total_price: 2400, deposit_status: 'paid', customer_notes: '',
      created_at: '2026-09-20T10:00:00Z',
      caftan: { id: 'caftan-1', slug: 'caftan-royal', name: { ar: 'ق', fr: 'Caftan Royal', en: 'Royal Caftan' } },
    },
  ],
}

describe('AdminCustomersPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(() => i18n.changeLanguage('fr'))
    mockUseAdminCustomers.mockReturnValue({ customers, loading: false, error: null, refetch: vi.fn() })
  })

  function renderList() {
    return render(
      <MemoryRouter initialEntries={['/fr/admin/customers']}>
        <AdminCustomersPage />
      </MemoryRouter>,
    )
  }

  it('lists customers with contact info, counts and last status', () => {
    renderList()
    expect(screen.getByText('Salma Bennani')).toBeInTheDocument()
    expect(screen.getByText('Nadia El Fassi')).toBeInTheDocument()
    expect(screen.getAllByText('+212611111111').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('3 réservations')).toBeInTheDocument()
    expect(screen.getByText('Aucune réservation')).toBeInTheDocument()
    expect(screen.getByText('En attente')).toBeInTheDocument()
  })

  it('searches by name, phone or city', async () => {
    const user = userEvent.setup()
    renderList()
    await user.type(screen.getByLabelText('Rechercher'), 'rabat')
    expect(screen.queryByText('Salma Bennani')).not.toBeInTheDocument()
    expect(screen.getByText('Nadia El Fassi')).toBeInTheDocument()
  })

  it('shows empty state with no customers', () => {
    mockUseAdminCustomers.mockReturnValue({ customers: [], loading: false, error: null, refetch: vi.fn() })
    renderList()
    expect(screen.getByText('Aucune cliente')).toBeInTheDocument()
  })
})

describe('AdminCustomerDetailPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(() => i18n.changeLanguage('fr'))
    mockUseAdminCustomer.mockReturnValue({ detail: customerDetail, loading: false, error: null, notFound: false })
  })

  function renderDetail() {
    return render(
      <MemoryRouter initialEntries={['/fr/admin/customers/c-1']}>
        <Routes>
          <Route path="/fr/admin/customers/:customerId" element={<AdminCustomerDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('renders profile and booking history', () => {
    renderDetail()
    expect(screen.getByRole('heading', { name: 'Salma Bennani' })).toBeInTheDocument()
    expect(screen.getByText('CF-2026-0007')).toBeInTheDocument()
    expect(screen.getByText('Caftan Royal')).toBeInTheDocument()
    expect(screen.getByText('Confirmée')).toBeInTheDocument()
    expect(screen.getByText(/400,00/)).toBeInTheDocument()
  })

  it('shows empty booking state', () => {
    mockUseAdminCustomer.mockReturnValue({
      detail: { ...customerDetail, bookings: [] },
      loading: false, error: null, notFound: false,
    })
    renderDetail()
    expect(screen.getByText('Aucune location')).toBeInTheDocument()
  })

  it('shows not-found state', () => {
    mockUseAdminCustomer.mockReturnValue({ detail: null, loading: false, error: null, notFound: true })
    renderDetail()
    expect(screen.getByText('Cliente introuvable')).toBeInTheDocument()
  })
})
