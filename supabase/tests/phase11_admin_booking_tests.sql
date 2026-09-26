-- ============================================================================
-- Phase 11 DB tests — admin booking & customer management
-- Runs in the same session as phase 1/6/7/9/10 (pg_temp.assert_* + test_vars).
-- IDs: admin aaaaaaaa-…-0001, customer1 bbbbbbbb-…-0001, customer2 cccccccc-…-0001
-- ============================================================================

-- --------------------------------------------------------------------------
-- Setup: customer inserts pending bookings (the only path RLS allows),
-- then the admin moves them into their target lifecycle states directly
-- (fixture setup — the RPC under test is exercised separately below).
-- --------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', false);
do $$
declare
  v_pending   uuid := gen_random_uuid();
  v_confirmed uuid := gen_random_uuid();
  v_rejected  uuid := gen_random_uuid();
  v_completed uuid := gen_random_uuid();
  v_cancelled uuid := gen_random_uuid();
  v_c2        uuid := gen_random_uuid();
begin
  insert into public.bookings
    (id, customer_id, caftan_id, start_date, end_date, customer_notes)
  values
    (v_pending,   'bbbbbbbb-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', date '2027-08-01', date '2027-08-03', 'note cliente'),
    (v_confirmed, 'bbbbbbbb-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', date '2027-08-01', date '2027-08-02', ''),
    (v_rejected,  'bbbbbbbb-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', date '2027-09-01', date '2027-09-02', ''),
    (v_completed, 'bbbbbbbb-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', date '2027-09-05', date '2027-09-06', ''),
    (v_cancelled, 'bbbbbbbb-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', date '2027-10-01', date '2027-10-01', '');

  insert into test_vars (key, val) values
    ('p11_pending', v_pending), ('p11_confirmed', v_confirmed),
    ('p11_rejected', v_rejected), ('p11_completed', v_completed),
    ('p11_cancelled', v_cancelled), ('p11_c2', v_c2);
end $$;

select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', false);
do $$
declare
  v_c2  uuid := (select val from test_vars where key = 'p11_c2');
  v_c2b uuid := gen_random_uuid();
begin
  insert into public.bookings
    (id, customer_id, caftan_id, start_date, end_date)
  values
    (v_c2,  'cccccccc-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003',
     date '2027-08-10', date '2027-08-12'),
    (v_c2b, 'cccccccc-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003',
     date '2027-11-01', date '2027-11-02');
  insert into test_vars (key, val) values ('p11_c2_confirmed', v_c2b);
end $$;

-- Admin applies lifecycle states + fixture deposit statuses + one note.
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', false);
do $$ begin
  update public.bookings set status = 'confirmed', deposit_status = 'paid'
   where id = (select val from test_vars where key = 'p11_confirmed');
  update public.bookings set status = 'rejected'
   where id = (select val from test_vars where key = 'p11_rejected');
  update public.bookings set status = 'confirmed'
   where id = (select val from test_vars where key = 'p11_completed');
  update public.bookings set status = 'completed', deposit_status = 'refunded'
   where id = (select val from test_vars where key = 'p11_completed');
  update public.bookings set status = 'cancelled'
   where id = (select val from test_vars where key = 'p11_cancelled');
  update public.bookings set status = 'confirmed'
   where id = (select val from test_vars where key = 'p11_c2_confirmed');
  insert into public.booking_admin_notes (booking_id, notes)
  values ((select val from test_vars where key = 'p11_pending'), 'Dossier VIP');
end $$;
reset role;

-- --------------------------------------------------------------------------
-- Read RPCs — access control (anon)
-- --------------------------------------------------------------------------
set role anon;
do $$ begin
  perform pg_temp.assert_blocked('42501',
    $q$select public.admin_list_bookings()$q$,
    'P11-1 anon cannot list admin bookings');
  perform pg_temp.assert_blocked('42501',
    $q$select public.admin_caftan_occupancy(date '2027-08-01', date '2027-08-31')$q$,
    'P11-2 anon cannot read occupancy');
end $$;
reset role;

-- --------------------------------------------------------------------------
-- Access control (customer1)
-- --------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', false);

do $$ begin
  perform pg_temp.assert_blocked('42501',
    $q$select public.admin_list_bookings()$q$,
    'P11-3 customer cannot list admin bookings');
  perform pg_temp.assert_blocked('42501',
    $q$select public.admin_list_customers()$q$,
    'P11-4 customer cannot list customers');
  perform pg_temp.assert_blocked('42501',
    $q$select public.admin_get_booking((select val from test_vars where key = 'p11_pending'))$q$,
    'P11-5 customer cannot fetch an admin booking detail (IDOR blocked)');
  perform pg_temp.assert_blocked('42501',
    $q$select public.admin_get_customer('bbbbbbbb-0000-0000-0000-000000000001')$q$,
    'P11-6 customer cannot fetch a customer detail, even their own');
  perform pg_temp.assert_blocked('42501',
    $q$select public.admin_caftan_occupancy(date '2027-08-01', date '2027-08-31')$q$,
    'P11-7 customer cannot read occupancy');

  -- booking_admin_notes: RLS hides every row from customers (no error, 0 rows)
  perform pg_temp.assert_true(
    (select count(*) from public.booking_admin_notes) = 0,
    'P11-8 customer sees zero admin-notes rows');
  perform pg_temp.assert_blocked('42501',
    $q$insert into public.booking_admin_notes (booking_id, notes)
       values ((select val from test_vars where key = 'p11_pending'), 'forged')$q$,
    'P11-9 customer cannot write admin notes');

  -- Status transition RPC — non-admin
  perform pg_temp.assert_blocked('42501',
    $q$select public.admin_update_booking_status(
         (select val from test_vars where key = 'p11_pending'), 'confirmed')$q$,
    'P11-10 customer cannot run admin status transitions');
  perform pg_temp.assert_blocked('42501',
    $q$select public.admin_set_booking_notes(
         (select val from test_vars where key = 'p11_pending'), 'x')$q$,
    'P11-11 customer cannot set admin notes via RPC');

  -- bookings.admin_notes column is gone (moved to booking_admin_notes)
  perform pg_temp.assert_true(
    not exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'bookings'
                  and column_name = 'admin_notes'),
    'P11-12 bookings.admin_notes column removed');

  -- Customer reads of own bookings still work after the refactor
  perform pg_temp.assert_true(
    (select count(*) from public.bookings
      where customer_id = 'bbbbbbbb-0000-0000-0000-000000000001') >= 5,
    'P11-13 customer still reads own bookings');
end $$;
reset role;

-- --------------------------------------------------------------------------
-- Status transitions — admin, lifecycle enforcement
-- --------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', false);

do $$ begin
  -- Invalid: pending → completed (skips confirmation)
  perform pg_temp.assert_blocked('22023', $q$
    select public.admin_update_booking_status(
      (select val from test_vars where key = 'p11_pending'), 'completed')$q$,
    'P11-14 pending→completed rejected');
  perform pg_temp.assert_true(
    (select status from public.bookings
      where id = (select val from test_vars where key = 'p11_pending')) = 'pending',
    'P11-15 rejected transition leaves status unchanged');

  -- Invalid: same status (duplicate operation)
  perform pg_temp.assert_blocked('22023', $q$
    select public.admin_update_booking_status(
      (select val from test_vars where key = 'p11_pending'), 'pending')$q$,
    'P11-16 same-status duplicate rejected');

  -- Invalid: unknown status value
  perform pg_temp.assert_blocked('22023', $q$
    select public.admin_update_booking_status(
      (select val from test_vars where key = 'p11_pending'), 'archived')$q$,
    'P11-17 unknown status rejected');

  -- Not found
  perform pg_temp.assert_blocked('P0002', $q$
    select public.admin_update_booking_status(
      '99999999-9999-9999-9999-999999999999', 'confirmed')$q$,
    'P11-18 missing booking rejected');
  perform pg_temp.assert_blocked('P0002', $q$
    select public.admin_set_booking_notes(
      '99999999-9999-9999-9999-999999999999', 'x')$q$,
    'P11-19 notes on missing booking rejected');
  perform pg_temp.assert_blocked('P0002', $q$
    select public.admin_get_booking('99999999-9999-9999-9999-999999999999')$q$,
    'P11-20 detail of missing booking rejected');

  -- Terminal states have no outgoing transitions
  perform pg_temp.assert_blocked('22023', $q$
    select public.admin_update_booking_status(
      (select val from test_vars where key = 'p11_rejected'), 'confirmed')$q$,
    'P11-21 rejected is terminal');
  perform pg_temp.assert_blocked('22023', $q$
    select public.admin_update_booking_status(
      (select val from test_vars where key = 'p11_completed'), 'cancelled')$q$,
    'P11-22 completed is terminal');
  perform pg_temp.assert_blocked('22023', $q$
    select public.admin_update_booking_status(
      (select val from test_vars where key = 'p11_cancelled'), 'pending')$q$,
    'P11-23 cancelled is terminal');
end $$;

-- Valid: pending → confirmed, with a customer-visible reason note
do $$
declare
  v_id uuid := (select val from test_vars where key = 'p11_pending');
  v_result jsonb;
begin
  v_result := public.admin_update_booking_status(v_id, 'confirmed', 'Confirmée par téléphone');
  perform pg_temp.assert_true(v_result ->> 'status' = 'confirmed',
    'P11-24 confirm returns the updated booking');
  perform pg_temp.assert_true(
    (select status from public.bookings where id = v_id) = 'confirmed',
    'P11-25 status persisted');
  perform pg_temp.assert_true(
    exists (select 1 from public.booking_status_history
            where booking_id = v_id
              and from_status = 'pending' and to_status = 'confirmed'
              and changed_by = 'aaaaaaaa-0000-0000-0000-000000000001'
              and note = 'Confirmée par téléphone'),
    'P11-26 audit row written with admin uid + note');
end $$;

-- Valid: confirmed → completed / confirmed → cancelled
do $$
declare v_id uuid := gen_random_uuid();
begin
  perform pg_temp.assert_true(
    public.admin_update_booking_status(
      (select val from test_vars where key = 'p11_confirmed'), 'completed') ->> 'status' = 'completed',
    'P11-27 confirmed→completed');

  v_id := (select val from test_vars where key = 'p11_c2_confirmed');
  perform pg_temp.assert_true(
    public.admin_update_booking_status(v_id, 'cancelled') ->> 'status' = 'cancelled',
    'P11-28 confirmed→cancelled');
end $$;

-- --------------------------------------------------------------------------
-- Admin notes RPC
-- --------------------------------------------------------------------------
do $$
declare v_id uuid := (select val from test_vars where key = 'p11_pending');
begin
  perform public.admin_set_booking_notes(v_id, '  Note interne mise à jour  ');
  perform pg_temp.assert_true(
    (select notes from public.booking_admin_notes where booking_id = v_id)
      = 'Note interne mise à jour',
    'P11-29 admin notes upserted and trimmed');
end $$;

-- --------------------------------------------------------------------------
-- Read RPCs — admin content
-- --------------------------------------------------------------------------
do $$
declare
  v_id uuid := (select val from test_vars where key = 'p11_pending');
  v_list jsonb := public.admin_list_bookings();
  v_detail jsonb;
begin
  perform pg_temp.assert_true(
    exists (select 1 from jsonb_array_elements(v_list) e
            where e ->> 'id' = v_id::text
              and e -> 'customer' ->> 'full_name' is not null
              and e -> 'caftan' ->> 'slug' is not null),
    'P11-30 list embeds customer + caftan');
  perform pg_temp.assert_true(
    not exists (select 1 from jsonb_array_elements(v_list) e
                where e ? 'admin_notes'),
    'P11-31 list rows carry no internal notes column');

  v_detail := public.admin_get_booking(v_id);
  perform pg_temp.assert_true(
    v_detail -> 'booking' ->> 'id' = v_id::text
      and v_detail -> 'customer' ->> 'id'
            = 'bbbbbbbb-0000-0000-0000-000000000001'
      and v_detail -> 'caftan' ->> 'id'
            = '20000000-0000-0000-0000-000000000001',
    'P11-32 detail returns booking + customer + caftan');
  perform pg_temp.assert_true(
    jsonb_array_length(v_detail -> 'history') >= 2,
    'P11-33 detail returns chronological history (created + confirmed)');
  perform pg_temp.assert_true(
    v_detail ->> 'admin_notes' = 'Note interne mise à jour',
    'P11-34 detail returns internal notes');
end $$;

-- --------------------------------------------------------------------------
-- Customer management RPCs
-- --------------------------------------------------------------------------
do $$
declare
  v_customers jsonb := public.admin_list_customers();
  v_detail jsonb;
  v_c1_count int;
begin
  select count(*) into v_c1_count from public.bookings
    where customer_id = 'bbbbbbbb-0000-0000-0000-000000000001';

  perform pg_temp.assert_true(
    exists (select 1 from jsonb_array_elements(v_customers) e
            where e ->> 'id' = 'bbbbbbbb-0000-0000-0000-000000000001'
              and (e ->> 'booking_count')::int = v_c1_count
              and e ->> 'last_booking_status' is not null),
    'P11-35 customer list has accurate aggregates');
  perform pg_temp.assert_true(
    not exists (select 1 from jsonb_array_elements(v_customers) e
                where e ->> 'id' = 'aaaaaaaa-0000-0000-0000-000000000001'),
    'P11-36 admins are excluded from the customer list');

  v_detail := public.admin_get_customer('bbbbbbbb-0000-0000-0000-000000000001');
  perform pg_temp.assert_true(
    v_detail -> 'profile' ->> 'id' = 'bbbbbbbb-0000-0000-0000-000000000001'
      and jsonb_array_length(v_detail -> 'bookings') = v_c1_count,
    'P11-37 customer detail returns profile + full booking history');

  perform pg_temp.assert_blocked('P0002', $q$
    select public.admin_get_customer('99999999-9999-9999-9999-999999999999')$q$,
    'P11-38 missing customer rejected');
end $$;
reset role;

-- --------------------------------------------------------------------------
-- Occupancy feed
-- --------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', false);
do $$
declare
  v_aug jsonb := public.admin_caftan_occupancy(date '2027-08-01', date '2027-08-31');
  v_far jsonb := public.admin_caftan_occupancy(date '2030-01-01', date '2030-01-31');
begin
  perform pg_temp.assert_true(
    exists (select 1 from jsonb_array_elements(v_aug) e
            where e ->> 'booking_id'
                  = (select val::text from test_vars where key = 'p11_pending')
              and e ->> 'status' = 'confirmed'),
    'P11-39 occupancy includes the confirmed August booking');
  perform pg_temp.assert_true(
    not exists (select 1 from jsonb_array_elements(v_aug) e
                where e ->> 'status' in ('cancelled', 'rejected')),
    'P11-40 occupancy never lists cancelled/rejected bookings');
  perform pg_temp.assert_true(
    jsonb_array_length(v_far) = 0,
    'P11-41 occupancy outside any rental period is empty');
end $$;
reset role;
