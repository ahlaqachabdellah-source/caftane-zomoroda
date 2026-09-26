-- ============================================================================
-- Phase 9 test suite — admin dashboard RPCs.
-- Runs in the SAME session as phase1/6/7 (uses their pg_temp helpers and
-- the bookings they created), as the unprivileged "tester" role.
--
-- Covers the Phase 9 §1/§5/§9 requirements:
--   * admin_dashboard_kpis() / admin_recent_activity() are admin-only
--     (customer → 42501, anon → 42501, before any data is read)
--   * KPI values match direct trusted queries (no fake numbers)
--   * revenue estimate covers exactly confirmed + completed
--   * top caftans are ranked by real booking counts (desc)
--   * activity feed merges booking_created / status_change /
--     customer_registered events, newest first, limited
-- ============================================================================

-- --------------------------------------------------------------------------
-- P9-1 … P9-4 — non-admins are rejected (privilege + is_admin() check)
-- --------------------------------------------------------------------------
set role anon;
select set_config('request.jwt.claims', '', false);

do $$ begin
  perform pg_temp.assert_blocked('42501',
    'select public.admin_dashboard_kpis()',
    'P9-1 anon cannot call admin_dashboard_kpis');
  perform pg_temp.assert_blocked('42501',
    'select public.admin_recent_activity(10)',
    'P9-2 anon cannot call admin_recent_activity');
end $$;

set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', false);

do $$ begin
  perform pg_temp.assert_blocked('42501',
    'select public.admin_dashboard_kpis()',
    'P9-3 customer cannot call admin_dashboard_kpis');
  perform pg_temp.assert_blocked('42501',
    'select public.admin_recent_activity(10)',
    'P9-4 customer cannot call admin_recent_activity');
end $$;

-- --------------------------------------------------------------------------
-- P9-5 … P9-11 — admin gets real, consistent numbers
-- (Direct comparison queries run as the same admin JWT: admins may read
--  all bookings via RLS, so both sides are measured through RLS.)
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', false);

do $$
declare
  v_kpi jsonb;
begin
  v_kpi := public.admin_dashboard_kpis();

  perform pg_temp.assert_true(
    (v_kpi ->> 'bookings_this_month')::bigint = (
      select count(*) from public.bookings
      where created_at >= date_trunc('month', now())),
    'P9-5 bookings_this_month matches direct count');

  perform pg_temp.assert_true(
    (v_kpi ->> 'pending_count')::bigint = (
      select count(*) from public.bookings where status = 'pending'),
    'P9-6 pending_count matches direct count');

  perform pg_temp.assert_true(
    (v_kpi ->> 'revenue_estimate')::numeric = (
      select coalesce(sum(total_price), 0) from public.bookings
      where status in ('confirmed', 'completed')),
    'P9-7 revenue_estimate = sum(confirmed + completed)');

  perform pg_temp.assert_true(
    v_kpi -> 'revenue_statuses' = '["confirmed", "completed"]'::jsonb,
    'P9-8 revenue statuses are exactly confirmed + completed');

  -- Top caftans: ranked by real counts, descending, at most 5 rows,
  -- and the leader really is the most-booked caftan.
  perform pg_temp.assert_true(
    jsonb_array_length(v_kpi -> 'top_caftans') <= 5,
    'P9-9 top_caftans capped at 5');

  perform pg_temp.assert_true(
    (v_kpi #>> '{top_caftans,0,booking_count}')::bigint = (
      select count(*) from public.bookings
      where caftan_id = (v_kpi #>> '{top_caftans,0,caftan_id}')::uuid),
    'P9-10 top caftan booking_count matches direct count');

  perform pg_temp.assert_true(
    not exists (
      select 1
      from jsonb_array_elements(v_kpi -> 'top_caftans') with ordinality as a(e, i)
      join jsonb_array_elements(v_kpi -> 'top_caftans') with ordinality as b(e, i)
        on b.i = a.i + 1
      where (a.e ->> 'booking_count')::int < (b.e ->> 'booking_count')::int),
    'P9-11 top_caftans sorted by booking_count desc');
end $$;

-- --------------------------------------------------------------------------
-- P9-12 … P9-16 — activity feed: real events, newest first, limited
-- --------------------------------------------------------------------------
do $$
declare
  v_events jsonb;
begin
  v_events := public.admin_recent_activity(10);

  perform pg_temp.assert_true(
    jsonb_array_length(v_events) <= 10,
    'P9-12 activity feed respects the limit');

  perform pg_temp.assert_true(
    exists (select 1 from jsonb_array_elements(v_events) e
            where e ->> 'type' = 'booking_created'
              and e ->> 'booking_number' like 'CF-%'),
    'P9-13 feed contains booking_created events with booking numbers');

  perform pg_temp.assert_true(
    exists (select 1 from jsonb_array_elements(v_events) e
            where e ->> 'type' = 'status_change'
              and e ->> 'from_status' is not null
              and e ->> 'to_status' is not null),
    'P9-14 feed contains real status_change events');

  -- Registration events are older than the booking traffic above, so they
  -- fall outside a 10-row window: assert them against a generous limit.
  perform pg_temp.assert_true(
    exists (select 1 from jsonb_array_elements(public.admin_recent_activity(100)) e
            where e ->> 'type' = 'customer_registered'),
    'P9-15 feed contains customer_registered events');

  perform pg_temp.assert_true(
    not exists (
      select 1
      from jsonb_array_elements(v_events) with ordinality as a(e, i)
      join jsonb_array_elements(v_events) with ordinality as b(e, i)
        on b.i = a.i + 1
      where (a.e ->> 'occurred_at')::timestamptz
            < (b.e ->> 'occurred_at')::timestamptz),
    'P9-16 feed ordered newest first');
end $$;

-- --------------------------------------------------------------------------
-- The "feed reacts to new activity" assertions live in
-- phase9_admin_reaction_tests.sql: the whole suite file runs as ONE
-- implicit transaction, so history rows created here share this file's
-- now() timestamp. A separate file gets a later transaction timestamp,
-- which is what the newest-first assertions need.
-- --------------------------------------------------------------------------
