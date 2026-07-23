-- ============================================================================
-- Cube Labs 3D — Media library + premium billing foundation
-- ----------------------------------------------------------------------------
-- Additive, idempotent. Run AFTER 20260724_ad_rendering.sql.
-- RLS enabled deny-by-default; admin access is via the service role. Users may
-- read their OWN subscription row only.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Media assets (stable metadata; provider URL is NOT the identity)
-- ----------------------------------------------------------------------------
create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'admin-media',
  object_key text not null,
  mime_type text,
  size_bytes bigint,
  width integer,
  height integer,
  alt_text text,
  checksum text,
  uploader uuid references auth.users(id) on delete set null,
  moderation_status text not null default 'pending' check (moderation_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  unique (bucket, object_key)
);
create index if not exists media_assets_created_idx on public.media_assets (created_at desc);

-- ----------------------------------------------------------------------------
-- Premium plans + subscriptions (provider-agnostic; Stripe is one provider)
-- ----------------------------------------------------------------------------
create table if not exists public.premium_plans (
  id text primary key,                 -- e.g. 'no_ads_monthly'
  name text not null,
  description text,
  price_cents integer not null default 0,
  currency text not null default 'usd',
  interval text not null default 'month' check (interval in ('month','year','once')),
  removes_ads boolean not null default true,
  is_active boolean not null default true,
  provider_price_id text,              -- e.g. Stripe price id
  sort_order integer not null default 0
);

create table if not exists public.premium_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text references public.premium_plans(id) on delete set null,
  status text not null default 'active' check (status in ('active','trialing','past_due','canceled','incomplete')),
  provider text not null default 'stripe',
  provider_customer_id text,
  provider_subscription_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subscription_id)
);
create index if not exists premium_subscriptions_user_idx on public.premium_subscriptions (user_id, status);
create index if not exists premium_subscriptions_status_idx on public.premium_subscriptions (status, current_period_end);

-- Seed a default no-ads plan (edit price/provider id later in admin).
insert into public.premium_plans (id,name,description,price_cents,interval,removes_ads,sort_order) values
  ('no_ads_monthly','No-Ads Monthly','Remove all managed ads and support Cube Labs.',299,'month',true,10),
  ('no_ads_yearly','No-Ads Yearly','Remove all managed ads for a year.',2499,'year',true,20)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.media_assets          enable row level security;
alter table public.premium_plans         enable row level security;
alter table public.premium_subscriptions enable row level security;

-- Public may read active plans (to show a pricing page). Nothing else is public.
drop policy if exists "Anyone can read active plans" on public.premium_plans;
create policy "Anyone can read active plans"
on public.premium_plans for select to anon, authenticated
using (is_active = true);

-- A user may read only their OWN subscription.
drop policy if exists "Users read own subscription" on public.premium_subscriptions;
create policy "Users read own subscription"
on public.premium_subscriptions for select to authenticated
using ((select auth.uid()) = user_id);

-- media_assets and all writes: no permissive policy -> service role only.

-- Rollback:
--   drop table if exists public.premium_subscriptions;
--   drop table if exists public.premium_plans;
--   drop table if exists public.media_assets;
