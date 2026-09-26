import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { CalendarDays, ClipboardList, LayoutDashboard, LogOut, Menu, Shirt, Store, Tags, Users, X } from 'lucide-react'
import Logo from '@/components/brand/Logo'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/hooks/useLocale'
import { cn } from '@/lib/utils'

/**
 * Admin dashboard shell (Phase 9).
 * Dedicated full-screen layout — the public site chrome (header, footer,
 * WhatsApp float) is intentionally absent. Fixed sidebar on desktop,
 * slide-over drawer on mobile/tablet. Active nav state, admin identity,
 * sign-out and a link back to the public site.
 *
 * The route is wrapped in <ProtectedRoute requireAdmin> in App.tsx; the
 * data itself is protected server-side (RLS + admin-only RPCs).
 */

type AdminNavItem = {
  to: string
  labelKey: string
  icon: typeof LayoutDashboard
  end: boolean
}

// Single source for the sidebar entries — later phases (catalog CRUD,
// booking management) append their items here.
const ADMIN_NAV: AdminNavItem[] = [
  { to: '/admin', labelKey: 'admin.nav_overview', icon: LayoutDashboard, end: true },
  { to: '/admin/caftans', labelKey: 'admin.nav_caftans', icon: Shirt, end: false },
  { to: '/admin/categories', labelKey: 'admin.nav_categories', icon: Tags, end: false },
  { to: '/admin/bookings', labelKey: 'admin.nav_bookings', icon: ClipboardList, end: false },
  { to: '/admin/calendar', labelKey: 'admin.nav_calendar', icon: CalendarDays, end: false },
  { to: '/admin/customers', labelKey: 'admin.nav_customers', icon: Users, end: false },
]

function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation()
  const { localePath } = useLocale()
  return (
    <nav aria-label={t('admin.nav_aria')}>
      <ul className="flex flex-col gap-1">
        {ADMIN_NAV.map(({ to, labelKey, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={localePath(to)}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-foreground before:absolute before:inset-y-2 before:start-0 before:w-1 before:rounded-full before:bg-gold'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t(labelKey)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function AdminIdentity({ onSignOut }: { onSignOut: () => void }) {
  const { profile, user } = useAuth()
  const { t } = useTranslation()
  const { localePath } = useLocale()
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {profile?.full_name || t('admin.identity_fallback')}
        </p>
        {user?.email && (
          <p className="truncate text-xs text-muted-foreground" dir="ltr">
            {user.email}
          </p>
        )}
        <p className="mt-1 inline-flex rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-gold rtl:tracking-normal">
          {t('admin.role_badge')}
        </p>
      </div>
      <Link
        to={localePath('/')}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <Store className="h-4 w-4" aria-hidden="true" />
        {t('admin.view_site')}
      </Link>
      <button
        type="button"
        onClick={onSignOut}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {t('account.sign_out')}
      </button>
    </div>
  )
}

export default function AdminLayout() {
  const { signOut } = useAuth()
  const { t } = useTranslation()
  const { localePath } = useLocale()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate(localePath('/'), { replace: true })
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 flex-col gap-6 border-e border-border bg-background p-4 lg:flex">
        <Link
          to={localePath('/admin')}
          aria-label={t('admin.shell_aria')}
          className="flex items-center justify-center border-b border-border pb-4"
        >
          <Logo className="h-14 w-auto" />
        </Link>
        <AdminNav />
        <div className="mt-auto">
          <AdminIdentity onSignOut={handleSignOut} />
        </div>
      </aside>

      {/* Mobile / tablet top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background px-4 lg:hidden">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent"
          aria-label={t('common.menu_open')}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <Link to={localePath('/admin')} aria-label={t('admin.shell_aria')} className="flex items-center">
          <Logo className="h-9 w-auto" />
        </Link>
        <span className="ms-auto text-xs font-medium uppercase tracking-wide text-muted-foreground rtl:tracking-normal">
          {t('admin.shell_title')}
        </span>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t('admin.nav_aria')}>
          <button
            type="button"
            aria-label={t('common.menu_close')}
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col gap-6 border-e border-border bg-background p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <Logo className="h-12 w-auto" />
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent"
                aria-label={t('common.menu_close')}
                onClick={() => setMenuOpen(false)}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <AdminNav onNavigate={() => setMenuOpen(false)} />
            <div className="mt-auto">
              <AdminIdentity onSignOut={handleSignOut} />
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="min-h-screen lg:ps-64">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
