-- ============================================================================
-- Phase 13 DB tests — security hardening
-- Runs in the same session as phases 1/6/7/9/10/11/12 (pg_temp.assert_* +
-- test_vars). Covers: RLS meta-audit, SECURITY DEFINER search_path audit,
-- IDOR, role escalation, unauthorized CRUD on catalog/storage/history/notes,
-- admin RPC rejection for non-admins, and the booking creation rate limit.
-- ============================================================================

-- P13-1 · meta-audit: RLS is enabled on every application table
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
    'P13-1 RLS enabled on every application table');
end $$;

-- P13-2 · meta-audit: every SECURITY DEFINER function pins search_path
do $$ begin
  perform pg_temp.assert_true(
    (select count(*) = 0
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.prosecdef
        and not exists (
          select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) cfg
          where cfg in ('search_path=', 'search_path=""'))),
    'P13-2 all SECURITY DEFINER functions pin search_path');
end $$;

-- P13-3 · meta-audit: caftan-images bucket hardened (image MIME + 10 MiB cap)
do $$ begin
  perform pg_temp.assert_true(
    (select allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
            and file_size_limit = 10485760
       from storage.buckets where id = 'caftan-images'),
    'P13-3 caftan-images bucket restricted to image types, 10 MiB cap');
end $$;

-- --------------------------------------------------------------------------
-- Fixture: a booking owned by customer 2 for the IDOR checks.
-- --------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', false);
do $$
declare v_id uuid := gen_random_uuid();
begin
  insert into public.bookings (id, customer_id, caftan_id, start_date, end_date)
  values (v_id, 'cccccccc-0000-0000-0000-000000000001',
          '20000000-0000-0000-0000-000000000002', date '2031-06-01', date '2031-06-03');
  insert into test_vars (key, val) values ('p13_booking_c2', v_id)
  on conflict (key) do update set val = excluded.val;
end $$;

-- --------------------------------------------------------------------------
-- IDOR: customer 1 tampers with IDs belonging to customer 2
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', false);

-- P13-4 · cannot read another customer's profile by ID
do $$ begin
  perform pg_temp.assert_true(
    (select count(*) = 0 from public.profiles
      where id = 'cccccccc-0000-0000-0000-000000000001'),
    'P13-4 IDOR: customer1 cannot read customer2 profile');
end $$;

-- P13-5 · cannot modify another customer's profile by ID
do $$ begin
  update public.profiles set full_name = 'Hacked'
   where id = 'cccccccc-0000-0000-0000-000000000001';
  perform pg_temp.assert_true(
    (select count(*) = 0 from public.profiles
      where id = 'cccccccc-0000-0000-0000-000000000001' and full_name = 'Hacked'),
    'P13-5 IDOR: customer1 cannot modify customer2 profile');
end $$;

-- P13-6 · cannot read another customer's booking by ID
do $$ begin
  perform pg_temp.assert_true(
    (select count(*) = 0 from public.bookings
      where id = (select val from test_vars where key = 'p13_booking_c2')),
    'P13-6 IDOR: customer1 cannot read customer2 booking');
end $$;

-- P13-7 · cannot cancel/modify another customer's booking by ID
do $$ begin
  update public.bookings set status = 'cancelled'
   where id = (select val from test_vars where key = 'p13_booking_c2');
end $$;
-- verify as admin (tester role itself sees no rows under RLS)
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', false);
do $$ begin
  perform pg_temp.assert_true(
    (select status = 'pending' from public.bookings
      where id = (select val from test_vars where key = 'p13_booking_c2')),
    'P13-7 IDOR: customer1 cannot modify customer2 booking');
end $$;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', false);

-- --------------------------------------------------------------------------
-- Role escalation
-- --------------------------------------------------------------------------

-- P13-8 · customer cannot promote own profile to admin
do $$ begin
  perform pg_temp.assert_blocked('P0001',
    $q$ update public.profiles set role = 'admin'
        where id = 'bbbbbbbb-0000-0000-0000-000000000001' $q$,
    'P13-8 role self-promotion blocked by trigger');
end $$;

-- P13-9 · customer cannot change another user's role (IDOR + escalation)
do $$ begin
  update public.profiles set role = 'admin'
   where id = 'cccccccc-0000-0000-0000-000000000001';
end $$;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', false);
do $$ begin
  perform pg_temp.assert_true(
    (select role = 'customer' from public.profiles
      where id = 'cccccccc-0000-0000-0000-000000000001'),
    'P13-9 customer cannot change another user role');
end $$;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', false);

-- --------------------------------------------------------------------------
-- Unauthorized catalog / settings / history / notes writes
-- --------------------------------------------------------------------------

-- P13-10 · non-admin cannot create caftans or categories
do $$ begin
  perform pg_temp.assert_blocked('42501',
    $q$ insert into public.categories (slug, name)
        values ('hacked', '{"ar":"x","fr":"x","en":"x"}') $q$,
    'P13-10 customer cannot insert category');
  perform pg_temp.assert_blocked('42501',
    $q$ insert into public.caftans (slug, category_id, name, price_per_day)
        values ('hacked', '10000000-0000-0000-0000-000000000001',
                '{"ar":"x","fr":"x","en":"x"}', 1) $q$,
    'P13-10 customer cannot insert caftan');
end $$;

-- P13-11 · non-admin cannot write site_settings (silently affects 0 rows)
do $$ begin
  update public.site_settings set whatsapp_number = '212600000000' where id = 1;
end $$;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', false);
do $$ begin
  perform pg_temp.assert_true(
    (select whatsapp_number <> '212600000000' from public.site_settings where id = 1),
    'P13-11 customer cannot modify site_settings');
end $$;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', false);

-- P13-12 · booking_status_history is trigger-written only (not even admins
--          can insert audit rows directly)
do $$ begin
  perform pg_temp.assert_blocked('42501',
    $q$ insert into public.booking_status_history (booking_id, to_status)
        values (gen_random_uuid(), 'confirmed') $q$,
    'P13-12 customer cannot insert status history');
end $$;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', false);
do $$ begin
  perform pg_temp.assert_blocked('42501',
    $q$ insert into public.booking_status_history (booking_id, to_status)
        values (gen_random_uuid(), 'confirmed') $q$,
    'P13-12 even admin cannot insert status history directly');
end $$;

-- P13-13 · booking_admin_notes invisible and unwritable for customers
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', false);
do $$ begin
  perform pg_temp.assert_true(
    (select count(*) = 0 from public.booking_admin_notes),
    'P13-13 customer sees no admin notes');
  perform pg_temp.assert_blocked('42501',
    $q$ insert into public.booking_admin_notes (booking_id, notes)
        values (gen_random_uuid(), 'x') $q$,
    'P13-13 customer cannot write admin notes');
end $$;

-- --------------------------------------------------------------------------
-- Admin RPCs reject non-admin callers (privilege layer + is_admin() layer)
-- --------------------------------------------------------------------------
do $$
declare
  v_rpc text;
begin
  foreach v_rpc in array array[
    'select public.admin_dashboard_kpis()',
    'select public.admin_recent_activity(5)',
    'select public.admin_list_bookings()',
    'select public.admin_list_customers()',
    'select public.admin_caftan_occupancy(date ''2031-01-01'', date ''2031-12-31'')']
  loop
    perform pg_temp.assert_blocked('42501', v_rpc,
      'P13-14 non-admin rejected by ' || split_part(v_rpc, '(', 1));
  end loop;
end $$;

-- --------------------------------------------------------------------------
-- Storage: caftan-images writes are admin-only
-- --------------------------------------------------------------------------

-- P13-15 · customer cannot upload into the catalog bucket
do $$ begin
  perform pg_temp.assert_blocked('42501',
    $q$ insert into storage.objects (bucket_id, name)
        values ('caftan-images', 'hacked/evil.svg') $q$,
    'P13-15 customer upload to caftan-images rejected');
end $$;

-- P13-16 · anonymous cannot upload either
set role anon;
select set_config('request.jwt.claims', '', false);
do $$ begin
  perform pg_temp.assert_blocked('42501',
    $q$ insert into storage.objects (bucket_id, name)
        values ('caftan-images', 'hacked/evil.svg') $q$,
    'P13-16 anonymous upload to caftan-images rejected');
  perform pg_temp.assert_blocked('42501',
    $q$ insert into public.bookings (customer_id, caftan_id, start_date, end_date)
        values ('bbbbbbbb-0000-0000-0000-000000000001',
                '20000000-0000-0000-0000-000000000001',
                date '2031-01-01', date '2031-01-02') $q$,
    'P13-16 anonymous booking insert rejected');
end $$;

-- P13-17 · admin storage write still works (hardening must not weaken or
--          break legitimate admin uploads)
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', false);
do $$
declare v_id uuid;
begin
  insert into storage.objects (bucket_id, name)
  values ('caftan-images', 'test/p13-probe.png')
  returning id into v_id;
  perform pg_temp.assert_true(v_id is not null,
    'P13-17 admin upload to caftan-images still works');
  delete from storage.objects where id = v_id;
end $$;

-- --------------------------------------------------------------------------
-- Rate limiting: booking creation throttle (20/hour/customer)
-- --------------------------------------------------------------------------

-- Reset customer 2's booking count: as admin, delete their bookings
-- (previous suites created some). Throttle counts rows from the last hour.
delete from public.bookings
 where customer_id = 'cccccccc-0000-0000-0000-000000000001';
-- Make sure the burst caftan is bookable regardless of earlier suites.
update public.caftans set status = 'available'
 where id = '20000000-0000-0000-0000-000000000001';

select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', false);

-- P13-18 · 20 bookings within the hour succeed (normal usage unaffected)
do $$
declare
  i integer;
  v_start date;
begin
  for i in 0..19 loop
    v_start := date '2031-01-01' + (i * 30);
    insert into public.bookings (customer_id, caftan_id, start_date, end_date)
    values ('cccccccc-0000-0000-0000-000000000001',
            '20000000-0000-0000-0000-000000000001', v_start, v_start + 1);
  end loop;
  perform pg_temp.assert_true(
    (select count(*) = 20 from public.bookings
      where customer_id = 'cccccccc-0000-0000-0000-000000000001'
        and created_at > now() - interval '1 hour'),
    'P13-18 20 bookings within the hour accepted');
end $$;

-- P13-19 · the 21st booking is rejected with the rate-limit signal
do $$
begin
  insert into public.bookings (customer_id, caftan_id, start_date, end_date)
  values ('cccccccc-0000-0000-0000-000000000001',
          '20000000-0000-0000-0000-000000000001', date '2033-01-01', date '2033-01-02');
  raise exception 'TEST FAILED: P13-19 21st booking was not throttled';
exception
  when others then
    if sqlerrm like 'TEST FAILED:%' then
      raise;
    elsif sqlstate = 'P0001' and sqlerrm = 'booking_rate_limited' then
      raise notice 'ok - P13-19 21st booking throttled (booking_rate_limited)';
    else
      raise exception 'TEST FAILED: P13-19 expected P0001 booking_rate_limited, got %: %',
        sqlstate, sqlerrm;
    end if;
end $$;

-- P13-20 · the throttle is per-customer: customer 1 is unaffected
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', false);
do $$ begin
  insert into public.bookings (customer_id, caftan_id, start_date, end_date)
  values ('bbbbbbbb-0000-0000-0000-000000000001',
          '20000000-0000-0000-0000-000000000003', date '2033-02-01', date '2033-02-02');
  perform pg_temp.assert_true(true, 'P13-20 other customer unaffected by throttle');
end $$;

reset role;
