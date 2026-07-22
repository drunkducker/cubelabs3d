-- Cube Labs managed ads.
-- Ads/affiliate slots are database-driven managed content rendered by named
-- placement. Run after 20260722_admin_foundation.sql.

create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  name text not null,                       -- internal campaign name
  advertiser text,                          -- advertiser or affiliate partner
  ad_type text not null default 'banner'
    check (ad_type in ('banner', 'carousel', 'card', 'video')),
  placement text not null,                  -- e.g. home_top_banner, solver_product_carousel
  headline text,
  body text,
  button_text text,
  destination_url text,                     -- click-through / affiliate URL
  image_mobile_url text,
  image_desktop_url text,
  disclosure text,                          -- sponsored / affiliate disclosure
  priority integer not null default 0,      -- higher shows first within a placement
  is_active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  is_test boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ads_placement_active_idx
  on public.ads (placement, is_active, priority desc);

alter table public.ads enable row level security;

-- Admins manage everything.
drop policy if exists "Admins manage ads" on public.ads;
create policy "Admins manage ads"
on public.ads for all
to authenticated
using (public.is_admin((select auth.uid())))
with check (public.is_admin((select auth.uid())));

-- The public site may read only live, non-test ads within their schedule.
-- This powers the render layer (AdSlot) without exposing drafts.
drop policy if exists "Public can read live ads" on public.ads;
create policy "Public can read live ads"
on public.ads for select
to anon, authenticated
using (
  is_active
  and not is_test
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
);
