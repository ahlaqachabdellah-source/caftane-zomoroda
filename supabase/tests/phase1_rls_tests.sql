-- ============================================================================
-- Phase 1 test suite — RLS policies, constraints, triggers, storage.
-- Runs as the unprivileged "tester" role (member of anon + authenticated),
-- so row-level security is fully enforced.
--
-- Every check raises an exception on failure (the runner treats any error
-- as a failed suite) and prints "ok - ..." on success.
-- ============================================================================

-- --------------------------------------------------------------------------
-- Assertion helpers (session temp schema, created before any SET ROLE)
-- --------------------------------------------------------------------------
create temp table if not exists test_vars (key text primary key, val uuid);
-- Temp objects are privilege-checked against the CURRENT role, so after
-- SET ROLE the anon/authenticated roles need explicit rights on them.
grant all on table test_vars to anon, authenticated;

create or replace function pg_temp.assert_true(cond boolean, msg text)
returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then
    raise exception 'TEST FAILED: %', msg;
  end if;
  raise notice 'ok - %', msg;
end $$;

-- Assert that a statement fails with a specific SQLSTATE.
create or replace function pg_temp.assert_blocked(p_sqlstate text, p_sql text, p_msg text)
returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'TEST FAILED: % (expected SQLSTATE % but statement succeeded)', p_msg, p_sqlstate;
exception
  when others then
    if sqlerrm like 'TEST FAILED:%' then
      raise;
    elsif sqlstate = p_sqlstate then
      raise notice 'ok - %', p_msg;
    else
      raise exception 'TEST FAILED: % (expected SQLSTATE %, got %: %)',
        p_msg, p_sqlstate, sqlstate, sqlerrm;
    end if;
end $$;

-- ==========================================================================
-- SECTION A — anonymous visitor (no JWT)
-- ==========================================================================
set role anon;
select set_config('request.jwt.claims', '', false);

do $$ begin
  perform pg_temp.assert_true(
    (select count(*) from public.categories) = 3,
    'A1 anon can read categories');
  perform pg_temp.assert_true(
    (select count(*) from public.caftans) = 9,
    'A2 anon sees 9 caftans (retired hidden)');
  perform pg_temp.assert_true(
    not exists (select 1 from public.caftans where status = 'retired'),
    'A2b anon cannot see retired caftans');
  perform pg_temp.assert_true(
    (select count(*) from public.caftan_images i
      where i.caftan_id = '20000000-0000-0000-0000-000000000010') = 0,
    'A3 anon cannot see images of a retired caftan');
  perform pg_temp.assert_true(
    (select count(*) from public.bookings) = 0,
    'A5 anon cannot read bookings');
  perform pg_temp.assert_true(
    (select count(*) from public.site_settings) = 1,
    'A6 anon can read site settings (WhatsApp number etc.)');
  perform pg_temp.assert_true(
    (select count(*) from public.booking_status_history) = 0,
    'A8 anon cannot read booking history');
  perform pg_temp.assert_true(
    (select count(*) from public.profiles) = 0,
    'A9 anon cannot read profiles');
end $$;

do $$
declare n int;
begin
  perform pg_temp.assert_blocked('42501', $q$
    insert into public.caftans (slug, category_id, name, price_per_day)
    values ('hacker', '10000000-0000-0000-0000-000000000001',
            '{"ar":"x","fr":"x","en":"x"}', 1)$q$,
    'A4 anon cannot insert a caftan');

  update public.site_settings set whatsapp_number = '+1000000000';
  get diagnostics n = row_count;
  perform pg_temp.assert_true(n = 0, 'A7 anon cannot update site settings');
end $$;

-- ==========================================================================
-- SECTION B — customer 1 (authenticated)
-- ==========================================================================
set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-0000-0000-0000-000000000001"}', false);

-- B1: create a valid booking request
do $$
declare v_id uuid;
begin
  insert into public.bookings
    (customer_id, caftan_id, start_date, end_date, total_price, customer_notes)
  values
    ('bbbbbbbb-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000001',
     current_date + 30, current_date + 33, 2400.00, 'Mariage à Casablanca')
  returning id into v_id;

  insert into test_vars (key, val) values ('booking1', v_id);

  perform pg_temp.assert_true(
    exists (select 1 from public.bookings
            where id = v_id and booking_number ~ '^CF-[0-9]{4}-[0-9]{4}$'),
    'B1 booking_number generated as CF-YYYY-NNNN');
  perform pg_temp.assert_true(
    exists (select 1 from public.booking_status_history
            where booking_id = v_id and from_status is null and to_status = 'pending'),
    'B1b initial status written to history');
end $$;

do $$
declare v_b1 uuid := (select val from test_vars where key = 'booking1');
declare n int;
begin
  -- B2: cannot self-confirm
  perform pg_temp.assert_blocked('42501', $q$
    insert into public.bookings
      (customer_id, caftan_id, start_date, end_date, total_price, status)
    values
      ('bbbbbbbb-0000-0000-0000-000000000001',
       '20000000-0000-0000-0000-000000000002',
       current_date + 60, current_date + 61, 1200.00, 'confirmed')$q$,
    'B2 customer cannot insert a pre-confirmed booking');

  -- B3: cannot inject admin notes (Phase 11: notes live in the admin-only
  -- booking_admin_notes table; customers have no write policy at all)
  perform pg_temp.assert_blocked('42501', $q$
    insert into public.booking_admin_notes (booking_id, notes)
    values
      ((select val from test_vars where key = 'booking1'), 'vip')$q$,
    'B3 customer cannot set admin_notes');

  -- B4/B5: cannot book a retired or under-maintenance caftan
  perform pg_temp.assert_blocked('42501', $q$
    insert into public.bookings
      (customer_id, caftan_id, start_date, end_date, total_price)
    values
      ('bbbbbbbb-0000-0000-0000-000000000001',
       '20000000-0000-0000-0000-000000000010',
       current_date + 60, current_date + 61, 350.00)$q$,
    'B4 customer cannot book a retired caftan');

  perform pg_temp.assert_blocked('42501', $q$
    insert into public.bookings
      (customer_id, caftan_id, start_date, end_date, total_price)
    values
      ('bbbbbbbb-0000-0000-0000-000000000001',
       '20000000-0000-0000-0000-000000000009',
       current_date + 60, current_date + 61, 1800.00)$q$,
    'B5 customer cannot book a caftan under maintenance');

  -- B6: overlapping request on the same caftan is physically impossible
  perform pg_temp.assert_blocked('23P01', $q$
    insert into public.bookings
      (customer_id, caftan_id, start_date, end_date, total_price)
    values
      ('bbbbbbbb-0000-0000-0000-000000000001',
       '20000000-0000-0000-0000-000000000001',
       current_date + 32, current_date + 35, 2400.00)$q$,
    'B6 overlapping booking on same caftan blocked by exclusion constraint');

  -- B7: same dates on a different caftan is fine
  insert into public.bookings
    (customer_id, caftan_id, start_date, end_date, total_price)
  values
    ('bbbbbbbb-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000002',
     current_date + 30, current_date + 33, 3600.00)
  returning id into v_b1; -- reuse variable, store booking2 below
  insert into test_vars (key, val) values ('booking2', v_b1);
  perform pg_temp.assert_true(true, 'B7 same dates on a different caftan allowed');

  -- B8: sees exactly own 2 bookings
  perform pg_temp.assert_true(
    (select count(*) from public.bookings) = 2,
    'B8 customer sees only own bookings');

  -- B9: cancel own pending booking
  update public.bookings set status = 'cancelled'
  where id = (select val from test_vars where key = 'booking1');
  get diagnostics n = row_count;
  perform pg_temp.assert_true(n = 1, 'B9 customer can cancel own pending booking');
  perform pg_temp.assert_true(
    exists (select 1 from public.booking_status_history
            where booking_id = (select val from test_vars where key = 'booking1')
              and from_status = 'pending' and to_status = 'cancelled'),
    'B9b cancellation recorded in history');

  -- B10: new pending booking for tamper tests
  insert into public.bookings
    (customer_id, caftan_id, start_date, end_date, total_price)
  values
    ('bbbbbbbb-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000001',
     current_date + 40, current_date + 42, 1600.00)
  returning id into v_b1;
  insert into test_vars (key, val) values ('booking3', v_b1);
  perform pg_temp.assert_true(true, 'B10 second pending booking created');

  -- B11: cannot tamper with the price (trigger)
  perform pg_temp.assert_blocked('P0001', format($q$
    update public.bookings set total_price = 1 where id = %L$q$,
    (select val from test_vars where key = 'booking3')),
    'B11 customer cannot modify total_price (trigger)');

  -- B12: cannot self-confirm via update (BEFORE UPDATE trigger fires first,
  --      ahead of the RLS WITH CHECK — both layers block it)
  perform pg_temp.assert_blocked('P0001', format($q$
    update public.bookings set status = 'confirmed' where id = %L$q$,
    (select val from test_vars where key = 'booking3')),
    'B12 customer cannot confirm own booking');

  -- B13: cannot delete bookings
  delete from public.bookings
  where id = (select val from test_vars where key = 'booking3');
  get diagnostics n = row_count;
  perform pg_temp.assert_true(n = 0, 'B13 customer cannot delete a booking');

  -- B14/B15: profile rules
  update public.profiles set full_name = 'Customer One Updated'
  where id = 'bbbbbbbb-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  perform pg_temp.assert_true(n = 1, 'B14 customer can update own profile name');

  perform pg_temp.assert_blocked('P0001', $q$
    update public.profiles set role = 'admin'
    where id = 'bbbbbbbb-0000-0000-0000-000000000001'$q$,
    'B15 customer cannot escalate own role to admin');

  -- B16/B17: cannot touch or see other users
  update public.profiles set full_name = 'Hacked'
  where id = 'cccccccc-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  perform pg_temp.assert_true(n = 0, 'B16 customer cannot update another profile');
  perform pg_temp.assert_true(
    (select count(*) from public.profiles) = 1,
    'B17 customer sees only own profile');

  -- B18: cannot upload caftan images
  perform pg_temp.assert_blocked('42501', $q$
    insert into storage.objects (bucket_id, name)
    values ('caftan-images', 'hack.jpg')$q$,
    'B18 customer cannot upload to caftan-images bucket');
end $$;

-- ==========================================================================
-- SECTION C — customer 2 (isolation between customers)
-- ==========================================================================
select set_config('request.jwt.claims',
  '{"sub":"cccccccc-0000-0000-0000-000000000001"}', false);

do $$
declare v_id uuid;
begin
  -- C1: non-overlapping booking on caftan 1
  insert into public.bookings
    (customer_id, caftan_id, start_date, end_date, total_price)
  values
    ('cccccccc-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000001',
     current_date + 50, current_date + 52, 1600.00)
  returning id into v_id;
  perform pg_temp.assert_true(true, 'C1 customer2 books free slot on caftan 1');

  -- C2: overlapping dates but a different caftan
  insert into public.bookings
    (customer_id, caftan_id, start_date, end_date, total_price)
  values
    ('cccccccc-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000003',
     current_date + 31, current_date + 32, 700.00);
  perform pg_temp.assert_true(true, 'C2 overlapping dates on another caftan allowed');

  -- C3/C4: strict isolation
  perform pg_temp.assert_true(
    (select count(*) from public.bookings) = 2,
    'C3 customer2 sees only own bookings');
  perform pg_temp.assert_true(
    not exists (
      select 1 from public.bookings b
      where b.id = (select val from test_vars where key = 'booking1')),
    'C4 customer2 cannot read customer1 bookings');
end $$;

-- ==========================================================================
-- SECTION D — admin
-- ==========================================================================
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001"}', false);

do $$
declare
  v_id uuid;
  n int;
begin
  perform pg_temp.assert_true(
    (select count(*) from public.bookings) = 5,
    'D1 admin sees all 5 bookings');

  -- D2: confirm customer1's pending booking (+ internal note, Phase 11 table)
  update public.bookings
  set status = 'confirmed'
  where id = (select val from test_vars where key = 'booking3');
  insert into public.booking_admin_notes (booking_id, notes)
  values ((select val from test_vars where key = 'booking3'), 'Confirmed by phone');
  get diagnostics n = row_count;
  perform pg_temp.assert_true(n = 1, 'D2 admin can confirm a booking');
  perform pg_temp.assert_true(
    exists (select 1 from public.booking_status_history
            where booking_id = (select val from test_vars where key = 'booking3')
              and from_status = 'pending' and to_status = 'confirmed'),
    'D2b confirmation recorded in history');

  -- D3: admin can adjust price
  update public.bookings set total_price = 3000.00
  where id = (select val from test_vars where key = 'booking2');
  get diagnostics n = row_count;
  perform pg_temp.assert_true(n = 1, 'D3 admin can adjust total_price');

  -- D4-D6: caftan CRUD
  insert into public.caftans (slug, category_id, name, price_per_day)
  values ('test-admin-caftan', '10000000-0000-0000-0000-000000000001',
          '{"ar":"اختبار","fr":"Test","en":"Test"}', 500.00)
  returning id into v_id;
  perform pg_temp.assert_true(true, 'D4 admin can create a caftan');

  update public.caftans set color = 'Vert' where id = v_id;
  get diagnostics n = row_count;
  perform pg_temp.assert_true(n = 1, 'D5 admin can update a caftan');

  delete from public.caftans where id = v_id;
  get diagnostics n = row_count;
  perform pg_temp.assert_true(n = 1, 'D6 admin can delete a caftan');

  -- D7: site settings
  update public.site_settings set whatsapp_number = '+212611111111' where id = 1;
  get diagnostics n = row_count;
  perform pg_temp.assert_true(n = 1, 'D7 admin can update site settings');

  -- D8: storage write
  insert into storage.objects (bucket_id, name)
  values ('caftan-images', 'admin-upload.jpg')
  returning id into v_id;
  perform pg_temp.assert_true(true, 'D8 admin can upload to caftan-images bucket');
  delete from storage.objects where id = v_id;
  get diagnostics n = row_count;
  perform pg_temp.assert_true(n = 1, 'D8b admin can delete from caftan-images bucket');

  -- D9/D10: full visibility
  perform pg_temp.assert_true(
    (select count(*) from public.profiles) = 3,
    'D9 admin sees all profiles');
  perform pg_temp.assert_true(
    (select count(*) from public.caftans where status = 'retired') = 1,
    'D10 admin sees retired caftans');
  perform pg_temp.assert_true(
    (select count(*) from public.caftan_images i
      where i.caftan_id = '20000000-0000-0000-0000-000000000010') = 1,
    'D10b admin sees images of retired caftans');

  -- D11: full audit trail readable (2 rows for booking1 + booking3,
  --      1 each for booking2, C1, C2 bookings)
  perform pg_temp.assert_true(
    (select count(*) from public.booking_status_history) = 7,
    'D11 admin reads the complete status history');
end $$;

-- ==========================================================================
-- SECTION E — data integrity constraints (as admin)
-- ==========================================================================
do $$
declare v_booking3 uuid := (select val from test_vars where key = 'booking3');
begin
  -- The generated daterange() column rejects inverted dates (SQLSTATE 22000)
  -- before the CHECK constraint (23514) is even evaluated — both guard it.
  perform pg_temp.assert_blocked('22000', $q$
    insert into public.bookings
      (customer_id, caftan_id, start_date, end_date, total_price)
    values
      ('bbbbbbbb-0000-0000-0000-000000000001',
       '20000000-0000-0000-0000-000000000004',
       current_date + 70, current_date + 65, 400.00)$q$,
    'E1 booking with end_date before start_date rejected');

  perform pg_temp.assert_blocked('23514', $q$
    insert into public.caftans (slug, category_id, name, price_per_day)
    values ('bad-price', '10000000-0000-0000-0000-000000000001',
            '{"ar":"x","fr":"x","en":"x"}', -10)$q$,
    'E2 negative price rejected');

  perform pg_temp.assert_blocked('23514', $q$
    insert into public.categories (slug, name)
    values ('bad-locale', '{"fr":"Seulement français"}')$q$,
    'E3 category name missing ar/en translations rejected');

  perform pg_temp.assert_blocked('23514', $q$
    insert into public.caftans (slug, category_id, name, price_per_day)
    values ('Bad Slug!', '10000000-0000-0000-0000-000000000001',
            '{"ar":"x","fr":"x","en":"x"}', 100)$q$,
    'E5 invalid slug format rejected');

  -- FK integrity exercised via ON DELETE RESTRICT: caftan 1 has bookings,
  -- so deleting it must fail (an insert with a bogus caftan_id never reaches
  -- the FK — the booking-insert RLS policy rejects it first, also correct).
  perform pg_temp.assert_blocked('23001', $q$
    delete from public.caftans
    where id = '20000000-0000-0000-0000-000000000001'$q$,
    'E4 cannot delete a caftan that has bookings (FK restrict, 23001)');
end $$;

-- ==========================================================================
-- SECTION F — updated_at maintenance
-- ==========================================================================
do $$
declare
  v_before timestamptz;
  v_after  timestamptz;
begin
  select updated_at into v_before from public.caftans
  where id = '20000000-0000-0000-0000-000000000001';
  perform pg_sleep(0.05);
  update public.caftans set color = 'Rouge vif'
  where id = '20000000-0000-0000-0000-000000000001';
  select updated_at into v_after from public.caftans
  where id = '20000000-0000-0000-0000-000000000001';
  perform pg_temp.assert_true(v_after > v_before, 'F1 updated_at advances on update');
end $$;

reset role;

do $$ begin
  raise notice '============================================';
  raise notice 'ALL PHASE 1 RLS / CONSTRAINT TESTS PASSED';
  raise notice '============================================';
end $$;
