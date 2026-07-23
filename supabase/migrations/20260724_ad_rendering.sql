-- ============================================================================
-- Cube Labs 3D — Public ad/affiliate rendering support
-- ----------------------------------------------------------------------------
-- Additive, idempotent. Run AFTER 20260723_admin_platform.sql.
--
-- Public pages read LIVE ad/affiliate rows through the anon key using the SELECT
-- policies added in 20260723 (active/in-window rows only). This migration adds
-- narrow SECURITY DEFINER counters so the public can record an impression/click
-- WITHOUT being granted UPDATE on the whole table — the functions only ever
-- increment one integer column and cannot change content, status, or targeting.
-- ============================================================================

create or replace function public.bump_ad_impression(campaign uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.ad_campaigns set impression_count = impression_count + 1
  where id = campaign and status = 'active';
$$;

create or replace function public.bump_ad_click(campaign uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.ad_campaigns set click_count = click_count + 1
  where id = campaign and status = 'active';
$$;

create or replace function public.bump_affiliate_click(product uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.affiliate_products set click_count = click_count + 1
  where id = product and is_active = true;
$$;

-- Anyone may record a metric; they still cannot read or modify anything else.
grant execute on function public.bump_ad_impression(uuid) to anon, authenticated;
grant execute on function public.bump_ad_click(uuid) to anon, authenticated;
grant execute on function public.bump_affiliate_click(uuid) to anon, authenticated;

comment on function public.bump_ad_impression(uuid) is
  'Public metric counter. SECURITY DEFINER so anon can increment only impression_count on active campaigns; grants no other access.';

-- Rollback:
--   drop function if exists public.bump_ad_impression(uuid);
--   drop function if exists public.bump_ad_click(uuid);
--   drop function if exists public.bump_affiliate_click(uuid);
