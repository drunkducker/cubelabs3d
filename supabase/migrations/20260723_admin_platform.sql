-- ============================================================================
-- Cube Labs 3D — Admin Platform Foundation
-- ----------------------------------------------------------------------------
-- Additive, idempotent migration. Run AFTER:
--   supabase/schema.sql
--   supabase/migrations/20260722_cube_id_platform.sql
--   supabase/migrations/20260722_cube_labs_mail_foundation.sql
--
-- Design notes / security decisions:
--  * Every admin table has RLS ENABLED with NO permissive policy for anon or
--    ordinary authenticated users. The admin service layer talks to these
--    tables with the Supabase SERVICE-ROLE key from server-only code, which
--    bypasses RLS. That key is never exposed to the browser and is only used
--    after requireAdmin()/requirePermission() has passed on the server.
--    Failing closed (no policy) is intentional: a client that somehow reaches
--    these tables with an anon/user token sees nothing.
--  * Audit log is append-only for ordinary admins. Only the service role (and
--    the Owner via the service layer) may read it. There is deliberately no
--    UPDATE or DELETE policy, so even a leaked user token cannot tamper.
--  * Gameplay tables (solve_results, challenges) are EXTENDED with additive
--    nullable/defaulted columns only. No existing row is rewritten.
--
-- Rollback guidance is at the bottom of this file.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Administrator memberships
-- ----------------------------------------------------------------------------
-- Authorization lives here, NOT in profiles or client-editable user metadata.
create table if not exists public.admin_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','moderator','editor','support','analyst')),
  is_active boolean not null default true,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists admin_members_role_idx on public.admin_members (role, is_active);

-- ----------------------------------------------------------------------------
-- 2. Append-only audit log
-- ----------------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null,
  target_type text,
  target_id text,
  previous_value jsonb,     -- redacted before write by the service layer
  new_value jsonb,          -- redacted before write by the service layer
  reason text,
  success boolean not null default true,
  failure_category text,
  correlation_id text,
  request_meta jsonb,       -- ip / forwarded host / user agent, no secrets
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_actor_idx on public.admin_audit_log (actor_id, created_at desc);
create index if not exists admin_audit_target_idx on public.admin_audit_log (target_type, target_id, created_at desc);
create index if not exists admin_audit_action_idx on public.admin_audit_log (action, created_at desc);

comment on table public.admin_audit_log is
  'Append-only. No UPDATE/DELETE policy on purpose. Sensitive values are redacted by the service layer before insert.';

-- ----------------------------------------------------------------------------
-- 3. Security events (normalized signals)
-- ----------------------------------------------------------------------------
create table if not exists public.admin_security_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  severity text not null default 'info' check (severity in ('info','warning','critical')),
  actor_id uuid references auth.users(id) on delete set null,
  target_id text,
  detail jsonb,             -- redacted; never store tokens/secrets
  request_meta jsonb,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists admin_security_events_idx on public.admin_security_events (event_type, created_at desc);
create index if not exists admin_security_events_unresolved_idx on public.admin_security_events (resolved, severity, created_at desc);

-- ----------------------------------------------------------------------------
-- 4. Typed site settings and feature flags
-- ----------------------------------------------------------------------------
-- Secret values never live here (this table is never browser-readable, but as a
-- second guard the service layer refuses to write keys marked is_secret).
create table if not exists public.site_settings (
  key text primary key,
  value jsonb,
  data_type text not null default 'string' check (data_type in ('string','number','boolean','json')),
  category text not null default 'general',
  is_public boolean not null default false,
  is_secret boolean not null default false,
  description text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  environment text not null default 'all' check (environment in ('all','production','preview','development')),
  rollout_percentage smallint not null default 100 check (rollout_percentage between 0 and 100),
  starts_at timestamptz,
  ends_at timestamptz,
  description text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 5. Test runs (parent record so QA data can be traced and deleted together)
-- ----------------------------------------------------------------------------
create table if not exists public.test_runs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  name text not null,
  purpose text,
  config jsonb not null default '{}'::jsonb,
  generated_counts jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','cleaning','cleaned','expired')),
  cleanup_status text not null default 'pending' check (cleanup_status in ('pending','done','failed')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists test_runs_status_idx on public.test_runs (status, created_at desc);

-- ----------------------------------------------------------------------------
-- 6. Managed advertising: campaigns, carousels, slides, affiliate products
-- ----------------------------------------------------------------------------
create table if not exists public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  advertiser text,
  campaign_type text not null default 'banner',
  placement text not null,
  headline text,
  body text,
  button_text text,
  destination_url text,
  tracking_url text,
  disclosure text,
  mobile_asset_url text,
  desktop_asset_url text,
  alt_text text,
  priority integer not null default 0,
  status text not null default 'draft' check (status in ('draft','active','paused','archived')),
  timezone text not null default 'UTC',
  starts_at timestamptz,
  ends_at timestamptz,
  impression_count bigint not null default 0,
  click_count bigint not null default 0,
  conversion_count bigint not null default 0,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ad_campaigns_placement_idx
  on public.ad_campaigns (placement, status, priority desc, starts_at);

create table if not exists public.ad_carousels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  placement text not null,
  status text not null default 'draft' check (status in ('draft','active','paused','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.ad_carousel_slides (
  id uuid primary key default gen_random_uuid(),
  carousel_id uuid not null references public.ad_carousels(id) on delete cascade,
  sort_order integer not null default 0,
  headline text,
  body text,
  mobile_asset_url text,
  desktop_asset_url text,
  alt_text text,
  destination_url text,
  disclosure text,
  priority integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'draft' check (status in ('draft','active','paused','archived'))
);

create index if not exists ad_slides_carousel_idx on public.ad_carousel_slides (carousel_id, sort_order);

create table if not exists public.affiliate_products (
  id uuid primary key default gen_random_uuid(),
  partner text,
  name text not null,
  brand text,
  category text,
  puzzle_type text,
  description text,
  image_url text,
  destination_url text,
  affiliate_url text,
  price_note text,
  availability_note text,
  disclosure text,
  placement text,
  sort_order integer not null default 0,
  is_active boolean not null default false,
  is_featured boolean not null default false,
  click_count bigint not null default 0,
  revenue_note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists affiliate_products_placement_idx
  on public.affiliate_products (placement, is_active, sort_order);

-- ----------------------------------------------------------------------------
-- 7. Moderation reports
-- ----------------------------------------------------------------------------
create table if not exists public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,   -- user | display_name | avatar | message | challenge | solve | leaderboard_row | content
  target_id text not null,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text,
  severity text not null default 'normal' check (severity in ('low','normal','high','critical')),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  assigned_to uuid references auth.users(id) on delete set null,
  resolution text,
  audit_id uuid references public.admin_audit_log(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists moderation_reports_status_idx on public.moderation_reports (status, severity, created_at desc);

-- ----------------------------------------------------------------------------
-- 8. Additive gameplay extensions (backwards compatible; no row rewrites)
-- ----------------------------------------------------------------------------
alter table public.solve_results
  add column if not exists is_test boolean not null default false,
  add column if not exists test_run_id uuid references public.test_runs(id) on delete set null,
  add column if not exists undo_count integer,
  add column if not exists hint_used boolean not null default false,
  add column if not exists solver_used boolean not null default false,
  add column if not exists assisted boolean not null default false,
  add column if not exists is_official boolean not null default false,
  add column if not exists control_type text,
  add column if not exists device_type text,
  add column if not exists state_schema_version integer not null default 1,
  add column if not exists leaderboard_eligible boolean not null default true,
  add column if not exists verification_status text not null default 'unverified'
    check (verification_status in ('unverified','verified','rejected')),
  add column if not exists is_suspicious boolean not null default false,
  add column if not exists moderation_status text not null default 'none'
    check (moderation_status in ('none','flagged','excluded','corrected')),
  -- moderation correction trail: original value preserved, never overwritten
  add column if not exists original_time_ms integer,
  add column if not exists correction_reason text,
  add column if not exists corrected_by uuid references auth.users(id) on delete set null,
  add column if not exists corrected_at timestamptz;

create index if not exists solve_results_test_run_idx on public.solve_results (test_run_id) where test_run_id is not null;
create index if not exists solve_results_eligible_idx
  on public.solve_results (puzzle_type, leaderboard_eligible, is_test, solve_time_ms)
  where leaderboard_eligible = true and is_test = false;

alter table public.challenges
  add column if not exists is_test boolean not null default false,
  add column if not exists test_run_id uuid references public.test_runs(id) on delete set null,
  add column if not exists winner_id uuid references auth.users(id) on delete set null,
  add column if not exists dispute_status text not null default 'none'
    check (dispute_status in ('none','disputed','resolved')),
  add column if not exists recipient_time_ms integer,
  add column if not exists moderation_note text;

-- ----------------------------------------------------------------------------
-- 9. Enable RLS on all new tables. No permissive policy = deny by default for
--    anon and ordinary authenticated roles. Service role bypasses RLS.
-- ----------------------------------------------------------------------------
alter table public.admin_members          enable row level security;
alter table public.admin_audit_log        enable row level security;
alter table public.admin_security_events  enable row level security;
alter table public.site_settings          enable row level security;
alter table public.feature_flags          enable row level security;
alter table public.test_runs              enable row level security;
alter table public.ad_campaigns           enable row level security;
alter table public.ad_carousels           enable row level security;
alter table public.ad_carousel_slides     enable row level security;
alter table public.affiliate_products     enable row level security;
alter table public.moderation_reports     enable row level security;

-- Public-facing read policies ONLY where a public page legitimately needs the
-- row (active, scheduled campaigns and public settings). Everything else stays
-- closed and is reached only through the service role.

drop policy if exists "Anyone can read live campaigns" on public.ad_campaigns;
create policy "Anyone can read live campaigns"
on public.ad_campaigns for select to anon, authenticated
using (
  status = 'active'
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
);

drop policy if exists "Anyone can read live carousels" on public.ad_carousels;
create policy "Anyone can read live carousels"
on public.ad_carousels for select to anon, authenticated
using (status = 'active');

drop policy if exists "Anyone can read live slides" on public.ad_carousel_slides;
create policy "Anyone can read live slides"
on public.ad_carousel_slides for select to anon, authenticated
using (
  status = 'active'
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
);

drop policy if exists "Anyone can read active affiliate products" on public.affiliate_products;
create policy "Anyone can read active affiliate products"
on public.affiliate_products for select to anon, authenticated
using (is_active = true);

drop policy if exists "Anyone can read public settings" on public.site_settings;
create policy "Anyone can read public settings"
on public.site_settings for select to anon, authenticated
using (is_public = true and is_secret = false);

-- Authenticated users may FILE a moderation report (insert only). They cannot
-- read the moderation queue.
drop policy if exists "Users can file reports" on public.moderation_reports;
create policy "Users can file reports"
on public.moderation_reports for insert to authenticated
with check ((select auth.uid()) = reporter_id);

-- ----------------------------------------------------------------------------
-- 10. Owner bootstrap helper
-- ----------------------------------------------------------------------------
-- Promotes an existing auth user (by email) to Owner. Run ONCE from the
-- Supabase SQL editor after the first owner account is created:
--     select public.bootstrap_owner('you@example.com');
-- SECURITY DEFINER so it can read auth.users; it only ever inserts an Owner row.
create or replace function public.bootstrap_owner(owner_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  select id into target from auth.users where lower(email) = lower(owner_email) limit 1;
  if target is null then
    raise exception 'No auth user with email %', owner_email;
  end if;
  insert into public.admin_members (user_id, role, is_active, created_by, note)
  values (target, 'owner', true, target, 'Bootstrapped owner')
  on conflict (user_id) do update set role = 'owner', is_active = true, updated_at = now();
  return target;
end;
$$;

-- ----------------------------------------------------------------------------
-- Rollback guidance
-- ----------------------------------------------------------------------------
-- This migration is additive. To roll back in a non-production environment:
--   drop function if exists public.bootstrap_owner(text);
--   drop table if exists public.moderation_reports;
--   drop table if exists public.affiliate_products;
--   drop table if exists public.ad_carousel_slides;
--   drop table if exists public.ad_carousels;
--   drop table if exists public.ad_campaigns;
--   drop table if exists public.test_runs;
--   drop table if exists public.feature_flags;
--   drop table if exists public.site_settings;
--   drop table if exists public.admin_security_events;
--   drop table if exists public.admin_audit_log;
--   drop table if exists public.admin_members;
-- The added solve_results / challenges columns are safe to leave in place; drop
-- them individually only if you must fully revert, and export any real data first.
