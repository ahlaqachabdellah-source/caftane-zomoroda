import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, CalendarCheck, CheckCircle2, Loader2 } from 'lucide-react'
import CaftanImage from '@/components/catalog/CaftanImage'
import Container from '@/components/layout/Container'
import EmptyState from '@/components/states/EmptyState'
import ErrorState from '@/components/states/ErrorState'
import LoadingState from '@/components/states/LoadingState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCaftanDetail } from '@/hooks/useCaftanDetail'
import { useCreateBooking } from '@/hooks/useCreateBooking'
import { useLocale } from '@/hooks/useLocale'
import { rentalDays } from '@/lib/booking'
import { sortCaftanImages } from '@/lib/caftans'
import { formatDate, formatPrice } from '@/lib/format'
import { localizedText } from '@/lib/localized'
import { bookingSchema, todayString, type BookingFormValues } from '@/lib/validation/booking'
import type { Booking } from '@/types/database.types'

/**
 * Booking page (Phase 6) — protected route. The customer picks rental
 * dates, sees a live estimate (server recomputes the authoritative
 * total), and submits the request. On success the database-generated
 * booking number is shown.
 */
export default function BookingPage() {
  const { slug } = useParams()
  const { t } = useTranslation()
  const { locale, localePath } = useLocale()
  const { caftan, loading, error, notFound, refetch } = useCaftanDetail(slug)
  const { createBooking, submitting } = useCreateBooking()
  const [serverErrorKey, setServerErrorKey] = useState<string | null>(null)
  const [created, setCreated] = useState<Booking | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { startDate: '', endDate: '', customerNotes: '' },
  })

  const [startDate, endDate] = watch(['startDate', 'endDate'])
  const days = rentalDays(startDate, endDate)
  const estimate = caftan && days > 0 ? days * Number(caftan.price_per_day) : null

  async function onSubmit(values: BookingFormValues) {
    if (!caftan) return
    setServerErrorKey(null)
    const { booking, errorKey } = await createBooking({
      caftanId: caftan.id,
      startDate: values.startDate,
      endDate: values.endDate,
      customerNotes: values.customerNotes.trim(),
    })
    if (errorKey) {
      setServerErrorKey(errorKey)
      return
    }
    setCreated(booking)
  }

  if (loading) {
    return (
      <main className="flex flex-1 flex-col">
        <LoadingState className="py-24" label={t('catalog.loading')} />
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex flex-1 flex-col">
        <ErrorState className="py-24" description={t('catalog.error_body')} onRetry={refetch} />
      </main>
    )
  }

  if (notFound || !caftan) {
    return (
      <main className="flex flex-1 flex-col">
        <EmptyState
          className="py-24"
          title={t('catalog.not_found_title')}
          description={t('catalog.not_found_body')}
          action={
            <Button asChild variant="outline">
              <Link to={localePath('/caftans')}>{t('catalog.back_to_catalog')}</Link>
            </Button>
          }
        />
      </main>
    )
  }

  const name = localizedText(caftan.name, locale)
  const primary = sortCaftanImages(caftan.images)[0] ?? null

  /* ---------------------------------------------------------------- success */
  if (created) {
    return (
      <main className="flex flex-1 flex-col">
        <Container className="flex flex-1 flex-col items-center justify-center gap-5 py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-gold">
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {t('booking.success_title')}
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t('booking.success_body')}
          </p>
          <dl className="mt-2 flex w-full max-w-md flex-col gap-3 rounded-xl border border-border bg-card p-6 text-start">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm text-muted-foreground">{t('booking.number_label')}</dt>
              <dd className="font-mono text-lg font-semibold text-foreground">
                {created.booking_number}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
              <dt className="text-sm text-muted-foreground">{t('booking.dates_label')}</dt>
              <dd className="text-sm font-medium text-foreground">
                {formatDate(created.start_date, locale)} → {formatDate(created.end_date, locale)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
              <dt className="text-sm text-muted-foreground">{t('booking.total_label')}</dt>
              <dd className="font-semibold text-foreground">
                {formatPrice(Number(created.total_price), locale)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
              <dt className="text-sm text-muted-foreground">{t('booking.status_label')}</dt>
              <dd className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                {t('booking.status_pending')}
              </dd>
            </div>
          </dl>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link to={localePath('/account')}>{t('booking.go_to_account')}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={localePath('/caftans')}>{t('catalog.back_to_catalog')}</Link>
            </Button>
          </div>
        </Container>
      </main>
    )
  }

  /* ------------------------------------------------------------------ form */
  return (
    <main className="flex flex-1 flex-col">
      <Container className="flex flex-col gap-8 py-10 sm:py-14">
        <Link
          to={localePath(`/caftans/${caftan.slug}`)}
          className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          {t('booking.back_to_caftan')}
        </Link>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* Caftan summary */}
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-xl border border-border">
              <CaftanImage
                storagePath={primary?.storage_path}
                alt={name}
                className="aspect-[3/4] w-full sm:aspect-[4/3] lg:aspect-[3/4]"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold rtl:tracking-normal">
                {caftan.category ? localizedText(caftan.category.name, locale) : ''}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {name}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="text-base font-semibold text-foreground">
                  {formatPrice(Number(caftan.price_per_day), locale)}
                </span>{' '}
                {t('catalog.per_day')} · {t('catalog.deposit_label')}{' '}
                {formatPrice(Number(caftan.deposit_amount), locale)}
              </p>
            </div>
          </div>

          {/* Booking form */}
          <div className="flex flex-col gap-6">
            <h2 className="text-xl font-semibold text-foreground">{t('booking.form_title')}</h2>

            {caftan.status === 'maintenance' ? (
              <p role="note" className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
                {t('catalog.maintenance_notice')}
              </p>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
                {serverErrorKey && (
                  <p
                    role="alert"
                    className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
                  >
                    {t(serverErrorKey)}
                  </p>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">{t('booking.start_label')}</Label>
                    <Input
                      id="startDate"
                      type="date"
                      min={todayString()}
                      aria-invalid={Boolean(errors.startDate)}
                      {...register('startDate')}
                    />
                    {errors.startDate && (
                      <p className="text-sm text-destructive">
                        {t(errors.startDate.message ?? '')}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">{t('booking.end_label')}</Label>
                    <Input
                      id="endDate"
                      type="date"
                      min={startDate || todayString()}
                      aria-invalid={Boolean(errors.endDate)}
                      {...register('endDate')}
                    />
                    {errors.endDate && (
                      <p className="text-sm text-destructive">
                        {t(errors.endDate.message ?? '')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerNotes">
                    {t('booking.notes_label')}{' '}
                    <span className="text-muted-foreground">{t('auth.optional')}</span>
                  </Label>
                  <Textarea
                    id="customerNotes"
                    rows={3}
                    placeholder={t('booking.notes_ph')}
                    aria-invalid={Boolean(errors.customerNotes)}
                    {...register('customerNotes')}
                  />
                  {errors.customerNotes && (
                    <p className="text-sm text-destructive">
                      {t(errors.customerNotes.message ?? '')}
                    </p>
                  )}
                </div>

                {/* Live estimate — the server recomputes the authoritative total */}
                <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5">
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarCheck className="h-4 w-4 text-gold" aria-hidden="true" />
                    {days > 0
                      ? t('booking.estimate_days', { count: days })
                      : t('booking.estimate_hint')}
                  </span>
                  {estimate !== null && (
                    <span className="text-lg font-semibold text-foreground">
                      {formatPrice(estimate, locale)}
                    </span>
                  )}
                </div>

                <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
                  {submitting && <Loader2 className="animate-spin" aria-hidden="true" />}
                  {submitting ? t('booking.submitting') : t('booking.submit')}
                </Button>
              </form>
            )}
          </div>
        </div>
      </Container>
    </main>
  )
}
