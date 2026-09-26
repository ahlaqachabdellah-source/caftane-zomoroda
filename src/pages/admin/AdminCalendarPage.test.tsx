import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import AdminCalendarPage from './AdminCalendarPage'
import type { AdminOccupancyRow } from '@/types/admin'

const mockUseAdminOccupancy = vi.fn()
const mockUseAdminCaftans = vi.fn()
vi.mock('@/hooks/useAdminOccupancy', () => ({
  useAdminOccupancy: (from: string, to: string) => mockUseAdminOccupancy(from, to),
}))
vi.mock('@/hooks/useAdminCaftans', () => ({
  useAdminCaftans: () => mockUseAdminCaftans(),
}))

const caftan = {
  id: 'caftan-1',
  slug: 'caftan-royal',
  category_id: 'cat-1',
  name: { ar: 'قفطان ملكي', fr: 'Caftan Royal', en: 'Royal Caftan' },
  description: {},
  price_per_day: 800,
  deposit_amount: 2000,
  status: 'available' as const,
  featured: true,
  size: 'M',
  color: 'Vert',
  created_at: '2026-01-01T00:00:00Z',
  category: null,
  images: [],
}

const now = new Date()
const Y = now.getUTCFullYear()
const M = now.getUTCMonth() + 1
const pad = (n: number) => String(n).padStart(2, '0')

const occupancy: AdminOccupancyRow[] = [
  {
    booking_id: 'b-1',
    booking_number: 'CF-2026-0007',
    status: 'confirmed',
    start_date: `${Y}-${pad(M)}-10`,
    end_date: `${Y}-${pad(M)}-14`,
    customer_name: 'Salma Bennani',
    caftan: { id: 'caftan-1', slug: 'caftan-royal', name: caftan.name },
  },
]

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/fr/admin/calendar']}>
      <AdminCalendarPage />
    </MemoryRouter>,
  )
}

describe('AdminCalendarPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(() => i18n.changeLanguage('fr'))
    mockUseAdminCaftans.mockReturnValue({ caftans: [caftan], loading: false, error: null, refetch: vi.fn() })
    mockUseAdminOccupancy.mockReturnValue({ rows: occupancy, loading: false, error: null })
  })

  it('queries the current month range', () => {
    renderPage()
    expect(mockUseAdminOccupancy).toHaveBeenCalledWith(
      `${Y}-${pad(M)}-01`,
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    )
  })

  it('renders the occupancy bar spanning the rental days', () => {
    renderPage()
    const bar = screen.getByRole('link', { name: /CF-2026-0007/ })
    expect(bar).toHaveStyle({ gridColumn: '10 / span 5' })
    expect(screen.getByText('Caftan Royal')).toBeInTheDocument()
  })

  it('navigates months', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Mois suivant' }))
    const next = new Date(Date.UTC(Y, M, 1))
    expect(mockUseAdminOccupancy).toHaveBeenLastCalledWith(
      `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-01`,
      expect.any(String),
    )
  })

  it('shows empty state when nothing is booked', () => {
    mockUseAdminOccupancy.mockReturnValue({ rows: [], loading: false, error: null })
    renderPage()
    expect(screen.getByText('Aucune occupation')).toBeInTheDocument()
  })
})
