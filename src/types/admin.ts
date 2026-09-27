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

export type AdminActivityType = 'booking_created' | 'status_change' | 'customer_registered'

export type AdminActivityEvent = {
  type: AdminActivityType
  booking_number: string | null
  customer_name: string | null
  from_status: BookingStatus | null
  to_status: BookingStatus | null
  occurred_at: string
}

/**
 * Phase 11 payloads — shapes returned by the admin booking/customer RPCs.
 * booking rows never contain admin_notes (the column no longer exists);
 * internal notes come back only inside AdminBookingDetail.
 */
export type AdminBookingListItem = Omit<
  import('./database.types').Booking,
  'updated_at' | 'rental_period'
> & {
  updated_at?: string
  customer: {
    id: string
    full_name: string
    phone: string | null
    whatsapp_number: string | null
    city: string | null
  } | null
  caftan: { id: string; slug: string; name: LocalizedText } | null
}

export type AdminBookingDetail = {
  booking: Omit<import('./database.types').Booking, 'rental_period'> & {
    rental_period?: string
  }
  customer: import('./database.types').Profile | null
  caftan: import('./database.types').Caftan | null
  history: import('./database.types').BookingStatusHistory[]
  admin_notes: string
}

export type AdminCustomerListItem = {
  id: string
  full_name: string
  phone: string | null
  whatsapp_number: string | null
  city: string | null
  created_at: string
  booking_count: number
  last_booking_at: string | null
  last_booking_status: BookingStatus | null
}

export type AdminCustomerBooking = Omit<
  import('./database.types').Booking,
  'updated_at' | 'rental_period'
> & {
  caftan: { id: string; slug: string; name: LocalizedText } | null
}

export type AdminCustomerDetail = {
  profile: import('./database.types').Profile
  bookings: AdminCustomerBooking[]
}

export type AdminOccupancyRow = {
  booking_id: string
  booking_number: string
  status: BookingStatus
  start_date: string
  end_date: string
  customer_name: string | null
  caftan: { id: string; slug: string; name: LocalizedText }
}

/** Server-enforced lifecycle (mirrors admin_update_booking_status). */
export const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  rejected: [],
  completed: [],
  cancelled: [],
}
