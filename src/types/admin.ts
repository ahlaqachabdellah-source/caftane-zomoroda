import type { BookingStatus, LocalizedText } from './database.types'

/**
 * Admin dashboard payloads (Phase 9) — shapes returned by the
 * admin_dashboard_kpis() / admin_recent_activity() RPCs.
 * Both are computed server-side and only ever returned to admins.
 */

export type AdminTopCaftan = {
  caftan_id: string
  slug: string
  name: LocalizedText
  booking_count: number
}

export type AdminKpis = {
  bookings_this_month: number
  pending_count: number
  revenue_estimate: number
  /** Statuses included in revenue_estimate — surfaced honestly in the UI. */
  revenue_statuses: BookingStatus[]
  top_caftans: AdminTopCaftan[]
  generated_at: string
}

export type AdminActivityType =
  | 'booking_created'
  | 'status_change'
  | 'customer_registered'

export type AdminActivityEvent = {
  type: AdminActivityType
  booking_number: string | null
  customer_name: string | null
  from_status: BookingStatus | null
  to_status: BookingStatus | null
  occurred_at: string
}
