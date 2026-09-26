import { useNavigate } from 'react-router'
import { LogOut } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

/**
 * "My account" shell (Phase 2) — real profile data from the database,
 * sign-out action. Booking history and profile editing arrive in Phase 7.
 */
export default function AccountOverviewPage() {
  const { user, profile, role, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Mon compte
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bonjour{profile?.full_name ? `, ${profile.full_name}` : ''} — bienvenue dans votre
            espace Caftan Zomoroda.
          </p>
        </div>
        <Button variant="outline" onClick={handleSignOut}>
          <LogOut />
          Se déconnecter
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Profil
        </h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Nom complet</dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {profile?.full_name || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Email</dt>
            <dd className="mt-1 text-sm font-medium text-foreground">{user?.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Téléphone / WhatsApp</dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {profile?.phone || profile?.whatsapp_number || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Ville</dt>
            <dd className="mt-1 text-sm font-medium text-foreground">{profile?.city || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Type de compte</dt>
            <dd className="mt-1">
              <Badge variant={role === 'admin' ? 'default' : 'secondary'}>
                {role === 'admin' ? 'Administrateur' : 'Cliente'}
              </Badge>
            </dd>
          </div>
        </dl>
      </div>
    </main>
  )
}
