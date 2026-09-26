-- ============================================================================
-- Migration 0005: Row Level Security
-- Moroccan Caftan Rental — Phase 1
--
-- Model:
--  * anon / authenticated : read-only on catalog data (retired caftans hidden)
--  * authenticated customer: full access to OWN bookings (insert as pending,
--    cancel while pending), own profile; nothing else
--  * admin (profiles.role='admin'): full access
--  * booking_status_history: written only by SECURITY DEFINER triggers
--
-- `drop policy if exists` keeps the migration re-runnable in local testing.
-- ============================================================================

alter table public.profiles               enable row level security;
alter table public.categories             enable row level security;
alter table public.caftans                enable row level security;
alter table public.caftan_images          enable row level security;
alter table public.bookings               enable row level security;
alter table public.booking_status_history enable row level security;
alter table public.site_settings          enable row level security;

-- --------------------------------------------------------------------------
-- profiles
-- --------------------------------------------------------------------------
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin on public.profiles
  for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
-- (role changes are additionally guarded by the prevent_role_escalation trigger)
-- No INSERT/DELETE policy: rows are created by the handle_new_user trigger
-- and removed via ON DELETE CASCADE from auth.users.

-- --------------------------------------------------------------------------
-- categories — public catalog data
-- --------------------------------------------------------------------------
drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories
  for select using (true);

drop policy if exists categories_admin_insert on public.categories;
create policy categories_admin_insert on public.categories
  for insert to authenticated with check (public.is_admin());

drop policy if exists categories_admin_update on public.categories;
create policy categories_admin_update on public.categories
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists categories_admin_delete on public.categories;
create policy categories_admin_delete on public.categories
  for delete to authenticated using (public.is_admin());

-- --------------------------------------------------------------------------
-- caftans — public read except retired; admin write
-- --------------------------------------------------------------------------
drop policy if exists caftans_public_read on public.caftans;
create policy caftans_public_read on public.caftans
  for select using (status <> 'retired' or public.is_admin());

drop policy if exists caftans_admin_insert on public.caftans;
create policy caftans_admin_insert on public.caftans
  for insert to authenticated with check (public.is_admin());

drop policy if exists caftans_admin_update on public.caftans;
create policy caftans_admin_update on public.caftans
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists caftans_admin_delete on public.caftans;
create policy caftans_admin_delete on public.caftans
  for delete to authenticated using (public.is_admin());

-- --------------------------------------------------------------------------
-- caftan_images — visibility follows the parent caftan
-- --------------------------------------------------------------------------
drop policy if exists caftan_images_public_read on public.caftan_images;
create policy caftan_images_public_read on public.caftan_images
  for select using (
    exists (
      select 1 from public.caftans c
      where c.id = caftan_id
        and (c.status <> 'retired' or public.is_admin())
    )
  );

drop policy if exists caftan_images_admin_insert on public.caftan_images;
create policy caftan_images_admin_insert on public.caftan_images
  for insert to authenticated with check (public.is_admin());

drop policy if exists caftan_images_admin_update on public.caftan_images;
create policy caftan_images_admin_update on public.caftan_images
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists caftan_images_admin_delete on public.caftan_images;
create policy caftan_images_admin_delete on public.caftan_images
  for delete to authenticated using (public.is_admin());

-- --------------------------------------------------------------------------
-- bookings
-- --------------------------------------------------------------------------
-- Customers create booking requests only for themselves, always as unpaid
-- "pending", with no admin notes, and only for a caftan that is available.
drop policy if exists bookings_customer_insert on public.bookings;
create policy bookings_customer_insert on public.bookings
  for insert to authenticated
  with check (
    customer_id = auth.uid()
    and status = 'pending'
    and deposit_status = 'unpaid'
    and admin_notes = ''
    and exists (
      select 1 from public.caftans c
      where c.id = caftan_id and c.status = 'available'
    )
  );

drop policy if exists bookings_select_own_or_admin on public.bookings;
create policy bookings_select_own_or_admin on public.bookings
  for select to authenticated
  using (customer_id = auth.uid() or public.is_admin());

-- Admins can change everything.
drop policy if exists bookings_admin_update on public.bookings;
create policy bookings_admin_update on public.bookings
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Customers can only cancel their own booking while it is still pending.
-- The protect_booking_fields trigger guarantees nothing else changes.
drop policy if exists bookings_customer_cancel on public.bookings;
create policy bookings_customer_cancel on public.bookings
  for update to authenticated
  using (customer_id = auth.uid() and status = 'pending')
  with check (customer_id = auth.uid() and status = 'cancelled');

drop policy if exists bookings_admin_delete on public.bookings;
create policy bookings_admin_delete on public.bookings
  for delete to authenticated using (public.is_admin());

-- --------------------------------------------------------------------------
-- booking_status_history — read-only, scoped like the parent booking
-- --------------------------------------------------------------------------
drop policy if exists history_select_via_booking on public.booking_status_history;
create policy history_select_via_booking on public.booking_status_history
  for select to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.customer_id = auth.uid() or public.is_admin())
    )
  );
-- No INSERT/UPDATE/DELETE policies: written exclusively by the
-- SECURITY DEFINER trigger log_booking_status_change().

-- --------------------------------------------------------------------------
-- site_settings — public read (WhatsApp number etc.), admin write
-- --------------------------------------------------------------------------
drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings
  for select using (true);

drop policy if exists site_settings_admin_insert on public.site_settings;
create policy site_settings_admin_insert on public.site_settings
  for insert to authenticated with check (public.is_admin());

drop policy if exists site_settings_admin_update on public.site_settings;
create policy site_settings_admin_update on public.site_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
