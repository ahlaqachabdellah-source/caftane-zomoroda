import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Menu, UserRound, X } from 'lucide-react'
import Logo from '@/components/brand/Logo'
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/hooks/useLocale'

/**
 * Site header — brand logo on all viewports, language switcher + auth
 * entry point on the right, hamburger menu on mobile.
 * Catalog navigation links are added in a later phase when routes exist.
 */
export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { t } = useTranslation()
  const { session, loading } = useAuth()
  const { localePath } = useLocale()

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

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to={localePath('/')} aria-label={t('common.home_aria')} className="flex items-center">
          <Logo className="h-12 w-auto sm:h-14" />
        </Link>

        <div className="flex items-center gap-1">
          <LanguageSwitcher className="hidden md:inline-flex" />
          {/* Desktop auth link */}
          {!loading && <div className="hidden md:block">{accountLink}</div>}

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
          aria-label="Navigation mobile"
          className="border-t border-border bg-background md:hidden"
        >
          <div className="flex flex-col items-center gap-4 px-4 py-8">
            <Logo className="h-24 w-auto" />
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground rtl:tracking-normal">
              {t('common.tagline')}
            </p>
            <div onClick={() => setMenuOpen(false)} className="flex flex-col items-center gap-1">
              {!loading && accountLink}
              <LanguageSwitcher />
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}
