-- ============================================================================
-- Migration 0004: Triggers
-- Moroccan Caftan Rental — Phase 1
-- ============================================================================

-- profiles
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger prevent_profile_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- caftans
create trigger set_caftans_updated_at
  before update on public.caftans
  for each row execute function public.set_updated_at();

-- bookings
create trigger generate_booking_number_on_insert
  before insert on public.bookings
  for each row execute function public.generate_booking_number();

create trigger protect_booking_fields_on_update
  before update on public.bookings
  for each row execute function public.protect_booking_fields();

create trigger set_bookings_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

create trigger log_booking_status_on_insert
  after insert on public.bookings
  for each row execute function public.log_booking_status_change();

create trigger log_booking_status_on_update
  after update on public.bookings
  for each row execute function public.log_booking_status_change();

-- site_settings
create trigger set_site_settings_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- auth hook: create profile when a user signs up
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
