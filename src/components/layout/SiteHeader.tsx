import { useState } from 'react'
import { Link, NavLink } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Menu, ShieldCheck, UserRound, X } from 'lucide-react'
import Logo from '@/components/brand/Logo'
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/hooks/useLocale'
import { cn } from '@/lib/utils'

/**
 * Site header (Phase 4) — official logo, primary navigation, language
 * switcher and account entry point. Sticky with an ivory blur backdrop;
 * the mobile menu opens below the bar. Catalog links join the nav in
 * Phase 5 when those routes exist.
 */
export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { t } = useTranslation()
  const { session, isAdmin, loading } = useAuth()
  const { localePath } = useLocale()

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'inline-flex h-10 items-center border-b-2 px-1 text-sm font-medium transition-colors',
      isActive
        ? 'border-gold text-foreground'
        : 'border-transparent text-muted-foreground hover:border-gold/50 hover:text-foreground',
    )

  const accountLink = session ? (
    <Link
      to={localePath('/account')}
      className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
    >
      <UserRound className="h-4 w-4" aria-hidden="true" />
      {t('nav.account')}
    </Link>
  ) : (
    <Link
      to={localePath('/login')}
      className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
    >
      <UserRound className="h-4 w-4" aria-hidden="true" />
      {t('nav.login')}
    </Link>
  )

  // Admins get a direct entry point to the dashboard (Phase 9).
  const adminLink = isAdmin ? (
    <Link
      to={localePath('/admin')}
      className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
    >
      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
      {t('nav.admin')}
    </Link>
  ) : null

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to={localePath('/')} aria-label={t('common.home_aria')} className="flex items-center">
          <Logo className="h-12 w-auto sm:h-14" />
        </Link>

        {/* Desktop primary nav */}
        <nav aria-label={t('nav.primary_aria')} className="hidden items-center gap-6 md:flex">
          <NavLink to={localePath('/')} end className={navLinkClass}>
            {t('nav.home')}
          </NavLink>
          <NavLink to={localePath('/caftans')} className={navLinkClass}>
            {t('nav.collection')}
          </NavLink>
          <NavLink to={localePath('/contact')} className={navLinkClass}>
            {t('nav.contact')}
          </NavLink>
        </nav>

        <div className="flex items-center gap-1">
          <LanguageSwitcher className="hidden md:inline-flex" />
          {!loading && (
            <div className="hidden items-center md:flex">
              {adminLink}
              {accountLink}
            </div>
          )}

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent md:hidden"
            aria-label={menuOpen ? t('common.menu_close') : t('common.menu_open')}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          aria-label={t('nav.mobile_aria')}
          className="border-t border-border bg-background md:hidden"
        >
          <div className="flex flex-col items-center gap-4 px-4 py-8">
            <Logo className="h-24 w-auto" />
            <p className="text-xs uppercase tracking-[0.3em] text-gold-strong rtl:tracking-normal">
              {t('common.tagline')}
            </p>
            <div onClick={() => setMenuOpen(false)} className="flex flex-col items-center gap-1">
              <NavLink to={localePath('/')} end className={navLinkClass}>
                {t('nav.home')}
              </NavLink>
              <NavLink to={localePath('/caftans')} className={navLinkClass}>
                {t('nav.collection')}
              </NavLink>
              <NavLink to={localePath('/contact')} className={navLinkClass}>
                {t('nav.contact')}
              </NavLink>
              {!loading && (
                <>
                  {adminLink}
                  {accountLink}
                </>
              )}
              <LanguageSwitcher />
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}
