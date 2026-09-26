import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { LogOut } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/hooks/useLocale'

/**
 * "My account" shell (Phase 2) — real profile data from the database,
 * sign-out action. Booking history and profile editing arrive in Phase 7.
 */
export default function AccountOverviewPage() {
  const { user, profile, role, signOut } = useAuth()
  const { t } = useTranslation()
  const { localePath } = useLocale()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate(localePath('/'), { replace: true })
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t('account.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile?.full_name
              ? t('account.greeting_named', { name: profile.full_name })
              : t('account.greeting_plain')}
          </p>
        </div>
        <Button variant="outline" onClick={handleSignOut}>
          <LogOut />
          {t('account.sign_out')}
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground rtl:tracking-normal">
          {t('account.profile_section')}
        </h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">{t('account.name_label')}</dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {profile?.full_name || t('account.not_provided')}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t('account.email_label')}</dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {user?.email ?? t('account.not_provided')}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t('account.phone_label')}</dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {profile?.phone || profile?.whatsapp_number || t('account.not_provided')}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t('account.city_label')}</dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {profile?.city || t('account.not_provided')}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t('account.role_label')}</dt>
            <dd className="mt-1">
              <Badge variant={role === 'admin' ? 'default' : 'secondary'}>
                {role === 'admin' ? t('account.role_admin') : t('account.role_customer')}
              </Badge>
            </dd>
          </div>
        </dl>
      </div>
    </main>
  )
}
