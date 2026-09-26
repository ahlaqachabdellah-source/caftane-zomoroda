import { useTranslation } from 'react-i18next'
import {
  CalendarClock,
  CalendarPlus,
  CircleDollarSign,
  Crown,
  Hourglass,
  ArrowRightLeft,
  UserPlus,
} from 'lucide-react'
import LoadingState from '@/components/states/LoadingState'
import ErrorState from '@/components/states/ErrorState'
import EmptyState from '@/components/states/EmptyState'
import { useAdminDashboard } from '@/hooks/useAdminDashboard'
import { useLocale } from '@/hooks/useLocale'
import { formatDateTime, formatNumber, formatPrice } from '@/lib/format'
import { localizedText } from '@/lib/localized'
import type { AdminActivityEvent } from '@/types/admin'

/**
 * Admin overview (Phase 9) — KPI cards (bookings this month, revenue
 * estimate, pending requests), top caftans and the recent-activity feed.
 * Every number comes from the admin_dashboard_kpis() /
 * admin_recent_activity() RPCs; nothing is hardcoded.
 */

const ACTIVITY_ICONS: Record<AdminActivityEvent['type'], typeof CalendarPlus> = {
  booking_created: CalendarPlus,
  status_change: ArrowRightLeft,
  customer_registered: UserPlus,
}

export default function AdminOverviewPage() {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const { kpis, activity, loading, error, refetch } = useAdminDashboard()

  if (loading) {
    return <LoadingState label={t('admin.loading')} className="py-24" />
  }

  if (error || !kpis) {
    return (
      <ErrorState
        title={t('admin.load_error_title')}
        description={t('admin.load_error_body')}
        onRetry={refetch}
        className="py-24"
      />
    )
  }

  const revenueStatuses = kpis.revenue_statuses
    .map((s) => t(`account.status.${s}`))
    .join(' + ')

  const kpiCards = [
    {
      key: 'month',
      icon: CalendarClock,
      label: t('admin.kpi_bookings_month'),
      value: formatNumber(kpis.bookings_this_month, locale),
      hint: t('admin.kpi_bookings_month_hint'),
    },
    {
      key: 'revenue',
      icon: CircleDollarSign,
      label: t('admin.kpi_revenue'),
      value: formatPrice(kpis.revenue_estimate, locale),
      hint: t('admin.kpi_revenue_hint', { statuses: revenueStatuses }),
    },
    {
      key: 'pending',
      icon: Hourglass,
      label: t('admin.kpi_pending'),
      value: formatNumber(kpis.pending_count, locale),
      hint: t('admin.kpi_pending_hint'),
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t('admin.overview_title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('admin.overview_subtitle')}</p>
      </div>

      {/* KPI cards */}
      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpiCards.map(({ key, icon: Icon, label, value, hint }) => (
          <div
            key={key}
            className="rounded-xl border border-border bg-background p-5 shadow-sm"
          >
            <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground rtl:tracking-normal">
              <Icon className="h-4 w-4 text-gold" aria-hidden="true" />
              {label}
            </dt>
            <dd className="mt-2 font-display text-3xl font-semibold text-foreground">
              {value}
            </dd>
            <dd className="mt-1 text-xs text-muted-foreground">{hint}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top caftans by real booking activity */}
        <section
          aria-labelledby="admin-top-title"
          className="rounded-xl border border-border bg-background p-5 shadow-sm"
        >
          <h2
            id="admin-top-title"
            className="flex items-center gap-2 font-display text-lg font-semibold text-foreground"
          >
            <Crown className="h-5 w-5 text-gold" aria-hidden="true" />
            {t('admin.top_title')}
          </h2>
          {kpis.top_caftans.length === 0 ? (
            <EmptyState
              title={t('admin.top_empty_title')}
              description={t('admin.top_empty_body')}
              className="py-8"
            />
          ) : (
            <ol className="mt-4 flex flex-col divide-y divide-border">
              {kpis.top_caftans.map((caftan, index) => (
                <li key={caftan.caftan_id} className="flex items-center gap-3 py-3">
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-gold"
                  >
                    {formatNumber(index + 1, locale)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {localizedText(caftan.name, locale)}
                  </span>
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {t('admin.top_requests', { count: caftan.booking_count })}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Recent activity feed */}
        <section
          aria-labelledby="admin-activity-title"
          className="rounded-xl border border-border bg-background p-5 shadow-sm"
        >
          <h2
            id="admin-activity-title"
            className="font-display text-lg font-semibold text-foreground"
          >
            {t('admin.activity_title')}
          </h2>
          {activity.length === 0 ? (
            <EmptyState
              title={t('admin.activity_empty_title')}
              description={t('admin.activity_empty_body')}
              className="py-8"
            />
          ) : (
            <ul className="mt-4 flex flex-col divide-y divide-border">
              {activity.map((event, index) => {
                const Icon = ACTIVITY_ICONS[event.type] ?? ArrowRightLeft
                const name = event.customer_name ?? t('admin.unknown_customer')
                let text: string
                if (event.type === 'booking_created') {
                  text = t('admin.activity_booking_created', {
                    number: event.booking_number,
                    name,
                  })
                } else if (event.type === 'status_change') {
                  text = t('admin.activity_status_change', {
                    number: event.booking_number,
                    from: event.from_status ? t(`account.status.${event.from_status}`) : '',
                    to: event.to_status ? t(`account.status.${event.to_status}`) : '',
                  })
                } else {
                  text = t('admin.activity_customer_registered', { name })
                }
                return (
                  <li key={`${event.type}-${event.booking_number ?? name}-${index}`} className="flex items-start gap-3 py-3">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-gold"
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug text-foreground">{text}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDateTime(event.occurred_at, locale)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
