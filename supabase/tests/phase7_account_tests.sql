-- ============================================================================
-- Phase 7 test suite — customer account area security.
-- Runs in the SAME session as phase1/phase6 (uses their pg_temp assertion
-- helpers), as the unprivileged "tester" role.
--
-- Covers the Phase 7 §7 requirements:
--   * Customer A cannot read/modify Customer B's bookings
--   * Customer cannot read another customer's status history
--   * Customer cannot modify another customer's profile
--   * Customer cannot escalate their own role
--   * The pending-only cancellation rule cannot be bypassed
--     (confirmed / rejected / completed / already cancelled)
--   * Profile editing persists (own row only)
--   * History table is trigger-only (no direct writes)
-- ============================================================================

-- --------------------------------------------------------------------------
-- Setup: customer 1 creates four bookings (the only allowed insert path),
-- then an admin moves them into every lifecycle state.
-- Dates are far in the future on caftan 2 to avoid any overlap with the
-- phase 1 / phase 6 fixtures.
-- --------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', false);

do $$
declare
  v_confirmed uuid;
  v_rejected uuid;
  v_completed uuid;
  v_cancelled uuid;
begin
  insert into public.bookings (customer_id, caftan_id, start_date, end_date, total_price)
  values ('bbbbbbbb-0000-0000-0000-000000000001',
          '20000000-0000-0000-0000-000000000002',
          date '2027-01-10', date '2027-01-12', 0)
  returning id into v_confirmed;
  insert into test_vars (key, val) values ('p7_confirmed', v_confirmed);

  insert into public.bookings (customer_id, caftan_id, start_date, end_date, total_price)
  values ('bbbbbbbb-0000-0000-0000-000000000001',
          '20000000-0000-0000-0000-000000000002',
          date '2027-02-10', date '2027-02-12', 0)
  returning id into v_rejected;
  insert into test_vars (key, val) values ('p7_rejected', v_rejected);

  insert into public.bookings (customer_id, caftan_id, start_date, end_date, total_price)
  values ('bbbbbbbb-0000-0000-0000-000000000001',
          '20000000-0000-0000-0000-000000000002',
          date '2027-03-10', date '2027-03-12', 0)
  returning id into v_completed;
  insert into test_vars (key, val) values ('p7_completed', v_completed);

  insert into public.bookings (customer_id, caftan_id, start_date, end_date, total_price)
  values ('bbbbbbbb-0000-0000-0000-000000000001',
          '20000000-0000-0000-0000-000000000002',
          date '2027-04-10', date '2027-04-12', 0)
  returning id into v_cancelled;
  insert into test_vars (key, val) values ('p7_cancelled', v_cancelled);

  perform pg_temp.assert_true(true, 'P7-setup four pending bookings created by customer 1');
end $$;

-- Admin moves them into their target lifecycle states.
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', false);

do $$ begin
  update public.bookings set status = 'confirmed'
   where id = (select val from test_vars where key = 'p7_confirmed');
  update public.bookings set status = 'rejected'
   where id = (select val from test_vars where key = 'p7_rejected');
  update public.bookings set status = 'confirmed'
   where id = (select val from test_vars where key = 'p7_completed');
  update public.bookings set status = 'completed'
   where id = (select val from test_vars where key = 'p7_completed');
  update public.bookings set status = 'cancelled'
   where id = (select val from test_vars where key = 'p7_cancelled');
  perform pg_temp.assert_true(true, 'P7-setup admin applied lifecycle states');
end $$;

-- --------------------------------------------------------------------------
-- Act as customer 1 from here on.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', false);

-- P7-1: customer 1 sees ZERO bookings belonging to customer 2.
do $$
declare n int;
begin
  select count(*) into n from public.bookings
   where customer_id = 'cccccccc-0000-0000-0000-000000000001';
  perform pg_temp.assert_true(n = 0,
    'P7-1 customer A cannot read customer B bookings');
end $$;

-- P7-2: customer 1 cannot modify customer 2's booking (row is invisible).
do $$
declare n int;
begin
  update public.bookings set status = 'cancelled'
   where id = (select val from test_vars where key = 'p6_booking2');
  get diagnostics n = row_count;
  perform pg_temp.assert_true(n = 0,
    'P7-2 customer A cannot modify customer B booking');
end $$;

-- P7-3: cannot create a booking in someone else's name.
do $$ begin
  perform pg_temp.assert_blocked('42501', $q$
    insert into public.bookings
      (customer_id, caftan_id, start_date, end_date, total_price)
    values
      ('cccccccc-0000-0000-0000-000000000001',
       '20000000-0000-0000-0000-000000000003',
       date '2027-05-01', date '2027-05-02', 0)$q$,
    'P7-3 customer cannot book on behalf of another customer');
end $$;

-- P7-4/P7-5/P7-6: forged inserts (pre-confirmed, pre-paid, admin notes).
do $$ begin
  perform pg_temp.assert_blocked('42501', $q$
    insert into public.bookings
      (customer_id, caftan_id, start_date, end_date, total_price, status)
    values
      ('bbbbbbbb-0000-0000-0000-000000000001',
       '20000000-0000-0000-0000-000000000003',
       date '2027-05-01', date '2027-05-02', 0, 'confirmed')$q$,
    'P7-4 customer cannot insert a pre-confirmed booking');

  perform pg_temp.assert_blocked('42501', $q$
    insert into public.bookings
      (customer_id, caftan_id, start_date, end_date, total_price, deposit_status)
    values
      ('bbbbbbbb-0000-0000-0000-000000000001',
       '20000000-0000-0000-0000-000000000003',
       date '2027-05-01', date '2027-05-02', 0, 'paid')$q$,
    'P7-5 customer cannot insert a pre-paid booking');

  perform pg_temp.assert_blocked('42501', $q$
    insert into public.bookings
      (customer_id, caftan_id, start_date, end_date, total_price, admin_notes)
    values
      ('bbbbbbbb-0000-0000-0000-000000000001',
       '20000000-0000-0000-0000-000000000003',
       date '2027-05-01', date '2027-05-02', 0, 'forged note')$q$,
    'P7-6 customer cannot attach admin notes');
end $$;

-- P7-7 … P7-10: the pending-only cancellation rule cannot be bypassed.
do $$
declare n int;
begin
  update public.bookings set status = 'cancelled'
   where id = (select val from test_vars where key = 'p7_confirmed');
  get diagnostics n = row_count;
  perform pg_temp.assert_true(n = 0,
    'P7-7 confirmed booking cannot be cancelled by the customer');
  perform pg_temp.assert_true(
    (select status from public.bookings
      where id = (select val from test_vars where key = 'p7_confirmed')) = 'confirmed',
    'P7-7b confirmed booking keeps its status');

  update public.bookings set status = 'cancelled'
   where id = (select val from test_vars where key = 'p7_rejected');
  get diagnostics n = row_count;
  perform pg_temp.assert_true(n = 0,
    'P7-8 rejected booking cannot be cancelled by the customer');

  update public.bookings set status = 'cancelled'
   where id = (select val from test_vars where key = 'p7_completed');
  get diagnostics n = row_count;
  perform pg_temp.assert_true(n = 0,
    'P7-9 completed booking cannot be cancelled by the customer');

  update public.bookings set status = 'cancelled'
   where id = (select val from test_vars where key = 'p7_cancelled');
  get diagnostics n = row_count;
  perform pg_temp.assert_true(n = 0,
    'P7-10 already-cancelled booking cannot be cancelled again');
end $$;

-- P7-11/P7-12: status history visibility follows booking ownership.
do $$
declare n int;
begin
  select count(*) into n from public.booking_status_history
   where booking_id = (select val from test_vars where key = 'p6_booking2');
  perform pg_temp.assert_true(n = 0,
    'P7-11 customer cannot read another customer''s status history');

  select count(*) into n from public.booking_status_history
   where booking_id = (select val from test_vars where key = 'p7_confirmed');
  perform pg_temp.assert_true(n = 2,
    'P7-12 customer reads own history (pending → confirmed)');
end $$;

-- P7-13: history is written only by the SECURITY DEFINER trigger.
do $$ begin
  perform pg_temp.assert_blocked('42501', $q$
    insert into public.booking_status_history
      (booking_id, from_status, to_status, note)
    values
      ((select val from test_vars where key = 'p7_confirmed'),
       'confirmed', 'completed', 'forged')$q$,
    'P7-13 customer cannot write status history directly');
end $$;

-- P7-14: profile rows cannot be inserted or deleted through the API.
do $$
declare n int;
begin
  perform pg_temp.assert_blocked('42501', $q$
    insert into public.profiles (id, full_name)
    values ('dddddddd-0000-0000-0000-000000000001', 'Forged')$q$,
    'P7-14a customer cannot insert a profile row');

  delete from public.profiles
   where id = 'bbbbbbbb-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  perform pg_temp.assert_true(n = 0,
    'P7-14b customer cannot delete a profile row');
end $$;

-- P7-15: editing own profile (name / phone / WhatsApp) persists.
do $$
declare
  p public.profiles;
begin
  update public.profiles
     set full_name = 'Customer One Deluxe',
         phone = '+212600000001',
         whatsapp_number = '+212600000002'
   where id = 'bbbbbbbb-0000-0000-0000-000000000001'
  returning * into p;
  perform pg_temp.assert_true(
    p.full_name = 'Customer One Deluxe'
      and p.phone = '+212600000001'
      and p.whatsapp_number = '+212600000002',
    'P7-15 customer profile edits persist');
end $$;

-- P7-16: role escalation stays impossible even combined with a legit edit.
do $$ begin
  perform pg_temp.assert_blocked('P0001', $q$
    update public.profiles set role = 'admin', city = 'Casablanca'
     where id = 'bbbbbbbb-0000-0000-0000-000000000001'$q$,
    'P7-16 customer cannot escalate own role (even with other fields)');
end $$;

reset role;
