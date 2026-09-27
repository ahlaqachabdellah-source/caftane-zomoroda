import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import AdminOverviewPage from './AdminOverviewPage'
import type { AdminActivityEvent, AdminKpis } from '@/types/admin'

const mockUseAdminDashboard = vi.fn()
vi.mock('@/hooks/useAdminDashboard', () => ({
  useAdminDashboard: () => mockUseAdminDashboard(),
}))

const KPIS: AdminKpis = {
  bookings_this_month: 4,
  pending_count: 2,
  revenue_estimate: 9600,
  revenue_statuses: ['confirmed', 'completed'],
  top_caftans: [
    {
      caftan_id: 'c-1',
      slug: 'caftan-andalou-rouge',
      name: { fr: 'Caftan Andalou Rouge', ar: 'قفطان أندلسي أحمر', en: 'Red Andalusian Caftan' },
      booking_count: 5,
    },
    {
      caftan_id: 'c-2',
      slug: 'takchita-royale-doree',
      name: { fr: 'Takchita Royale Dorée', ar: 'تكشيطة ملكية ذهبية', en: 'Golden Royal Takchita' },
      booking_count: 3,
    },
  ],
  generated_at: '2026-09-27T10:00:00Z',
}

const ACTIVITY: AdminActivityEvent[] = [
  {
    type: 'status_change',
    booking_number: 'CF-2026-0042',
    customer_name: 'Salma Bennis',
    from_status: 'pending',
    to_status: 'confirmed',
    occurred_at: '2026-09-27T09:00:00Z',
  },
  {
    type: 'booking_created',
    booking_number: 'CF-2026-0042',
    customer_name: 'Salma Bennis',
    from_status: null,
    to_status: 'pending',
    occurred_at: '2026-09-26T18:00:00Z',
  },
  {
    type: 'customer_registered',
    booking_number: null,
    customer_name: 'Customer Two',
    from_status: null,
    to_status: null,
    occurred_at: '2026-09-26T10:00:00Z',
  },
]

function hookReturn(overrides: Partial<ReturnType<typeof baseReturn>> = {}) {
  return { ...baseReturn(), ...overrides }
}
function baseReturn(): {
  kpis: AdminKpis | null
  activity: AdminActivityEvent[]
  loading: boolean
  error: string | null
  refetch: () => void
} {
  return {
    kpis: KPIS,
    activity: ACTIVITY,
    loading: false,
    error: null as string | null,
    refetch: vi.fn(),
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/fr/admin']}>
      <AdminOverviewPage />
    </MemoryRouter>,
  )
}

describe('AdminOverviewPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(() => i18n.changeLanguage('fr'))
  })

  it('shows a loading state', () => {
    mockUseAdminDashboard.mockReturnValue(hookReturn({ loading: true, kpis: null, activity: [] }))
    renderPage()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows an error state with retry and never a raw server message', () => {
    const refetch = vi.fn()
    mockUseAdminDashboard.mockReturnValue(
      hookReturn({ error: 'admin.load_error', kpis: null, activity: [], refetch }),
    )
    renderPage()
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(/n'a pas pu être chargé/)
    expect(alert).not.toHaveTextContent(/insufficient_privilege|42501|PostgREST/i)
    screen.getByRole('button', { name: /réessayer/i }).click()
    expect(refetch).toHaveBeenCalled()
  })

  it('renders the KPI cards with formatted real values', () => {
    mockUseAdminDashboard.mockReturnValue(hookReturn())
    renderPage()
    expect(screen.getByText('Réservations ce mois-ci')).toBeInTheDocument()
    expect(screen.getByText('4', { selector: 'dd' })).toBeInTheDocument()
    expect(screen.getByText('Demandes en attente')).toBeInTheDocument()
    expect(screen.getByText('2', { selector: 'dd' })).toBeInTheDocument()
    // Revenue formatted as MAD and the estimate honestly names its statuses
    expect(screen.getByText(/9[ .]600/)).toBeInTheDocument()
    expect(screen.getByText(/Confirmée \+ Terminée/)).toBeInTheDocument()
  })

  it('renders top caftans ranked with localized names and request counts', () => {
    mockUseAdminDashboard.mockReturnValue(hookReturn())
    renderPage()
    expect(screen.getByText('Caftans les plus demandés')).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Caftan Andalou Rouge')
    expect(items[0]).toHaveTextContent('5 demandes')
    expect(items[1]).toHaveTextContent('Takchita Royale Dorée')
    expect(items[1]).toHaveTextContent('3 demandes')
  })

  it('renders the activity feed for all three event types', () => {
    mockUseAdminDashboard.mockReturnValue(hookReturn())
    renderPage()
    expect(screen.getByText(/Nouvelle réservation CF-2026-0042 — Salma Bennis/)).toBeInTheDocument()
    expect(screen.getByText(/CF-2026-0042 : En attente → Confirmée/)).toBeInTheDocument()
    expect(screen.getByText(/Nouvelle cliente inscrite : Customer Two/)).toBeInTheDocument()
  })

  it('stays usable with no bookings yet (empty states, zero KPIs)', () => {
    mockUseAdminDashboard.mockReturnValue(
      hookReturn({
        kpis: {
          ...KPIS,
          bookings_this_month: 0,
          pending_count: 0,
          revenue_estimate: 0,
          top_caftans: [],
        },
        activity: [],
      }),
    )
    renderPage()
    expect(screen.getByText('Aucune réservation pour le moment')).toBeInTheDocument()
    expect(screen.getByText('Aucune activité pour le moment')).toBeInTheDocument()
    expect(screen.getAllByText('0', { selector: 'dd' }).length).toBeGreaterThanOrEqual(2)
  })

  it('localizes in Arabic (RTL names, Arabic messages)', async () => {
    await act(() => i18n.changeLanguage('ar'))
    mockUseAdminDashboard.mockReturnValue(hookReturn())
    renderPage()
    expect(screen.getByText('قفطان أندلسي أحمر')).toBeInTheDocument()
    expect(screen.getByText(/حجز جديد CF-2026-0042/)).toBeInTheDocument()
    expect(screen.getByText('القفاطن الأكثر طلباً')).toBeInTheDocument()
    await act(() => i18n.changeLanguage('fr'))
  })

  it('localizes in English', async () => {
    await act(() => i18n.changeLanguage('en'))
    mockUseAdminDashboard.mockReturnValue(hookReturn())
    renderPage()
    expect(screen.getByText('Bookings this month')).toBeInTheDocument()
    expect(screen.getByText('Red Andalusian Caftan')).toBeInTheDocument()
    expect(screen.getByText(/New customer registered: Customer Two/)).toBeInTheDocument()
    await act(() => i18n.changeLanguage('fr'))
  })
})
