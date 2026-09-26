import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import LoadingState from '@/components/states/LoadingState'
import ErrorState from '@/components/states/ErrorState'
import EmptyState from '@/components/states/EmptyState'
import { BookingStatusBadge } from '@/components/account/BookingStatusBadge'
import { useAdminCustomers } from '@/hooks/useAdminCustomers'
import { useLocale } from '@/hooks/useLocale'
import { formatDateTime } from '@/lib/format'

/**
 * Admin customer list (Phase 11) — every customer with contact info,
 * booking count and latest booking status, from admin_list_customers()
 * (admin-only RPC). Search runs client-side over name/phone/WhatsApp/city.
 */
export default function AdminCustomersPage() {
  const { t } = useTranslation()
  const { locale, localePath } = useLocale()
  const { customers, loading, error, refetch } = useAdminCustomers()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return customers
    return customers.filter((c) =>
      [c.full_name, c.phone ?? '', c.whatsapp_number ?? '', c.city ?? '']
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [customers, search])

  if (loading) return <LoadingState />
  if (error) return <ErrorState title={t(error)} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t('admin.customers.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('admin.customers.subtitle')}</p>
      </div>

      <div className="flex max-w-sm flex-col gap-2">
        <Label htmlFor="customer-search">{t('admin.customers.search_label')}</Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="customer-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.customers.search_placeholder')}
            className="ps-9"
          />
        </div>
      </div>

      {customers.length === 0 ? (
        <EmptyState
          title={t('admin.customers.empty_title')}
          description={t('admin.customers.empty_body')}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t('admin.customers.empty_filtered_title')}
          description={t('admin.customers.empty_filtered_body')}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link
                to={localePath(`/admin/customers/${c.id}`)}
                className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 shadow-sm transition-colors hover:border-gold focus-visible:outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="font-medium text-foreground">
                    {c.full_name || t('admin.customers.unnamed')}
                  </span>
                  <p className="text-sm text-muted-foreground">
                    <span dir="ltr">{c.phone || '—'}</span>
                    {c.whatsapp_number && (
                      <>
                        {' · WhatsApp '}
                        <span dir="ltr">{c.whatsapp_number}</span>
                      </>
                    )}
                    {c.city && <> · {c.city}</>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('admin.customers.customer_since')}{' '}
                    <time dateTime={c.created_at}>{formatDateTime(c.created_at, locale)}</time>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {t('admin.customers.booking_count', { count: c.booking_count })}
                  </span>
                  {c.last_booking_status && <BookingStatusBadge status={c.last_booking_status} />}
                  {c.last_booking_at && (
                    <span className="hidden text-xs text-muted-foreground md:inline">
                      <time dateTime={c.last_booking_at}>
                        {formatDateTime(c.last_booking_at, locale)}
                      </time>
                    </span>
                  )}
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
    </div>
  )
}
