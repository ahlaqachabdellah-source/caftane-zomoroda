import { useState } from 'react'
import { Link } from 'react-router'
import { Menu, X } from 'lucide-react'
import Logo from '@/components/brand/Logo'

/**
 * Site header — brand logo on all viewports, hamburger menu on mobile.
 * Navigation links are added in a later phase when routes exist;
 * the mobile panel currently shows the brand mark only (no dead links).
 */
export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" aria-label="Caftan Zomoroda — accueil" className="flex items-center">
          <Logo className="h-12 w-auto sm:h-14" />
        </Link>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent md:hidden"
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {menuOpen && (
        <nav
          aria-label="Navigation mobile"
          className="border-t border-border bg-background md:hidden"
        >
          <div className="flex flex-col items-center gap-3 px-4 py-8">
            <Logo className="h-28 w-auto" />
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Location de caftans
            </p>
          </div>
        </nav>
      )}
    </header>
  )
}
