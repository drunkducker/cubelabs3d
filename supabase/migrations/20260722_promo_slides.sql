-- Cube Labs banners & carousels (affiliate/promo slides).
-- Slides grouped by carousel_key, rendered as banners or carousels by placement.
-- Run after the admin foundation migration.

create table if not exists public.promo_slides (
  id uuid primary key default gen_random_uuid(),
  carousel_key text not null default 'home_carousel',   -- named carousel/banner slot
  title text not null,
  subtitle text,
  link_url text,                                         -- affiliate / destination URL
  image_mobile_url text,
  image_desktop_url text,
  advertiser text,                                       -- affiliate partner
  disclosure text,                                       -- affiliate/sponsor disclosure
  priority integer not null default 0,                  -- slide order within the carousel
  is_active boolean not null default false,
  is_test boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists promo_slides_carousel_active_idx
  on public.promo_slides (carousel_key, is_active, priority desc);

alter table public.promo_slides enable row level security;

drop policy if exists "Admins manage promo slides" on public.promo_slides;
create policy "Admins manage promo slides"
on public.promo_slides for all
to authenticated
using (public.is_admin((select auth.uid())))
with check (public.is_admin((select auth.uid())));

drop policy if exists "Public can read live promo slides" on public.promo_slides;
create policy "Public can read live promo slides"
on public.promo_slides for select
to anon, authenticated
using (
  is_active
  and not is_test
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
);
