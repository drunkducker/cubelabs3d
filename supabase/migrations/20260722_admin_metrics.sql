-- Cube Labs admin dashboard metrics.
-- A security-definer function returns site-wide aggregates that a normal user
-- token cannot read under RLS. It self-authorizes via is_admin(), so it is the
-- least-privilege way to power the dashboard (no service_role key in the app).
-- Run after the admin foundation and ads migrations.

create or replace function public.admin_dashboard_metrics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin((select auth.uid())) then
    raise exception 'Not authorized';
  end if;

  select jsonb_build_object(
    'players',        (select count(*) from public.profiles),
    'solves',         (select count(*) from public.solve_results),
    'solves_solved',  (select count(*) from public.solve_results where solved),
    'ads_active',     (select count(*) from public.ads where is_active),
    'ad_clicks',      (select coalesce(sum(clicks), 0) from public.ads),
    'ad_impressions', (select coalesce(sum(impressions), 0) from public.ads)
  ) into result;

  return result;
end;
$$;

-- Expose to signed-in users only; the internal is_admin() check does the real
-- gating. Anonymous callers cannot run it.
revoke execute on function public.admin_dashboard_metrics() from anon;
grant execute on function public.admin_dashboard_metrics() to authenticated;
