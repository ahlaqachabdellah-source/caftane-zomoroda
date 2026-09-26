-- ============================================================================
-- Phase 9 reaction suite — SETUP (separate implicit transaction).
-- customer2 books caftan 1 on far-future dates. The confirmation and the
-- assertions run in phase9c (its own transaction → later now() timestamp),
-- so the status_change event is strictly newer than this booking_created
-- event in the activity feed.
-- ============================================================================

set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', false);

do $$
declare v_id uuid;
begin
  insert into public.bookings (customer_id, caftan_id, start_date, end_date, total_price)
  values ('cccccccc-0000-0000-0000-000000000001',
          '20000000-0000-0000-0000-000000000001',
          date '2028-05-10', date '2028-05-12', 0)
  returning id into v_id;
  insert into test_vars (key, val) values ('p9_booking', v_id);
end $$;
