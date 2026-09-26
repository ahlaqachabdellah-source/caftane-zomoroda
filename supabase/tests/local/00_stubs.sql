-- ============================================================================
-- LOCAL TEST HARNESS ONLY — never shipped to a real Supabase project.
-- Recreates the minimal Supabase primitives (auth schema, storage schema,
-- roles, auth.uid()) so migrations + RLS can be exercised against a real
-- PostgreSQL without a Supabase instance.
-- ============================================================================

-- Roles mirroring Supabase -------------------------------------------------
do $$ begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'tester') then
    create role tester login password 'tester';
  end if;
end $$;

grant anon, authenticated to tester;

-- auth schema stub ---------------------------------------------------------
create schema if not exists auth;

create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);

alter table auth.users enable row level security;

-- Mirrors Supabase's auth.uid(): reads the JWT claims of the current request.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select case
           when nullif(current_setting('request.jwt.claims', true), '') is null
             then null::uuid
           else (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
         end;
$$;

-- storage schema stub ------------------------------------------------------
create schema if not exists storage;

create table if not exists storage.buckets (
  id         text primary key,
  name       text not null,
  public     boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text references storage.buckets (id) on delete cascade,
  name       text,
  owner      uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table storage.objects enable row level security;

grant usage on schema auth, storage to anon, authenticated;
