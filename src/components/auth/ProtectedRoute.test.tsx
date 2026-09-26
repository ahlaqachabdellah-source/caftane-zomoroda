import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import ProtectedRoute from './ProtectedRoute'

// The auth hook is mocked per test: we verify the guard's routing logic,
// not Supabase (covered by the Phase 1 RLS suite).
const mockUseAuth = vi.fn()
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }))

const baseAuth = {
  session: null,
  user: null,
  profile: null,
  role: null,
  isAdmin: false,
  loading: false,
  configured: true,
  signIn: vi.fn(),
  signUp: vi.fn(),
  sendPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
  signOut: vi.fn(),
}

const customerSession = { user: { id: 'u1' } } as unknown as Session
const adminAuth = {
  ...baseAuth,
  session: customerSession,
  role: 'admin' as const,
  isAdmin: true,
}
const customerAuth = { ...baseAuth, session: customerSession, role: 'customer' as const }

function renderGuard(requireAdmin = false) {
  return render(
    <MemoryRouter initialEntries={['/account']}>
      <Routes>
        <Route
          path="/account"
          element={
            <ProtectedRoute requireAdmin={requireAdmin}>
              <div>ZONE PROTÉGÉE</div>
            </ProtectedRoute>
          }
        />
        <Route path="/fr/login" element={<div>PAGE CONNEXION</div>} />
        <Route path="/" element={<div>ACCUEIL</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows a loading indicator while the session is being resolved', () => {
    mockUseAuth.mockReturnValue({ ...baseAuth, loading: true })
    renderGuard()
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('ZONE PROTÉGÉE')).not.toBeInTheDocument()
  })

  it('redirects unauthenticated visitors to /login', () => {
    mockUseAuth.mockReturnValue(baseAuth)
    renderGuard()
    expect(screen.getByText('PAGE CONNEXION')).toBeInTheDocument()
    expect(screen.queryByText('ZONE PROTÉGÉE')).not.toBeInTheDocument()
  })

  it('lets an authenticated customer through a customer route', () => {
    mockUseAuth.mockReturnValue(customerAuth)
    renderGuard()
    expect(screen.getByText('ZONE PROTÉGÉE')).toBeInTheDocument()
  })

  it('blocks a non-admin from an admin route with an explicit message', () => {
    mockUseAuth.mockReturnValue(customerAuth)
    renderGuard(true)
    expect(screen.getByText('Accès réservé')).toBeInTheDocument()
    expect(screen.queryByText('ZONE PROTÉGÉE')).not.toBeInTheDocument()
  })

  it('lets an admin through an admin route', () => {
    mockUseAuth.mockReturnValue(adminAuth)
    renderGuard(true)
    expect(screen.getByText('ZONE PROTÉGÉE')).toBeInTheDocument()
  })
})
