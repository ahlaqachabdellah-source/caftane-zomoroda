import { NavLink } from 'react-router'
import { useTranslation } from 'react-i18next'
import { CalendarRange, LayoutGrid, UserRound } from 'lucide-react'
import { useLocale } from '@/hooks/useLocale'

/**
 * Account area navigation (Phase 7) — tab-style links with the gold
 * underline active state, consistent with the site header.
 */
export default function AccountNav() {
  const { t } = useTranslation()
  const { localePath } = useLocale()

  const items = [
    { to: localePath('/account'), label: t('account.nav_dashboard'), icon: LayoutGrid, end: true },
    { to: localePath('/account/bookings'), label: t('account.nav_bookings'), icon: CalendarRange, end: false },
    { to: localePath('/account/profile'), label: t('account.nav_profile'), icon: UserRound, end: false },
  ]

  return (
    <nav aria-label={t('account.title')} className="border-b border-border">
      <ul className="flex gap-1 sm:gap-2">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative inline-flex items-center gap-2 px-3 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-foreground after:absolute after:inset-x-3 after:bottom-[-1px] after:h-0.5 after:bg-gold'
                    : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
