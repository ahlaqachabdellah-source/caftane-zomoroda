-- ============================================================================
-- Migration 0003: Database functions
-- Moroccan Caftan Rental — Phase 1
--
-- Security notes:
--  * is_admin() is SECURITY DEFINER so RLS policies can check the caller's
--    role without being blocked by the RLS policy on profiles itself, and
--    without allowing recursion. search_path is pinned to '' and every
--    reference is schema-qualified (prevents search_path hijacking).
--  * Trigger functions that write into protected tables
--    (booking_status_history) are SECURITY DEFINER for the same reason.
-- ============================================================================

-- --------------------------------------------------------------------------
-- is_admin() — true when the current JWT user has the admin role
-- --------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

comment on function public.is_admin() is
  'Returns true when auth.uid() belongs to a profile with role=admin. Used by RLS policies.';

-- --------------------------------------------------------------------------
-- set_updated_at() — generic updated_at maintenance
-- --------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- clock_timestamp() (not now()) so the value really moves within a transaction
  new.updated_at = clock_timestamp();
  return new;
end;
$$;

-- --------------------------------------------------------------------------
-- generate_booking_number() — human-readable reference: CF-YYYY-NNNN
-- --------------------------------------------------------------------------
create sequence if not exists public.booking_number_seq;

create or replace function public.generate_booking_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.booking_number is null or new.booking_number = '' then
    new.booking_number :=
      'CF-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('public.booking_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

-- --------------------------------------------------------------------------
-- log_booking_status_change() — audit trail for every status transition
-- --------------------------------------------------------------------------
create or replace function public.log_booking_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.booking_status_history
      (booking_id, from_status, to_status, changed_by, note)
    values
      (new.id, null, new.status, auth.uid(), 'Booking created');
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.booking_status_history
      (booking_id, from_status, to_status, changed_by)
    values
      (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

-- --------------------------------------------------------------------------
-- prevent_role_escalation() — non-admins can never change a role
-- --------------------------------------------------------------------------
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- auth.uid() is null for service-role / migration contexts: those are trusted.
  if auth.uid() is not null
     and new.role is distinct from old.role
     and not public.is_admin() then
    raise exception 'Insufficient privileges to change role';
  end if;
  return new;
end;
$$;

-- --------------------------------------------------------------------------
-- protect_booking_fields() — customers may ONLY cancel a pending booking
-- --------------------------------------------------------------------------
create or replace function public.protect_booking_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Admins and trusted server contexts (auth.uid() is null) are unrestricted.
  if public.is_admin() or auth.uid() is null then
    return new;
  end if;

  if new.status = 'cancelled'
     and old.status = 'pending'
     and new.booking_number = old.booking_number
     and new.customer_id    = old.customer_id
     and new.caftan_id      = old.caftan_id
     and new.start_date     = old.start_date
     and new.end_date       = old.end_date
     and new.total_price    = old.total_price
     and new.deposit_status = old.deposit_status
     and new.customer_notes = old.customer_notes
     and new.admin_notes    = old.admin_notes
  then
    return new;
  end if;

  raise exception
    'Customers can only cancel a pending booking; all other fields are protected';
end;
$$;

-- --------------------------------------------------------------------------
-- handle_new_user() — auto-create a profile row for every new auth user
-- --------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
