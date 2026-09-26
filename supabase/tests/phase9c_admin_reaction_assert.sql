-- ============================================================================
-- Phase 9 reaction suite — ASSERTIONS (separate implicit transaction, so
-- the confirmation below is strictly newer than the booking_created event
-- recorded in phase9b).
--
-- P9-17 pending_count drops after the confirmation
-- P9-18 newest feed event is the just-recorded confirmation
-- P9-19 feed event carries the customer name
-- ============================================================================

set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', false);

do $$
declare
  v_pending_before bigint;
  v_pending_after  bigint;
  v_top_event      jsonb;
begin
  v_pending_before := (
    public.admin_dashboard_kpis() ->> 'pending_count')::bigint;

  update public.bookings set status = 'confirmed'
  where id = (select val from test_vars where key = 'p9_booking');

  v_pending_after := (
    public.admin_dashboard_kpis() ->> 'pending_count')::bigint;

  perform pg_temp.assert_true(
    v_pending_after = v_pending_before - 1,
    'P9-17 pending_count drops after confirmation');

  v_top_event := public.admin_recent_activity(1) -> 0;
  perform pg_temp.assert_true(
    v_top_event ->> 'type' = 'status_change'
      and v_top_event ->> 'to_status' = 'confirmed'
      and v_top_event ->> 'booking_number' = (
        select booking_number from public.bookings
        where id = (select val from test_vars where key = 'p9_booking')),
    'P9-18 newest feed event is the just-recorded confirmation');

  perform pg_temp.assert_true(
    v_top_event ->> 'customer_name' = 'Customer Two',
    'P9-19 feed event carries the customer name');
end $$;
