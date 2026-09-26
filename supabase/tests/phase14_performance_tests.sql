-- ============================================================================
-- Phase 14 DB tests — performance indexes exist and RLS is unchanged.
-- Runs after phase 13 in the same session (pg_temp.assert_* available).
-- ============================================================================

-- P14-1 · the Phase 14 indexes exist
do $$ begin
  perform pg_temp.assert_true(
    (select count(*) = 3 from pg_indexes
      where schemaname = 'public'
        and indexname in ('bookings_created_at_idx',
                          'booking_status_history_created_idx',
                          'profiles_role_created_idx')),
    'P14-1 performance indexes created');
end $$;

-- P14-2 · the pre-existing hot-path indexes are still there (nothing dropped)
do $$ begin
  perform pg_temp.assert_true(
    (select count(*) >= 5 from pg_indexes
      where schemaname = 'public'
        and indexname in ('bookings_customer_idx', 'bookings_status_idx',
                          'bookings_caftan_status_idx', 'caftans_status_idx',
                          'booking_status_history_booking_idx')),
    'P14-2 pre-existing indexes preserved');
end $$;

-- P14-3 · RLS still enabled everywhere (index migration changed no security)
do $$ begin
  perform pg_temp.assert_true(
    (select count(*) = 0
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and c.relname in ('profiles', 'categories', 'caftans', 'caftan_images',
                          'bookings', 'booking_status_history', 'site_settings',
                          'booking_admin_notes')
        and not c.relrowsecurity),
    'P14-3 RLS still enabled on every application table');
end $$;
