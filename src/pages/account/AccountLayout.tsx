import { Outlet, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { LogOut } from 'lucide-react'
import AccountNav from '@/components/account/AccountNav'
import Container from '@/components/layout/Container'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/hooks/useLocale'

/**
 * Authenticated account shell (Phase 7): greeting, sign-out, tab
 * navigation, and the active account page below. The route is wrapped
 * in ProtectedRoute in App.tsx.
 */
export default function AccountLayout() {
  const { profile, signOut } = useAuth()
  const { t } = useTranslation()
  const { localePath } = useLocale()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate(localePath('/'), { replace: true })
  }

  return (
    <main className="flex flex-1 flex-col">
      <Container className="flex flex-1 flex-col gap-8 py-10 sm:py-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {t('account.title')}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile?.full_name
                ? t('account.greeting_named', { name: profile.full_name })
                : t('account.greeting_plain')}
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut aria-hidden="true" />
            {t('account.sign_out')}
          </Button>
        </div>

        <AccountNav />
        <Outlet />
      </Container>
    </main>
  )
}
