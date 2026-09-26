-- ============================================================================
-- Migration 0009: Admin booking & customer management (Phase 11)
--
--   * booking_admin_notes — internal admin notes moved OUT of the bookings
--     table: customers can SELECT their own booking rows, so a notes column
--     there would be API-readable by the customer. A dedicated table with
--     admin-only RLS makes the separation physical.
--   * admin_update_booking_status() — validated, concurrency-safe status
--     transitions (the lifecycle is enforced server-side, not by the UI).
--   * admin_set_booking_notes() — upsert internal notes.
--   * admin_list_bookings() / admin_get_booking() — admin reads with embeds.
--   * admin_list_customers() / admin_get_customer() — customer management.
--   * admin_caftan_occupancy() — calendar feed consistent with the
--     no_overlapping_active_bookings exclusion constraint (read-only view
--     of the same bookings table, no second availability system).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. booking_admin_notes (admin-only internal notes)
-- --------------------------------------------------------------------------
create table public.booking_admin_notes (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  notes      text not null default '',
  updated_at timestamptz not null default now()
);

comment on table public.booking_admin_notes is
  'Internal admin notes per booking. Admin-only RLS — never customer-visible.';

alter table public.booking_admin_notes enable row level security;

create policy admin_notes_admin_select on public.booking_admin_notes
  for select to authenticated using (public.is_admin());
create policy admin_notes_admin_insert on public.booking_admin_notes
  for insert to authenticated with check (public.is_admin());
create policy admin_notes_admin_update on public.booking_admin_notes
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update on public.booking_admin_notes to authenticated;
revoke all on public.booking_admin_notes from anon;

-- Migrate any existing notes, then drop the old column so it cannot leak.
insert into public.booking_admin_notes (booking_id, notes)
select id, admin_notes from public.bookings where admin_notes <> '';

-- The customer insert policy references admin_notes: drop it first, then the
-- column, then recreate the policy without the condition.
drop policy if exists bookings_customer_insert on public.bookings;
alter table public.bookings drop column admin_notes;

create policy bookings_customer_insert on public.bookings
  for insert to authenticated
  with check (
    customer_id = auth.uid()
    and status = 'pending'
    and deposit_status = 'unpaid'
    and exists (
      select 1 from public.caftans c
      where c.id = caftan_id and c.status = 'available'
    )
  );

-- Recreate protect_booking_fields() without the admin_notes comparison.
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
  then
    return new;
  end if;

  raise exception
    'Customers can only cancel a pending booking; all other fields are protected';
end;
$$;

-- --------------------------------------------------------------------------
-- 2. admin_update_booking_status — validated lifecycle transitions
-- --------------------------------------------------------------------------
-- Lifecycle (enforced HERE, server-side; the UI only offers these):
--   pending   → confirmed | rejected | cancelled
--   confirmed → completed | cancelled
--   rejected / completed / cancelled → terminal
-- The bookings status trigger (log_booking_status_change) writes the audit
-- row on every UPDATE; this function then attaches the optional note to it.
create or replace function public.admin_update_booking_status(
  p_booking_id uuid,
  p_new_status text,
  p_note       text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_allowed boolean;
begin
  if not public.is_admin() then
    raise exception 'Insufficient privileges' using errcode = '42501';
  end if;

  -- Lock the row so two admins cannot race a transition.
  select * into v_booking
    from public.bookings
    where id = p_booking_id
    for update;

  if not found then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;

  if p_new_status not in ('pending', 'confirmed', 'rejected', 'completed', 'cancelled') then
    raise exception 'Unknown status %', p_new_status using errcode = '22023';
  end if;

  if v_booking.status = p_new_status then
    raise exception 'Booking is already in status %', p_new_status
      using errcode = '22023';
  end if;

  v_allowed :=
       (v_booking.status = 'pending'
          and p_new_status in ('confirmed', 'rejected', 'cancelled'))
    or (v_booking.status = 'confirmed'
          and p_new_status in ('completed', 'cancelled'));

  if not v_allowed then
    raise exception 'Invalid status transition from % to %',
      v_booking.status, p_new_status
      using errcode = '22023';
  end if;

  update public.bookings set status = p_new_status where id = p_booking_id;

  -- Attach the optional note to the audit row the trigger just wrote.
  -- (booking_status_history.note is customer-readable — the admin UI labels
  -- this field accordingly; internal notes live in booking_admin_notes.)
  if p_note is not null and btrim(p_note) <> '' then
    update public.booking_status_history h
      set note = btrim(p_note)
      where h.booking_id = p_booking_id
        and h.from_status = v_booking.status
        and h.to_status = p_new_status;
  end if;

  return (select to_jsonb(b) from public.bookings b where b.id = p_booking_id);
end;
$$;

revoke all on function public.admin_update_booking_status(uuid, text, text) from public, anon;
grant execute on function public.admin_update_booking_status(uuid, text, text) to authenticated;

-- --------------------------------------------------------------------------
-- 3. admin_set_booking_notes — upsert internal notes
-- --------------------------------------------------------------------------
create or replace function public.admin_set_booking_notes(
  p_booking_id uuid,
  p_notes      text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Insufficient privileges' using errcode = '42501';
  end if;

  if not exists (select 1 from public.bookings b where b.id = p_booking_id) then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;

  insert into public.booking_admin_notes (booking_id, notes, updated_at)
  values (p_booking_id, btrim(coalesce(p_notes, '')), now())
  on conflict (booking_id)
  do update set notes = excluded.notes, updated_at = now();
end;
$$;

revoke all on function public.admin_set_booking_notes(uuid, text) from public, anon;
grant execute on function public.admin_set_booking_notes(uuid, text) to authenticated;

-- --------------------------------------------------------------------------
-- 4. admin_list_bookings — every booking with customer + caftan embeds
-- --------------------------------------------------------------------------
create or replace function public.admin_list_bookings()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Insufficient privileges' using errcode = '42501';
  end if;

  return (
    select coalesce(jsonb_agg(row_data order by row_data ->> 'created_at' desc), '[]'::jsonb)
    from (
      select to_jsonb(b)
             || jsonb_build_object(
                  'customer', case when p.id is null then null else jsonb_build_object(
                    'id', p.id, 'full_name', p.full_name, 'phone', p.phone,
                    'whatsapp_number', p.whatsapp_number, 'city', p.city) end,
                  'caftan', case when c.id is null then null else jsonb_build_object(
                    'id', c.id, 'slug', c.slug, 'name', c.name) end
                ) as row_data
      from public.bookings b
      left join public.profiles p on p.id = b.customer_id
      left join public.caftans c on c.id = b.caftan_id
    ) rows
  );
end;
$$;

revoke all on function public.admin_list_bookings() from public, anon;
grant execute on function public.admin_list_bookings() to authenticated;

-- --------------------------------------------------------------------------
-- 5. admin_get_booking — full detail: booking, customer, caftan, history,
--    internal notes
-- --------------------------------------------------------------------------
create or replace function public.admin_get_booking(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Insufficient privileges' using errcode = '42501';
  end if;

  select * into v_booking from public.bookings b where b.id = p_booking_id;
  if not found then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'booking', to_jsonb(v_booking),
    'customer', (select to_jsonb(p) from public.profiles p
                 where p.id = v_booking.customer_id),
    'caftan', (select to_jsonb(c) from public.caftans c
               where c.id = v_booking.caftan_id),
    'history', (select coalesce(jsonb_agg(to_jsonb(h) order by h.created_at asc), '[]'::jsonb)
                from public.booking_status_history h
                where h.booking_id = p_booking_id),
    'admin_notes', (select coalesce(n.notes, '')
                    from public.booking_admin_notes n
                    where n.booking_id = p_booking_id)
  );
end;
$$;

revoke all on function public.admin_get_booking(uuid) from public, anon;
grant execute on function public.admin_get_booking(uuid) to authenticated;

-- --------------------------------------------------------------------------
-- 6. admin_list_customers — customers with booking aggregates
-- --------------------------------------------------------------------------
create or replace function public.admin_list_customers()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Insufficient privileges' using errcode = '42501';
  end if;

  return (
    select coalesce(jsonb_agg(row_data order by row_data ->> 'created_at' desc), '[]'::jsonb)
    from (
      select jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'phone', p.phone,
        'whatsapp_number', p.whatsapp_number,
        'city', p.city,
        'created_at', p.created_at,
        'booking_count', (select count(*) from public.bookings b
                          where b.customer_id = p.id),
        'last_booking_at', (select max(b.created_at) from public.bookings b
                            where b.customer_id = p.id),
        'last_booking_status', (select b.status from public.bookings b
                                where b.customer_id = p.id
                                order by b.created_at desc limit 1)
      ) as row_data
      from public.profiles p
      where p.role = 'customer'
    ) rows
  );
end;
$$;

revoke all on function public.admin_list_customers() from public, anon;
grant execute on function public.admin_list_customers() to authenticated;

-- --------------------------------------------------------------------------
-- 7. admin_get_customer — profile + full booking history
-- --------------------------------------------------------------------------
create or replace function public.admin_get_customer(p_customer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Insufficient privileges' using errcode = '42501';
  end if;

  select * into v_profile from public.profiles p where p.id = p_customer_id;
  if not found then
    raise exception 'Customer not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'profile', to_jsonb(v_profile),
    'bookings', (
      select coalesce(jsonb_agg(row_data order by row_data ->> 'created_at' desc), '[]'::jsonb)
      from (
        select to_jsonb(b)
               || jsonb_build_object(
                    'caftan', case when c.id is null then null else jsonb_build_object(
                      'id', c.id, 'slug', c.slug, 'name', c.name) end
                  ) as row_data
        from public.bookings b
        left join public.caftans c on c.id = b.caftan_id
        where b.customer_id = p_customer_id
      ) rows
    )
  );
end;
$$;

revoke all on function public.admin_get_customer(uuid) from public, anon;
grant execute on function public.admin_get_customer(uuid) to authenticated;

-- --------------------------------------------------------------------------
-- 8. admin_caftan_occupancy — calendar feed (read-only over the same
--    bookings table the exclusion constraint guards; no second availability
--    system). Cancelled/rejected bookings never occupy dates.
-- --------------------------------------------------------------------------
create or replace function public.admin_caftan_occupancy(
  p_from date,
  p_to   date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Insufficient privileges' using errcode = '42501';
  end if;

  return (
    select coalesce(jsonb_agg(row_data order by row_data -> 'caftan' ->> 'slug',
                                              row_data ->> 'start_date'), '[]'::jsonb)
    from (
      select jsonb_build_object(
        'booking_id', b.id,
        'booking_number', b.booking_number,
        'status', b.status,
        'start_date', b.start_date,
        'end_date', b.end_date,
        'customer_name', p.full_name,
        'caftan', jsonb_build_object('id', c.id, 'slug', c.slug, 'name', c.name)
      ) as row_data
      from public.bookings b
      join public.caftans c on c.id = b.caftan_id
      left join public.profiles p on p.id = b.customer_id
      where b.status in ('pending', 'confirmed', 'completed')
        and b.start_date <= p_to
        and b.end_date >= p_from
    ) rows
  );
end;
$$;

revoke all on function public.admin_caftan_occupancy(date, date) from public, anon;
grant execute on function public.admin_caftan_occupancy(date, date) to authenticated;
