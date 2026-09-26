-- ============================================================================
-- Migration 0014: Query-performance indexes (Phase 14)
--
-- Read-path indexes only — no table, policy, trigger or function changes,
-- so RLS/security behavior from Phases 1–13 is untouched.
--
--   * bookings(created_at desc)        — admin_dashboard_kpis counts the
--     current month's bookings; admin_list_bookings returns newest first.
--   * booking_status_history(created_at desc) — admin_recent_activity feeds
--     the dashboard from the newest history rows.
--   * profiles(role, created_at desc)  — admin_list_customers filters
--     role='customer' and returns newest customers first.
--
-- Existing indexes already cover the hot equality paths (bookings by
-- customer, by status, by caftan+status; history by booking; caftans by
-- category/status/featured). These additions target the time-ordered
-- aggregation feeds introduced by the admin dashboard.
-- ============================================================================

create index if not exists bookings_created_at_idx
  on public.bookings (created_at desc);

create index if not exists booking_status_history_created_idx
  on public.booking_status_history (created_at desc);

create index if not exists profiles_role_created_idx
  on public.profiles (role, created_at desc);
