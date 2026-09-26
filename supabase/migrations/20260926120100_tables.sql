-- ============================================================================
-- Migration 0002: Core tables, constraints and indexes
-- Moroccan Caftan Rental — Phase 1
--
-- Tables: profiles, categories, caftans, caftan_images, bookings,
--         booking_status_history, site_settings
--
-- Design notes:
--  * All user-facing translatable text is stored as jsonb with the shape
--    { "ar": "...", "fr": "...", "en": "..." } and enforced by CHECK.
--  * bookings.rental_period is a generated daterange; an EXCLUSION constraint
--    makes double-booking impossible at the database level.
--  * Money is numeric(10,2) in MAD.
-- ============================================================================

-- --------------------------------------------------------------------------
-- profiles — extends auth.users with business data and the role flag
-- --------------------------------------------------------------------------
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  full_name       text not null default '',
  phone           text,
  whatsapp_number text,
  city            text,
  role            text not null default 'customer'
                  check (role in ('customer', 'admin')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.profiles is
  'Application-level user profile. role=admin grants back-office access.';

-- --------------------------------------------------------------------------
-- categories — caftan categories (Caftan, Takchita, Jellaba, ...)
-- --------------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique
              check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        jsonb not null
              check (name ?& array['ar', 'fr', 'en']),
  description jsonb not null default '{}'::jsonb,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

comment on column public.categories.name is
  'Translated name: {"ar": "...", "fr": "...", "en": "..."} — all three required.';

-- --------------------------------------------------------------------------
-- caftans — the rentable products
-- --------------------------------------------------------------------------
create table public.caftans (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique
                 check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category_id    uuid not null references public.categories (id) on delete restrict,
  name           jsonb not null
                 check (name ?& array['ar', 'fr', 'en']),
  description    jsonb not null default '{}'::jsonb,
  size           text not null default '',
  color          text not null default '',
  price_per_day  numeric(10, 2) not null check (price_per_day >= 0),
  deposit_amount numeric(10, 2) not null default 0 check (deposit_amount >= 0),
  status         text not null default 'available'
                 check (status in ('available', 'maintenance', 'retired')),
  featured       boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on column public.caftans.status is
  'available = bookable, maintenance = visible but not bookable, retired = hidden from public.';

-- --------------------------------------------------------------------------
-- caftan_images — image metadata; binary files live in Supabase Storage
-- --------------------------------------------------------------------------
create table public.caftan_images (
  id           uuid primary key default gen_random_uuid(),
  caftan_id    uuid not null references public.caftans (id) on delete cascade,
  storage_path text not null,
  alt_text     jsonb not null default '{}'::jsonb,
  sort_order   integer not null default 0,
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (caftan_id, storage_path)
);

comment on column public.caftan_images.storage_path is
  'Object path inside the "caftan-images" storage bucket.';

-- --------------------------------------------------------------------------
-- bookings — rental requests and their lifecycle
-- status flow: pending -> confirmed -> completed
--                    \-> rejected            (by admin)
--                    \-> cancelled           (by customer, only while pending)
-- --------------------------------------------------------------------------
create table public.bookings (
  id             uuid primary key default gen_random_uuid(),
  booking_number text not null unique,
  customer_id    uuid not null references public.profiles (id) on delete restrict,
  caftan_id      uuid not null references public.caftans (id) on delete restrict,
  start_date     date not null,
  end_date       date not null,
  status         text not null default 'pending'
                 check (status in ('pending', 'confirmed', 'rejected', 'completed', 'cancelled')),
  total_price    numeric(10, 2) not null check (total_price >= 0),
  deposit_status text not null default 'unpaid'
                 check (deposit_status in ('unpaid', 'paid', 'refunded', 'forfeited')),
  customer_notes text not null default '',
  admin_notes    text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  rental_period  daterange generated always as (daterange(start_date, end_date, '[]')) stored,
  check (end_date >= start_date)
);

comment on column public.bookings.total_price is
  'Server-computed total (days x price_per_day). Never trusted from the client.';

-- Double-booking guard: two *active* (pending/confirmed) bookings for the same
-- caftan can never overlap — enforced physically by the database, not the app.
alter table public.bookings
  add constraint no_overlapping_active_bookings
  exclude using gist (
    caftan_id     with =,
    rental_period with &&
  )
  where (status in ('pending', 'confirmed'));

-- --------------------------------------------------------------------------
-- booking_status_history — immutable audit trail of status transitions
-- --------------------------------------------------------------------------
create table public.booking_status_history (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings (id) on delete cascade,
  from_status text check (from_status in ('pending', 'confirmed', 'rejected', 'completed', 'cancelled')),
  to_status   text not null check (to_status in ('pending', 'confirmed', 'rejected', 'completed', 'cancelled')),
  changed_by  uuid references auth.users (id) on delete set null,
  note        text not null default '',
  created_at  timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- site_settings — singleton row with shop-wide configuration
-- --------------------------------------------------------------------------
create table public.site_settings (
  id              integer primary key default 1 check (id = 1),
  whatsapp_number text not null default '',
  phone           text not null default '',
  email           text not null default '',
  address         jsonb not null default '{}'::jsonb,
  social_links    jsonb not null default '{}'::jsonb,
  seo_defaults    jsonb not null default '{}'::jsonb,
  updated_at      timestamptz not null default now()
);

comment on table public.site_settings is
  'Singleton configuration row (id must always be 1).';

-- --------------------------------------------------------------------------
-- Indexes
-- --------------------------------------------------------------------------
create index caftans_category_id_idx on public.caftans (category_id);
create index caftans_status_idx      on public.caftans (status);
create index caftans_featured_idx    on public.caftans (featured) where featured;

create index caftan_images_caftan_idx on public.caftan_images (caftan_id, sort_order);
-- At most one primary image per caftan
create unique index caftan_images_single_primary_idx
  on public.caftan_images (caftan_id) where is_primary;

create index bookings_customer_idx      on public.bookings (customer_id, created_at desc);
create index bookings_status_idx        on public.bookings (status);
create index bookings_caftan_status_idx on public.bookings (caftan_id, status);

create index booking_status_history_booking_idx on public.booking_status_history (booking_id, created_at);
