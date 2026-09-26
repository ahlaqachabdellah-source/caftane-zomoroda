-- ============================================================================
-- Phase 12 DB tests — server-side validation hardening
-- Runs in the same session as phase 1/6/7/9/10/11 (pg_temp.assert_* + test_vars).
-- Verifies the length guards added by 20260927120000_phase12_validation.sql:
-- oversized payloads are rejected server-side even from a tampered client,
-- while valid data still works.
-- ============================================================================

-- P12-1 · customer_notes longer than 500 chars is rejected (23514)
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', false);
do $$ begin
  perform pg_temp.assert_blocked('23514',
    $q$ insert into public.bookings (customer_id, caftan_id, start_date, end_date, customer_notes)
       values ('bbbbbbbb-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
               date '2027-12-01', date '2027-12-02', repeat('x', 501)) $q$,
    'P12-1 customer_notes > 500 rejected');
end $$;

-- P12-2 · exactly 500 chars still works (valid data unaffected)
do $$
declare v_id uuid := gen_random_uuid();
begin
  insert into public.bookings (id, customer_id, caftan_id, start_date, end_date, customer_notes)
  values (v_id, 'bbbbbbbb-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
          date '2027-12-01', date '2027-12-02', repeat('x', 500));
  insert into test_vars (key, val) values ('p12_booking', v_id);
  perform pg_temp.assert_true(
    (select char_length(customer_notes) = 500 from public.bookings where id = v_id),
    'P12-2 customer_notes = 500 accepted');
end $$;

-- Admin context for the RPC guards.
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', false);

-- P12-3 · status note longer than 500 chars rejected, status untouched
do $$ begin
  perform pg_temp.assert_blocked('22023',
    format($q$ select public.admin_update_booking_status('%s', 'confirmed', repeat('x', 501)) $q$,
           (select val from test_vars where key = 'p12_booking')),
    'P12-3 oversized status note rejected');
  perform pg_temp.assert_true(
    (select status = 'pending' from public.bookings
      where id = (select val from test_vars where key = 'p12_booking')),
    'P12-3 status unchanged after rejected note');
end $$;

-- P12-4 · admin notes longer than 2000 chars rejected by the RPC guard
do $$ begin
  perform pg_temp.assert_blocked('22023',
    format($q$ select public.admin_set_booking_notes('%s', repeat('x', 2001)) $q$,
           (select val from test_vars where key = 'p12_booking')),
    'P12-4 oversized admin notes rejected by RPC');
end $$;

-- P12-5 · direct table write with oversized notes blocked by the CHECK
do $$ begin
  perform pg_temp.assert_blocked('23514',
    format($q$ insert into public.booking_admin_notes (booking_id, notes)
              values ('%s', repeat('x', 2001)) $q$,
           (select val from test_vars where key = 'p12_booking')),
    'P12-5 oversized admin notes rejected by CHECK');
end $$;

-- P12-6 · valid note + valid transition still work end to end
do $$
declare v_result jsonb;
begin
  v_result := public.admin_update_booking_status(
    (select val from test_vars where key = 'p12_booking'), 'confirmed', repeat('x', 500));
  perform pg_temp.assert_true(
    v_result ->> 'status' = 'confirmed',
    'P12-6 transition with a 500-char note succeeds');
  perform public.admin_set_booking_notes(
    (select val from test_vars where key = 'p12_booking'), repeat('x', 2000));
  perform pg_temp.assert_true(
    (select char_length(notes) = 2000 from public.booking_admin_notes
      where booking_id = (select val from test_vars where key = 'p12_booking')),
    'P12-6 admin notes of 2000 chars accepted');
end $$;

reset role;
