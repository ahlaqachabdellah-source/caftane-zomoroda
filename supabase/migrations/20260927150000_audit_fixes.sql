-- ============================================================================
-- Migration 0013: Final comprehensive audit fixes
--
-- 1. site_settings gains opening_hours + plus_code so the REAL business
--    information (provided by the owner) lives in the database, not in code.
-- 2. public.booked_periods(p_caftan_id) — public-safe occupied date ranges
--    for one visible caftan. Lets the booking flow warn about occupied dates
--    BEFORE submit. Returns only date ranges — never customer data — and
--    mirrors the no_overlapping_active_bookings constraint semantics
--    (pending/confirmed only). The constraint remains the enforcement layer;
--    this function is a read-only UX aid.
-- 3. public.available_caftan_ids(p_start, p_end) — ids of bookable caftans
--    free for a date range, for the public catalog availability filter.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. site_settings: opening hours + plus code
-- --------------------------------------------------------------------------
alter table public.site_settings
  add column if not exists opening_hours text not null default '',
  add column if not exists plus_code     text not null default '';

comment on column public.site_settings.opening_hours is
  'Human-readable opening hours, e.g. "10:00–20:00". Empty until configured.';
comment on column public.site_settings.plus_code is
  'Google Plus Code of the shop, e.g. "9QVP+M8G". Empty until configured.';

-- --------------------------------------------------------------------------
-- 2. booked_periods — occupied ranges for one caftan (public-safe)
-- --------------------------------------------------------------------------
create or replace function public.booked_periods(p_caftan_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Unknown or retired caftan → empty list (same answer as "nothing booked";
  -- the detail page itself already hides retired caftans).
  if not exists (
    select 1 from public.caftans c
    where c.id = p_caftan_id and c.status <> 'retired'
  ) then
    return '[]'::jsonb;
  end if;

  return (
    select coalesce(
      jsonb_agg(
        jsonb_build_object('start_date', b.start_date, 'end_date', b.end_date)
        order by b.start_date
      ),
      '[]'::jsonb
    )
    from public.bookings b
    where b.caftan_id = p_caftan_id
      and b.status in ('pending', 'confirmed')
      and b.end_date >= current_date
  );
end;
$$;

comment on function public.booked_periods(uuid) is
  'Occupied date ranges (pending/confirmed) for one visible caftan. Date ranges only — no customer data. Read-only UX aid; the exclusion constraint remains the enforcement layer.';

revoke all on function public.booked_periods(uuid) from public;
grant execute on function public.booked_periods(uuid) to anon, authenticated;

-- --------------------------------------------------------------------------
-- 3. available_caftan_ids — catalog availability filter
-- --------------------------------------------------------------------------
create or replace function public.available_caftan_ids(p_start date, p_end date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_start is null or p_end is null or p_end < p_start then
    return '[]'::jsonb;
  end if;

  return (
    select coalesce(jsonb_agg(c.id), '[]'::jsonb)
    from public.caftans c
    where c.status = 'available'
      and not exists (
        select 1 from public.bookings b
        where b.caftan_id = c.id
          and b.status in ('pending', 'confirmed')
          and b.start_date <= p_end
          and b.end_date   >= p_start
      )
  );
end;
$$;

comment on function public.available_caftan_ids(date, date) is
  'Ids of bookable caftans with no active (pending/confirmed) booking overlapping the given range. Powers the public catalog availability filter.';

revoke all on function public.available_caftan_ids(date, date) from public;
grant execute on function public.available_caftan_ids(date, date) to anon, authenticated;
