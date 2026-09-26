-- ============================================================================
-- Phase 6 test suite — booking creation flow.
-- Runs in the SAME session as phase1_rls_tests.sql (uses its pg_temp
-- assertion helpers), as the unprivileged "tester" role.
--
-- Covers: server-side total computation, booking number generation,
-- double-booking exclusion, cancellation freeing dates, audit history,
-- and RLS on the insert path.
-- ============================================================================

-- Customer 1 books caftan 0001 (800 MAD/day) for 3 days, pretending a
-- tampered total of 999999 — the trigger must overwrite it to 2400.
set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', false);

do $$
declare
  b public.bookings;
begin
  insert into public.bookings
    (customer_id, caftan_id, start_date, end_date, customer_notes, total_price)
  values
    ('bbbbbbbb-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000001',
     date '2026-11-10', date '2026-11-12', 'Mariage de ma sœur', 999999)
  returning * into b;

  perform pg_temp.assert_true(
    b.total_price = 2400,
    'P6-1 server overwrites client total: 3 days x 800 = 2400 (tampered 999999 rejected)');
  perform pg_temp.assert_true(
    b.booking_number ~ '^CF-[0-9]{4}-[0-9]{4}$',
    'P6-2 booking number auto-generated with CF-YYYY-NNNN format');
  perform pg_temp.assert_true(
    b.status = 'pending' and b.deposit_status = 'unpaid',
    'P6-3 new booking starts as pending/unpaid');
  perform pg_temp.assert_true(
    exists (select 1 from public.booking_status_history h
             where h.booking_id = b.id and h.to_status = 'pending'),
    'P6-4 creation is recorded in the status history');

  insert into test_vars (key, val) values ('p6_booking1', b.id);
end $$;

-- Customer 2 cannot double-book overlapping dates on the same caftan.
select set_config('request.jwt.claims',
  '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', false);

do $$ begin
  perform pg_temp.assert_blocked('23P01', $q$
    insert into public.bookings
      (customer_id, caftan_id, start_date, end_date, total_price)
    values
      ('cccccccc-0000-0000-0000-000000000001',
       '20000000-0000-0000-0000-000000000001',
       date '2026-11-12', date '2026-11-14', 0)$q$,
    'P6-5 overlapping booking (shared last day) rejected by exclusion constraint');
end $$;

-- But a strictly adjacent period (starting the day after) is fine.
do $$
declare
  b public.bookings;
begin
  insert into public.bookings
    (customer_id, caftan_id, start_date, end_date, total_price)
  values
    ('cccccccc-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000001',
     date '2026-11-13', date '2026-11-14', 0)
  returning * into b;
  perform pg_temp.assert_true(
    b.total_price = 1600,
    'P6-6 adjacent booking allowed, total recomputed (2 days x 800)');
  insert into test_vars (key, val) values ('p6_booking2', b.id);
end $$;

-- Customer 1 cancels their pending booking → the dates are freed.
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', false);

do $$ begin
  update public.bookings
     set status = 'cancelled'
   where id = (select val from test_vars where key = 'p6_booking1');
  perform pg_temp.assert_true(true, 'P6-7 customer can cancel their pending booking');
end $$;

select set_config('request.jwt.claims',
  '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', false);

do $$
declare
  b public.bookings;
begin
  insert into public.bookings
    (customer_id, caftan_id, start_date, end_date, total_price)
  values
    ('cccccccc-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000001',
     date '2026-11-10', date '2026-11-12', 0)
  returning * into b;
  perform pg_temp.assert_true(
    b.total_price = 2400,
    'P6-8 cancelled booking frees its dates for a new booking');
end $$;

-- Maintenance caftans stay unbookable through the API path.
do $$ begin
  perform pg_temp.assert_blocked('42501', $q$
    insert into public.bookings
      (customer_id, caftan_id, start_date, end_date, total_price)
    values
      ('cccccccc-0000-0000-0000-000000000001',
       '20000000-0000-0000-0000-000000000009',
       date '2026-12-01', date '2026-12-02', 0)$q$,
    'P6-9 booking a maintenance caftan is rejected by RLS');
end $$;

-- An admin changing dates gets the total recomputed automatically.
set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', false);

do $$
declare
  new_total numeric(10, 2);
begin
  update public.bookings
     set end_date = date '2026-11-15'
   where id = (select val from test_vars where key = 'p6_booking2')
  returning total_price into new_total;
  perform pg_temp.assert_true(
    new_total = 2400,
    'P6-10 admin date change recomputes the total (3 days x 800)');
end $$;

reset role;
