-- ============================================================================
-- Migration 0008: Admin dashboard RPCs
-- Moroccan Caftan Rental — Phase 9
--
-- Two read-only aggregation functions powering the admin overview:
--   * admin_dashboard_kpis()   — bookings this month, revenue estimate,
--                                pending requests, top caftans
--   * admin_recent_activity()  — newest booking/status/customer events
--
-- Security notes:
--  * SECURITY DEFINER with search_path pinned to '' — same pattern as the
--    Phase 1 helpers — so the functions can aggregate across tables whose
--    RLS would otherwise scope rows to the caller.
--  * Authorization is enforced INSIDE the function via public.is_admin():
--    a non-admin caller gets SQLSTATE 42501 before any data is read.
--  * EXECUTE is revoked from public/anon and granted to authenticated only,
--    so enforcement is double-layered (privilege + role check).
--  * Both functions are strictly read-only (no writes, no side effects).
-- ============================================================================

-- --------------------------------------------------------------------------
-- admin_dashboard_kpis()
--
-- Returns a single jsonb object:
--   bookings_this_month  bigint  — bookings created in the current calendar
--                                  month (server timezone)
--   pending_count        bigint  — bookings currently awaiting review
--   revenue_estimate     numeric — sum of total_price over bookings whose
--                                  status is 'confirmed' or 'completed'
--                                  (the statuses listed in revenue_statuses)
--   revenue_statuses     jsonb   — the statuses included above, exposed so
--                                  the UI can label the estimate honestly
--   top_caftans          jsonb   — up to 5 caftans ranked by total booking
--                                  requests (all statuses): caftan_id, slug,
--                                  localized name, booking_count
--   generated_at         timestamptz
-- --------------------------------------------------------------------------
create or replace function public.admin_dashboard_kpis()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bookings_month bigint;
  v_pending        bigint;
  v_revenue        numeric;
  v_top            jsonb;
begin
  if not public.is_admin() then
    raise exception 'Insufficient privileges' using errcode = '42501';
  end if;

  select count(*) into v_bookings_month
  from public.bookings b
  where b.created_at >= date_trunc('month', now());

  select count(*) into v_pending
  from public.bookings b
  where b.status = 'pending';

  select coalesce(sum(b.total_price), 0) into v_revenue
  from public.bookings b
  where b.status in ('confirmed', 'completed');

  select coalesce(jsonb_agg(t.row order by t.booking_count desc, t.slug), '[]'::jsonb)
  into v_top
  from (
    select
      jsonb_build_object(
        'caftan_id', c.id,
        'slug', c.slug,
        'name', c.name,
        'booking_count', count(b.id)
      ) as row,
      count(b.id) as booking_count,
      c.slug
    from public.bookings b
    join public.caftans c on c.id = b.caftan_id
    group by c.id, c.slug, c.name
    order by count(b.id) desc, c.slug
    limit 5
  ) t;

  return jsonb_build_object(
    'bookings_this_month', v_bookings_month,
    'pending_count', v_pending,
    'revenue_estimate', v_revenue,
    'revenue_statuses', jsonb_build_array('confirmed', 'completed'),
    'top_caftans', v_top,
    'generated_at', now()
  );
end;
$$;

comment on function public.admin_dashboard_kpis() is
  'Admin-only KPI bundle for the dashboard overview (Phase 9). Read-only.';

-- --------------------------------------------------------------------------
-- admin_recent_activity(p_limit)
--
-- Returns a jsonb array (newest first, at most p_limit rows) merging:
--   * booking_created   — booking_status_history rows with from_status null
--   * status_change     — every other booking_status_history row
--   * customer_registered — new customer profiles
-- Shape: { type, booking_number, customer_name, from_status, to_status,
--          occurred_at }
-- --------------------------------------------------------------------------
create or replace function public.admin_recent_activity(p_limit integer default 10)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_events jsonb;
begin
  if not public.is_admin() then
    raise exception 'Insufficient privileges' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(t.row order by t.occurred_at desc), '[]'::jsonb)
  into v_events
  from (
    select e.row, e.occurred_at
    from (
      select
        jsonb_build_object(
          'type', case when h.from_status is null
                       then 'booking_created' else 'status_change' end,
          'booking_number', b.booking_number,
          'customer_name', nullif(trim(coalesce(p.full_name, '')), ''),
          'from_status', h.from_status,
          'to_status', h.to_status,
          'occurred_at', h.created_at
        ) as row,
        h.created_at as occurred_at
      from public.booking_status_history h
      join public.bookings b on b.id = h.booking_id
      left join public.profiles p on p.id = b.customer_id

      union all

      select
        jsonb_build_object(
          'type', 'customer_registered',
          'booking_number', null,
          'customer_name', nullif(trim(coalesce(p.full_name, '')), ''),
          'from_status', null,
          'to_status', null,
          'occurred_at', p.created_at
        ) as row,
        p.created_at as occurred_at
      from public.profiles p
      where p.role = 'customer'
    ) e
    order by e.occurred_at desc
    limit greatest(coalesce(p_limit, 10), 1)
  ) t;

  return coalesce(v_events, '[]'::jsonb);
end;
$$;

comment on function public.admin_recent_activity(integer) is
  'Admin-only recent activity feed for the dashboard overview (Phase 9). Read-only.';

-- --------------------------------------------------------------------------
-- Privileges: authenticated only; the is_admin() check inside each function
-- rejects non-admin callers with 42501 before any data is read.
-- --------------------------------------------------------------------------
revoke all on function public.admin_dashboard_kpis() from public, anon;
revoke all on function public.admin_recent_activity(integer) from public, anon;
grant execute on function public.admin_dashboard_kpis() to authenticated;
grant execute on function public.admin_recent_activity(integer) to authenticated;
