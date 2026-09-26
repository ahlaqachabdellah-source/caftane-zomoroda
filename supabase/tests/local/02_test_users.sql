-- ============================================================================
-- LOCAL TEST HARNESS ONLY — deterministic test identities.
-- Runs as the database owner (no JWT), like the Supabase service role.
-- Also verifies the handle_new_user trigger auto-creates profiles.
-- ============================================================================

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'admin@test.local',
   '{"full_name": "Test Admin", "phone": "+212600000001"}'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'customer1@test.local',
   '{"full_name": "Customer One"}'),
  ('cccccccc-0000-0000-0000-000000000001', 'customer2@test.local',
   '{"full_name": "Customer Two"}');

-- Promote the first user to admin (trusted server context, auth.uid() is null)
update public.profiles set role = 'admin'
where id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- Verify the signup trigger worked ----------------------------------------
do $$
begin
  if (select count(*) from public.profiles) <> 3 then
    raise exception 'SETUP FAILED: handle_new_user did not create 3 profiles';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = 'bbbbbbbb-0000-0000-0000-000000000001'
      and full_name = 'Customer One'
      and role = 'customer'
  ) then
    raise exception 'SETUP FAILED: profile metadata/role defaults wrong';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = 'aaaaaaaa-0000-0000-0000-000000000001' and role = 'admin'
  ) then
    raise exception 'SETUP FAILED: admin role not assigned';
  end if;
end $$;
