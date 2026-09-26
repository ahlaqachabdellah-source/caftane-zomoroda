import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import Logo from '@/components/brand/Logo'
import { useLocale } from '@/hooks/useLocale'

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
  const { t } = useTranslation()
  const { localePath } = useLocale()

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <Link to={localePath('/')} aria-label={t('common.home_aria')}>
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
            to={localePath('/')}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            <ArrowLeft className="h-3 w-3 rtl:rotate-180" aria-hidden="true" />
            {t('common.back_home')}
          </Link>
        </p>
      </div>
    </main>
  )
}
