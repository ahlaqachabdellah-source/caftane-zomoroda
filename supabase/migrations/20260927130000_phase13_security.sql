-- ============================================================================
-- Migration 0013: Security hardening (Phase 13)
--
--   * throttle_booking_creation() — per-customer booking creation rate
--     limit, enforced in the database so a scripted or tampered client
--     cannot flood the booking pipeline. The limit (20 new bookings per
--     customer per hour) is far above any legitimate usage: a real
--     customer books a handful of caftans, so normal usage is unaffected.
--   * caftan-images bucket hardening — restrict uploads to real image
--     MIME types and cap file size at 10 MiB at the Storage layer, so
--     even a stolen admin session cannot push arbitrary binaries through
--     the catalog bucket.
--
-- The frontend maps the 'booking_rate_limited' message to the existing
-- errors.rate_limited i18n key (never shown raw).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Booking creation rate limit
-- --------------------------------------------------------------------------
create or replace function public.throttle_booking_creation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit constant integer := 20;  -- max new bookings per customer per hour
  v_count integer;
begin
  -- Trusted server contexts (auth.uid() is null: seeds, migrations and
  -- service-role scripts) are not throttled.
  if auth.uid() is null then
    return new;
  end if;

  select count(*) into v_count
  from public.bookings b
  where b.customer_id = new.customer_id
    and b.created_at > now() - interval '1 hour';

  if v_count >= v_limit then
    raise exception 'booking_rate_limited' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

comment on function public.throttle_booking_creation() is
  'Phase 13: per-customer booking creation rate limit (20/hour). '
  'Abuse guard only — far above legitimate usage.';

drop trigger if exists throttle_booking_creation_on_insert on public.bookings;
create trigger throttle_booking_creation_on_insert
  before insert on public.bookings
  for each row execute function public.throttle_booking_creation();

-- --------------------------------------------------------------------------
-- 2. Storage bucket hardening (image MIME types only, 10 MiB cap)
-- --------------------------------------------------------------------------
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    file_size_limit    = 10485760  -- 10 MiB
where id = 'caftan-images';
