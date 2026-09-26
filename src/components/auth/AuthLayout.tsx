import type { ReactNode } from 'react'
import { Link } from 'react-router'
import Logo from '@/components/brand/Logo'

/**
 * Shared layout for all auth screens: centered branded card with the
 * official logo, responsive from mobile to desktop.
 */
type AuthLayoutProps = {
  title: string
  subtitle?: string
  children: ReactNode
}

export default function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <Link to="/" aria-label="Caftan Zomoroda — accueil">
              <Logo className="h-20 w-auto sm:h-24" />
            </Link>
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {children}
        </div>
        <p className="mt-6 text-center">
          <Link
            to="/"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Retour à l'accueil
          </Link>
        </p>
      </div>
    </main>
  )
}
