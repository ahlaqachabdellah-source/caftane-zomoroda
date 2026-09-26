import { Link, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import LoadingState from '@/components/states/LoadingState'
import ErrorState from '@/components/states/ErrorState'
import EmptyState from '@/components/states/EmptyState'
import { BookingStatusBadge, DepositStatusBadge } from '@/components/account/BookingStatusBadge'
import { useAdminCustomer } from '@/hooks/useAdminCustomers'
import { useLocale } from '@/hooks/useLocale'
import { localizedText } from '@/lib/localized'
import { formatDate, formatDateTime, formatPrice } from '@/lib/format'

/**
 * Admin customer detail (Phase 11) — profile card + full booking/rental
 * history with statuses, from admin_get_customer() (admin-only RPC;
 * customers calling it get 42501 even for their own id).
 */
export default function AdminCustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>()
  const { t } = useTranslation()
  const { locale, localePath } = useLocale()
  const { detail, loading, error, notFound } = useAdminCustomer(customerId)

  if (loading) return <LoadingState />
  if (notFound) {
    return (
      <EmptyState
        title={t('admin.customers.not_found_title')}
        description={t('admin.customers.not_found_body')}
        action={
          <Button asChild variant="outline">
            <Link to={localePath('/admin/customers')}>{t('admin.customers.back')}</Link>
          </Button>
        }
      />
    )
  }
  if (error || !detail) return <ErrorState title={t(error ?? 'admin.customers.error_load')} />

  const { profile, bookings } = detail

  return (
    <div className="flex flex-col gap-6">
      <Link
        to={localePath('/admin/customers')}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        {t('admin.customers.back')}
      </Link>

      <h1 className="text-2xl font-semibold text-foreground">
        {profile.full_name || t('admin.customers.unnamed')}
      </h1>

      {/* Profile */}
      <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">
          {t('admin.customers.section_profile')}
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">{t('admin.customers.field_phone')}</dt>
            <dd className="font-medium text-foreground" dir="ltr">{profile.phone || '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('admin.customers.field_whatsapp')}</dt>
            <dd className="font-medium text-foreground" dir="ltr">
              {profile.whatsapp_number || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('admin.customers.field_city')}</dt>
            <dd className="font-medium text-foreground">{profile.city || '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('admin.customers.customer_since')}</dt>
            <dd className="font-medium text-foreground">
              <time dateTime={profile.created_at}>{formatDateTime(profile.created_at, locale)}</time>
            </dd>
          </div>
        </dl>
      </section>

      {/* Booking history */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          {t('admin.customers.section_bookings')}
        </h2>
        {bookings.length === 0 ? (
          <EmptyState
            title={t('admin.customers.no_bookings_title')}
            description={t('admin.customers.no_bookings_body')}
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {bookings.map((b) => (
              <li key={b.id}>
                <Link
                  to={localePath(`/admin/bookings/${b.id}`)}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-background p-4 shadow-sm transition-colors hover:border-gold focus-visible:outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground" dir="ltr">
                        {b.booking_number}
                      </span>
                      <BookingStatusBadge status={b.status} />
                      <DepositStatusBadge status={b.deposit_status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span>{b.caftan ? localizedText(b.caftan.name, locale) : '—'}</span>
                      {' · '}
                      <time dateTime={b.start_date}>{formatDate(b.start_date, locale)}</time>
                      {' → '}
                      <time dateTime={b.end_date}>{formatDate(b.end_date, locale)}</time>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-foreground">
                      {formatPrice(b.total_price, locale)}
                    </span>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180"
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
