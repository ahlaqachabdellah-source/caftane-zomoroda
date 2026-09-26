-- ============================================================================
-- Migration 0006: Server-side booking total (Phase 6)
--
-- bookings.total_price must NEVER be trusted from the client. This trigger
-- overwrites it on every insert and on any change of caftan_id / dates:
--   total = rental days (inclusive) × caftans.price_per_day
-- ============================================================================

create or replace function public.compute_booking_total()
returns trigger
language plpgsql
-- SECURITY DEFINER: price lookup must succeed even when the caftan row is
-- not visible to the caller (e.g. retired) — the RLS WITH CHECK on the
-- insert remains the authority on whether the booking is allowed.
security definer
set search_path = ''
as $$
declare
  daily_price numeric(10, 2);
begin
  select c.price_per_day into daily_price
    from public.caftans c
    where c.id = new.caftan_id;

  if daily_price is null then
    raise exception 'Cannot compute booking total: unknown caftan %', new.caftan_id;
  end if;

  -- date - date yields integer days; the rental period is inclusive.
  new.total_price := (new.end_date - new.start_date + 1) * daily_price;
  return new;
end;
$$;

comment on function public.compute_booking_total() is
  'Overwrites bookings.total_price = days(inclusive) x price_per_day. Server-side source of truth.';

drop trigger if exists bookings_compute_total on public.bookings;
create trigger bookings_compute_total
  before insert or update of caftan_id, start_date, end_date
  on public.bookings
  for each row execute function public.compute_booking_total();
