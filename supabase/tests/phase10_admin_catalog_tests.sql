-- ============================================================================
-- Phase 10 test suite — admin caftan & category management security.
-- Runs in the SAME session as the earlier suites (pg_temp helpers +
-- fixtures), as the unprivileged "tester" role.
--
-- Covers Phase 10 §9 requirements:
--   * Only admins can create/update/delete caftans and categories
--   * Only admins can write caftan_images rows or storage objects
--   * Unsafe deletes are blocked by the database (FK restrict):
--     category in use, caftan with bookings
--   * Safe deletes work and cascade caftan image rows
--   * Slug/price/status constraints reject invalid data (23505/23514)
--   * featured/status changes persist when done by an admin
-- ============================================================================

-- --------------------------------------------------------------------------
-- P10-1 … P10-3 — anonymous callers cannot write anything
-- --------------------------------------------------------------------------
set role anon;
select set_config('request.jwt.claims', '', false);

do $$ begin
  perform pg_temp.assert_blocked('42501', $q$
    insert into public.caftans (slug, category_id, name, price_per_day)
    values ('p10-anon', '10000000-0000-0000-0000-000000000001',
            '{"ar":"أ","fr":"a","en":"a"}', 100)$q$,
    'P10-1 anon cannot create a caftan');
  perform pg_temp.assert_blocked('42501', $q$
    insert into public.categories (slug, name)
    values ('p10-anon', '{"ar":"أ","fr":"a","en":"a"}')$q$,
    'P10-2 anon cannot create a category');
  perform pg_temp.assert_blocked('42501', $q$
    insert into storage.objects (bucket_id, name)
    values ('caftan-images', 'p10/anon.jpg')$q$,
    'P10-3 anon cannot upload to the caftan-images bucket');
end $$;

-- --------------------------------------------------------------------------
-- Admin setup: fixtures used by the customer-rejection and delete tests.
-- --------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', false);

do $$
declare
  v_caftan uuid;
  v_cat    uuid;
begin
  insert into public.categories (slug, name, sort_order)
  values ('p10-temp-cat', '{"ar":"اختبار","fr":"Test","en":"Test"}', 90)
  returning id into v_cat;
  insert into test_vars (key, val) values ('p10_cat', v_cat);

  insert into public.caftans (slug, category_id, name, description, size, color,
                              price_per_day, deposit_amount, status, featured)
  values ('p10-test-caftan', v_cat,
          '{"ar":"قفطان اختبار","fr":"Caftan Test","en":"Test Caftan"}',
          '{"ar":"وصف","fr":"Description","en":"Description"}',
          'M', 'Test', 500, 1000, 'available', false)
  returning id into v_caftan;
  insert into test_vars (key, val) values ('p10_caftan', v_caftan);

  insert into public.caftan_images (caftan_id, storage_path, alt_text, sort_order, is_primary)
  values (v_caftan, 'p10/test-1.jpg', '{"fr":"Test"}', 0, true),
         (v_caftan, 'p10/test-2.jpg', '{"fr":"Test 2"}', 1, false);

  insert into storage.objects (bucket_id, name)
  values ('caftan-images', 'p10/test-1.jpg'),
         ('caftan-images', 'p10/test-2.jpg');

  perform pg_temp.assert_true(
    exists (select 1 from public.caftans where id = v_caftan),
    'P10-setup admin created caftan with category, images, storage objects');
end $$;

-- --------------------------------------------------------------------------
-- P10-4 … P10-8 — customers cannot modify catalog data
-- (Updates/deletes without a matching policy silently affect 0 rows;
--  inserts and storage writes raise 42501.)
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', false);

do $$
declare
  v_caftan uuid := (select val from test_vars where key = 'p10_caftan');
  v_cat    uuid := (select val from test_vars where key = 'p10_cat');
begin
  perform pg_temp.assert_blocked('42501', $q$
    insert into public.caftans (slug, category_id, name, price_per_day)
    values ('p10-cust', '10000000-0000-0000-0000-000000000001',
            '{"ar":"أ","fr":"a","en":"a"}', 100)$q$,
    'P10-4 customer cannot create a caftan');

  perform pg_temp.assert_blocked('42501', $q$
    insert into public.categories (slug, name)
    values ('p10-cust', '{"ar":"أ","fr":"a","en":"a"}')$q$,
    'P10-5 customer cannot create a category');

  perform pg_temp.assert_blocked('42501',
    format($q$insert into public.caftan_images (caftan_id, storage_path)
            values (%L, 'p10/cust.jpg')$q$, v_caftan),
    'P10-6 customer cannot insert caftan image rows');

  perform pg_temp.assert_blocked('42501', $q$
    insert into storage.objects (bucket_id, name)
    values ('caftan-images', 'p10/cust.jpg')$q$,
    'P10-7 customer cannot upload storage objects');

  update public.caftans set price_per_day = 1 where id = v_caftan;
  perform pg_temp.assert_true(
    (select price_per_day from public.caftans where id = v_caftan) = 500,
    'P10-8a customer caftan update affects 0 rows (price unchanged)');

  update public.categories set sort_order = 0 where id = v_cat;
  perform pg_temp.assert_true(
    (select sort_order from public.categories where id = v_cat) = 90,
    'P10-8b customer category update affects 0 rows');

  update public.caftan_images set sort_order = 99 where caftan_id = v_caftan;
  perform pg_temp.assert_true(
    (select count(*) from public.caftan_images
     where caftan_id = v_caftan and sort_order = 99) = 0,
    'P10-8c customer image reorder affects 0 rows');

  delete from storage.objects where name = 'p10/test-1.jpg';
  perform pg_temp.assert_true(
    exists (select 1 from storage.objects where name = 'p10/test-1.jpg'),
    'P10-8d customer storage delete affects 0 rows');

  delete from public.caftans where id = v_caftan;
  perform pg_temp.assert_true(
    exists (select 1 from public.caftans where id = v_caftan),
    'P10-8e customer caftan delete affects 0 rows');
end $$;

-- --------------------------------------------------------------------------
-- P10-9 … P10-13 — constraint enforcement on admin writes
-- --------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', false);

do $$
declare
  v_cat uuid := (select val from test_vars where key = 'p10_cat');
begin
  perform pg_temp.assert_blocked('23505',
    format($q$insert into public.caftans (slug, category_id, name, price_per_day)
            values ('p10-test-caftan', %L, '{"ar":"أ","fr":"a","en":"a"}', 100)$q$, v_cat),
    'P10-9 duplicate caftan slug rejected (23505)');

  perform pg_temp.assert_blocked('23514',
    format($q$insert into public.caftans (slug, category_id, name, price_per_day)
            values ('Invalid Slug!', %L, '{"ar":"أ","fr":"a","en":"a"}', 100)$q$, v_cat),
    'P10-10 unsafe slug rejected by CHECK (23514)');

  perform pg_temp.assert_blocked('23514',
    format($q$insert into public.caftans (slug, category_id, name, price_per_day)
            values ('p10-neg', %L, '{"ar":"أ","fr":"a","en":"a"}', -50)$q$, v_cat),
    'P10-11 negative price rejected (23514)');

  perform pg_temp.assert_blocked('23514',
    format($q$insert into public.caftans (slug, category_id, name, price_per_day, status)
            values ('p10-badstatus', %L, '{"ar":"أ","fr":"a","en":"a"}', 100, 'hidden')$q$, v_cat),
    'P10-12 unknown status rejected (23514)');

  perform pg_temp.assert_blocked('23514',
    format($q$insert into public.caftans (slug, category_id, name, price_per_day)
            values ('p10-missing-lang', %L, '{"fr":"Seulement français"}', 100)$q$, v_cat),
    'P10-13 incomplete translations rejected (23514)');
end $$;

-- --------------------------------------------------------------------------
-- P10-14 … P10-17 — admin edits persist (price, featured, status, images)
-- --------------------------------------------------------------------------
do $$
declare
  v_caftan uuid := (select val from test_vars where key = 'p10_caftan');
begin
  update public.caftans
  set price_per_day = 750, featured = true, status = 'maintenance'
  where id = v_caftan;
  perform pg_temp.assert_true(
    exists (select 1 from public.caftans
            where id = v_caftan and price_per_day = 750
              and featured and status = 'maintenance'),
    'P10-14 admin price/featured/status update persists');

  -- Reorder: swap sort_order of the two fixture images.
  update public.caftan_images set sort_order = 1
  where caftan_id = v_caftan and storage_path = 'p10/test-1.jpg';
  update public.caftan_images set sort_order = 0
  where caftan_id = v_caftan and storage_path = 'p10/test-2.jpg';
  perform pg_temp.assert_true(
    (select storage_path from public.caftan_images
     where caftan_id = v_caftan order by sort_order limit 1) = 'p10/test-2.jpg',
    'P10-15 admin image reorder persists');

  -- Primary switch: exactly one primary image afterwards.
  update public.caftan_images set is_primary = false where caftan_id = v_caftan;
  update public.caftan_images set is_primary = true
  where caftan_id = v_caftan and storage_path = 'p10/test-2.jpg';
  perform pg_temp.assert_true(
    (select count(*) from public.caftan_images
     where caftan_id = v_caftan and is_primary) = 1
    and (select storage_path from public.caftan_images
         where caftan_id = v_caftan and is_primary) = 'p10/test-2.jpg',
    'P10-16 admin primary-image switch leaves exactly one primary');

  update public.caftan_images set alt_text = '{"ar":"بديل","fr":"Alt","en":"Alt"}'
  where caftan_id = v_caftan and storage_path = 'p10/test-1.jpg';
  perform pg_temp.assert_true(
    (select alt_text ->> 'fr' from public.caftan_images
     where caftan_id = v_caftan and storage_path = 'p10/test-1.jpg') = 'Alt',
    'P10-17 admin alt-text edit persists');
end $$;

-- --------------------------------------------------------------------------
-- P10-18 … P10-21 — safe vs unsafe deletes
-- --------------------------------------------------------------------------
do $$
declare
  v_caftan uuid := (select val from test_vars where key = 'p10_caftan');
  v_cat    uuid := (select val from test_vars where key = 'p10_cat');
begin
  -- Category referenced by the fixture caftan cannot be deleted.
  perform pg_temp.assert_blocked('23001',
    format($q$delete from public.categories where id = %L$q$, v_cat),
    'P10-18 category in use cannot be deleted (23001 restrict)');

  -- Caftan 1 has bookings from the phase 6/7/9 fixtures: FK restrict.
  perform pg_temp.assert_blocked('23001', $q$
    delete from public.caftans
    where id = '20000000-0000-0000-0000-000000000001'$q$,
    'P10-19 caftan with bookings cannot be deleted (23001 restrict) — retire instead');

  -- Safe delete: unreferenced caftan goes away, image rows cascade.
  delete from public.caftans where id = v_caftan;
  perform pg_temp.assert_true(
    not exists (select 1 from public.caftans where id = v_caftan)
    and not exists (select 1 from public.caftan_images where caftan_id = v_caftan),
    'P10-20 unreferenced caftan deletes and cascades image rows');

  -- Storage objects are binary orphans after the row cascade: admins can
  -- (and the UI does) remove them explicitly.
  delete from storage.objects where name like 'p10/%';
  perform pg_temp.assert_true(
    not exists (select 1 from storage.objects where name like 'p10/%'),
    'P10-21 admin can delete orphaned storage objects');

  -- Now-unreferenced category deletes cleanly.
  delete from public.categories where id = v_cat;
  perform pg_temp.assert_true(
    not exists (select 1 from public.categories where id = v_cat),
    'P10-22 unreferenced category deletes cleanly');
end $$;
