import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Logo from '@/components/brand/Logo'

type ProtectedRouteProps = {
  children: ReactNode
  /** When true, only profiles with role=admin may pass. */
  requireAdmin?: boolean
}

/**
 * Route guard (Phase 2).
 *  - unauthenticated  → redirected to /login, current location preserved
 *    in navigation state so the login page can send the user back
 *  - non-admin on an admin route → explicit access-denied screen
 *  - role enforcement is also done at the database level (RLS), this guard
 *    is only the UX layer
 */
export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { session, isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div
        role="status"
        aria-label="Chargement"
        className="flex flex-1 items-center justify-center py-24"
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <Logo className="h-16 w-auto" />
        <h1 className="text-xl font-semibold text-foreground">Accès réservé</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Cette section est réservée à l'administration de Caftan Zomoroda.
        </p>
        <Link
          to="/"
          className="text-sm font-medium text-foreground underline underline-offset-4"
        >
          Retour à l'accueil
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
