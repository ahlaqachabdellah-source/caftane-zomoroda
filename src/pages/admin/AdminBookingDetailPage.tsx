import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, CalendarDays, MessageCircle, Pencil, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ListRowsSkeleton } from '@/components/states/skeletons'
import ErrorState from '@/components/states/ErrorState'
import EmptyState from '@/components/states/EmptyState'
import { BookingStatusBadge, DepositStatusBadge } from '@/components/account/BookingStatusBadge'
import BookingStatusTimeline from '@/components/account/BookingStatusTimeline'
import { useAdminBooking } from '@/hooks/useAdminBooking'
import { useAdminBookingActions } from '@/hooks/useAdminBookingActions'
import { useLocale } from '@/hooks/useLocale'
import { localizedText } from '@/lib/localized'
import { formatDate, formatDateTime, formatPrice } from '@/lib/format'
import { rentalDays } from '@/lib/booking'
import { actionNoteSchema, adminNotesSchema } from '@/lib/validation/admin'
import { buildWhatsappLink } from '@/lib/whatsapp'
import i18n from '@/i18n'
import { BOOKING_TRANSITIONS } from '@/types/admin'
import type { BookingStatus } from '@/types/database.types'

/**
 * Admin booking detail (Phase 11) — full booking view: customer, caftan,
 * dates, pricing, statuses, customer notes, internal admin notes editor,
 * lifecycle-guarded status actions (confirm/reject/complete/cancel) with
 * an optional customer-visible reason, audit history, and a WhatsApp
 * notification deep link (the existing customer-contact mechanism).
 */

const ACTION_STYLES: Record<string, string> = {
  confirmed: '',
  completed: '',
  rejected: 'border-destructive text-destructive hover:bg-destructive/10',
  cancelled: 'border-destructive text-destructive hover:bg-destructive/10',
}

export default function AdminBookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const { t } = useTranslation()
  const { locale, localePath } = useLocale()
  const { detail, loading, error, notFound, refetch } = useAdminBooking(bookingId)
  const { acting, updateStatus, saveNotes } = useAdminBookingActions()

  const [notesDraft, setNotesDraft] = useState<string | null>(null)
  const [notesNotice, setNotesNotice] = useState<'saved' | 'error' | 'invalid' | null>(null)
  const [pendingAction, setPendingAction] = useState<BookingStatus | null>(null)
  const [actionNote, setActionNote] = useState('')
  const [actionErrorKey, setActionErrorKey] = useState<string | null>(null)
  const [lastTransition, setLastTransition] = useState<BookingStatus | null>(null)

  const whatsappLink = useMemo(() => {
    if (!detail?.customer || !lastTransition) return ''
    // Customer-facing message: no technical terms, no internal data.
    // The schema stores no per-customer locale, so the business default
    // language (French) is used for the outgoing message.
    const tFr = i18n.getFixedT('fr')
    const message = tFr('admin.bookings.notify_message', {
      number: detail.booking.booking_number,
      status: tFr(`account.status.${lastTransition}`),
    })
    return buildWhatsappLink(detail.customer.whatsapp_number ?? detail.customer.phone, message)
  }, [detail, lastTransition])

  if (loading) return <ListRowsSkeleton />
  if (notFound) {
    return (
      <EmptyState
        title={t('admin.bookings.not_found_title')}
        description={t('admin.bookings.not_found_body')}
        action={
          <Button asChild variant="outline">
            <Link to={localePath('/admin/bookings')}>{t('admin.bookings.back')}</Link>
          </Button>
        }
      />
    )
  }
  if (error || !detail) {
    return <ErrorState title={t(error ?? 'admin.bookings.error_load')} onRetry={refetch} />
  }

  const { booking, customer, caftan, history } = detail
  const days = rentalDays(booking.start_date, booking.end_date)
  const transitions = BOOKING_TRANSITIONS[booking.status]

  const handleConfirmAction = async () => {
    if (!pendingAction) return
    const note = actionNote.trim()
    const noteCheck = actionNoteSchema.safeParse(note)
    if (!noteCheck.success) {
      setActionErrorKey(noteCheck.error.issues[0]?.message ?? 'validation.notes_max')
      return
    }
    const result = await updateStatus(booking.id, pendingAction, note)
    if (result.ok) {
      setLastTransition(pendingAction)
      setPendingAction(null)
      setActionNote('')
      setActionErrorKey(null)
      refetch()
    } else {
      setActionErrorKey(result.errorKey)
    }
  }

  const handleSaveNotes = async () => {
    const parsed = adminNotesSchema.safeParse(notesDraft ?? '')
    if (!parsed.success) {
      setNotesNotice('invalid')
      return
    }
    const result = await saveNotes(booking.id, parsed.data)
    setNotesNotice(result.ok ? 'saved' : 'error')
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to={localePath('/admin/bookings')}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        {t('admin.bookings.back')}
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-foreground" dir="ltr">
          {booking.booking_number}
        </h1>
        <BookingStatusBadge status={booking.status} />
        <DepositStatusBadge status={booking.deposit_status} />
      </div>

      {lastTransition && (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-xl border border-primary bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-foreground">
            {t('admin.bookings.notice_transition', {
              status: t(`account.status.${lastTransition}`),
            })}
          </p>
          {whatsappLink ? (
            <Button asChild variant="outline" size="sm">
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                {t('admin.bookings.notify_cta')}
              </a>
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t('admin.bookings.notify_unavailable')}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Rental + pricing */}
        <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CalendarDays className="h-4 w-4 text-gold" aria-hidden="true" />
            {t('admin.bookings.section_rental')}
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">{t('admin.bookings.field_start')}</dt>
              <dd className="font-medium text-foreground">
                <time dateTime={booking.start_date}>{formatDate(booking.start_date, locale)}</time>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('admin.bookings.field_end')}</dt>
              <dd className="font-medium text-foreground">
                <time dateTime={booking.end_date}>{formatDate(booking.end_date, locale)}</time>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('admin.bookings.field_days')}</dt>
              <dd className="font-medium text-foreground">
                {t('admin.bookings.days', { count: days })}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('admin.bookings.field_total')}</dt>
              <dd className="font-medium text-foreground">
                {formatPrice(booking.total_price, locale)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('admin.bookings.field_deposit')}</dt>
              <dd>
                <DepositStatusBadge status={booking.deposit_status} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('admin.bookings.field_created')}</dt>
              <dd className="font-medium text-foreground">
                <time dateTime={booking.created_at}>
                  {formatDateTime(booking.created_at, locale)}
                </time>
              </dd>
            </div>
          </dl>
        </section>

        {/* Customer */}
        <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <User className="h-4 w-4 text-gold" aria-hidden="true" />
            {t('admin.bookings.section_customer')}
          </h2>
          {customer ? (
            <dl className="mt-3 grid grid-cols-1 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">{t('admin.customers.field_name')}</dt>
                <dd className="font-medium text-foreground">
                  <Link
                    to={localePath(`/admin/customers/${customer.id}`)}
                    className="underline-offset-4 hover:underline"
                  >
                    {customer.full_name || t('admin.bookings.unknown_customer')}
                  </Link>
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-x-4">
                <div>
                  <dt className="text-muted-foreground">{t('admin.customers.field_phone')}</dt>
                  <dd className="font-medium text-foreground" dir="ltr">
                    {customer.phone || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('admin.customers.field_whatsapp')}</dt>
                  <dd className="font-medium text-foreground" dir="ltr">
                    {customer.whatsapp_number || '—'}
                  </dd>
                </div>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('admin.customers.field_city')}</dt>
                <dd className="font-medium text-foreground">{customer.city || '—'}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              {t('admin.bookings.unknown_customer')}
            </p>
          )}
        </section>

        {/* Caftan */}
        <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Pencil className="h-4 w-4 text-gold" aria-hidden="true" />
            {t('admin.bookings.section_caftan')}
          </h2>
          {caftan ? (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">{t('admin.bookings.field_caftan_name')}</dt>
                <dd className="font-medium text-foreground">
                  <Link
                    to={localePath(`/admin/caftans/${caftan.id}/edit`)}
                    className="underline-offset-4 hover:underline"
                  >
                    {localizedText(caftan.name, locale)}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('admin.caftans.field_slug')}</dt>
                <dd className="font-medium text-foreground" dir="ltr">
                  {caftan.slug}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('admin.bookings.field_price_day')}</dt>
                <dd className="font-medium text-foreground">
                  {formatPrice(caftan.price_per_day, locale)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {t('admin.bookings.field_deposit_amount')}
                </dt>
                <dd className="font-medium text-foreground">
                  {formatPrice(caftan.deposit_amount, locale)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">—</p>
          )}
        </section>

        {/* Customer notes */}
        <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">
            {t('admin.bookings.section_customer_notes')}
          </h2>
          <p className="mt-3 whitespace-pre-line text-sm text-foreground">
            {booking.customer_notes.trim() !== ''
              ? booking.customer_notes
              : t('admin.bookings.no_customer_notes')}
          </p>
        </section>
      </div>

      {/* Status actions */}
      <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">
          {t('admin.bookings.section_actions')}
        </h2>
        {transitions.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {t('admin.bookings.status_terminal')}
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {transitions.map((target) => (
              <Button
                key={target}
                variant={ACTION_STYLES[target] ? 'outline' : 'default'}
                className={ACTION_STYLES[target] || undefined}
                onClick={() => {
                  setPendingAction(target)
                  setActionNote('')
                  setActionErrorKey(null)
                }}
              >
                {t(`admin.bookings.action_${target}`)}
              </Button>
            ))}
          </div>
        )}
      </section>

      {/* Internal admin notes */}
      <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">
          {t('admin.bookings.section_admin_notes')}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{t('admin.bookings.admin_notes_hint')}</p>
        <div className="mt-3 flex flex-col gap-2">
          <Label htmlFor="admin-notes" className="sr-only">
            {t('admin.bookings.section_admin_notes')}
          </Label>
          <Textarea
            id="admin-notes"
            value={notesDraft ?? detail.admin_notes}
            onChange={(e) => {
              setNotesDraft(e.target.value)
              setNotesNotice(null)
            }}
            rows={3}
            maxLength={2000}
            placeholder={t('admin.bookings.admin_notes_placeholder')}
          />
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={() => void handleSaveNotes()} disabled={acting}>
              {t('admin.bookings.notes_save')}
            </Button>
            {notesNotice === 'saved' && (
              <p role="status" className="text-sm text-primary">
                {t('admin.bookings.notes_saved')}
              </p>
            )}
            {notesNotice === 'error' && (
              <p role="alert" className="text-sm text-destructive">
                {t('admin.bookings.error_action')}
              </p>
            )}
            {notesNotice === 'invalid' && (
              <p role="alert" className="text-sm text-destructive">
                {t('validation.admin_notes_max')}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* History / audit trail */}
      <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">
          {t('admin.bookings.section_history')}
        </h2>
        <div className="mt-4">
          <BookingStatusTimeline history={history} />
          {history.some((h) => h.note.trim() !== '') && (
            <ul className="mt-3 flex flex-col gap-2">
              {history
                .filter((h) => h.note.trim() !== '')
                .map((h) => (
                  <li
                    key={h.id}
                    className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground"
                  >
                    <span className="font-medium text-foreground">
                      {h.from_status === null
                        ? t('account.timeline_created')
                        : t(`account.status.${h.to_status}`)}
                      {' — '}
                    </span>
                    {h.note}
                  </li>
                ))}
            </ul>
          )}
        </div>
      </section>

      {/* Transition confirmation dialog */}
      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => !open && setPendingAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction ? t(`admin.bookings.action_${pendingAction}`) : ''}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction
                ? t(`admin.bookings.action_confirm_${pendingAction}`, {
                    number: booking.booking_number,
                  })
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="action-note">{t('admin.bookings.action_note_label')}</Label>
            <Textarea
              id="action-note"
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder={t('admin.bookings.action_note_placeholder')}
            />
            <p className="text-xs text-muted-foreground">{t('admin.bookings.action_note_hint')}</p>
            {actionErrorKey && (
              <p role="alert" className="text-sm text-destructive">
                {t(actionErrorKey)}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>{t('admin.caftans.cancel')}</AlertDialogCancel>
            <Button
              onClick={() => void handleConfirmAction()}
              disabled={acting}
              variant={
                pendingAction === 'rejected' || pendingAction === 'cancelled'
                  ? 'destructive'
                  : 'default'
              }
            >
              {pendingAction ? t(`admin.bookings.action_${pendingAction}`) : ''}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
