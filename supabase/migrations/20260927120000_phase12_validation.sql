-- ============================================================================
-- Phase 12 — VALIDATION & ERROR HANDLING HARDENING (server side)
--
-- The client validates forms with shared Zod schemas, but client-side
-- validation is never trusted alone. This migration adds the matching
-- server-side length validation so tampered clients cannot push oversized
-- payloads into customer notes, internal admin notes, or status-transition
-- notes:
--
--   * bookings.customer_notes            <= 500 chars  (CHECK constraint)
--   * booking_admin_notes.notes          <= 2000 chars (CHECK + RPC guard)
--   * admin_update_booking_status p_note <= 500 chars  (RPC guard)
--
-- Error contract (consumed by the frontend error-mapping layer):
--   23514 check_violation  → invalid data
--   22023 with 'note'      → note too long
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. CHECK constraints (defense in depth even for direct table writes)
-- --------------------------------------------------------------------------
alter table public.bookings
  add constraint bookings_customer_notes_length
  check (char_length(customer_notes) <= 500);

alter table public.booking_admin_notes
  add constraint booking_admin_notes_length
  check (char_length(notes) <= 2000);

-- --------------------------------------------------------------------------
-- 2. RPC guards — reject oversized notes before touching any row
-- --------------------------------------------------------------------------
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

  if p_note is not null and char_length(p_note) > 500 then
    raise exception 'Status note too long' using errcode = '22023';
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

  if p_notes is not null and char_length(p_notes) > 2000 then
    raise exception 'Notes too long' using errcode = '22023';
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
