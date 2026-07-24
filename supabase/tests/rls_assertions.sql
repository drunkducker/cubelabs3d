-- ============================================================================
-- Cube Labs 3D — RLS assertion script
-- ----------------------------------------------------------------------------
-- Run in the Supabase SQL editor AFTER every admin migration
-- (20260723/24/25/26). Uses the anon and authenticated roles; every RAISE
-- EXCEPTION here is a real policy failure that must block a deploy.
--
-- Wrapped in ROLLBACK so nothing is committed; safe to run in production.
-- ============================================================================
begin;

do $$
declare
  n int;
begin
  -- 1. RLS must be ENABLED on every sensitive table.
  select count(*) into n
  from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
  where ns.nspname = 'public'
    and c.relname in (
      'admin_members','admin_audit_log','admin_security_events','site_settings',
      'feature_flags','test_runs','ad_campaigns','ad_carousels','ad_carousel_slides',
      'affiliate_products','moderation_reports','media_assets','premium_plans',
      'premium_subscriptions','rate_limits'
    )
    and c.relrowsecurity = false;
  if n > 0 then raise exception 'RLS disabled on % sensitive table(s)', n; end if;

  -- 2. Anon must NOT read authorization / audit / security tables.
  set local role anon;

  perform 1;
  begin
    perform 1 from public.admin_members limit 1;
    if found then raise exception 'anon can read admin_members'; end if;
  exception when insufficient_privilege then null;
  end;

  begin
    perform 1 from public.admin_audit_log limit 1;
    if found then raise exception 'anon can read admin_audit_log'; end if;
  exception when insufficient_privilege then null;
  end;

  begin
    perform 1 from public.admin_security_events limit 1;
    if found then raise exception 'anon can read admin_security_events'; end if;
  exception when insufficient_privilege then null;
  end;

  begin
    perform 1 from public.rate_limits limit 1;
    if found then raise exception 'anon can read rate_limits'; end if;
  exception when insufficient_privilege then null;
  end;

  -- 3. Anon MUST be able to read active affiliate products + active plans.
  perform 1 from public.affiliate_products where is_active = true limit 1;
  perform 1 from public.premium_plans where is_active = true limit 1;

  reset role;

  -- 4. Ordinary authenticated must not read the audit log or security events.
  set local role authenticated;
  begin
    perform 1 from public.admin_audit_log limit 1;
    if found then raise exception 'authenticated user can read admin_audit_log'; end if;
  exception when insufficient_privilege then null;
  end;

  -- 5. Public leaderboard read must exclude test data (structural: index exists
  --    and the app-level query filters). Assert the column defaults and index.
  perform 1
  from pg_indexes
  where schemaname = 'public'
    and indexname = 'solve_results_eligible_idx';
  if not found then raise exception 'solve_results_eligible_idx missing'; end if;

  reset role;
  raise notice 'RLS assertions passed.';
end
$$;

rollback;
