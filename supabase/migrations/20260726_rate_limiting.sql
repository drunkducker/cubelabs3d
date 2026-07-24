-- ============================================================================
-- Cube Labs 3D — Rate limiting / abuse control
-- ----------------------------------------------------------------------------
-- Additive, idempotent. Run AFTER 20260725_media_and_billing.sql.
--
-- A fixed-window counter keyed by an opaque bucket string (e.g. "signin:ip",
-- "admin_action:<uuid>"). check_rate_limit() is SECURITY DEFINER so it can be
-- called by anon (sign-in lockout) and by the service role, while the table
-- itself stays closed (RLS on, no policy). Fail-closed callers treat a DB error
-- as "deny" on the most sensitive paths.
-- ============================================================================

create table if not exists public.rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (bucket, window_start)
);

alter table public.rate_limits enable row level security;
-- No policy: only SECURITY DEFINER functions and the service role touch this.

create index if not exists rate_limits_window_idx on public.rate_limits (window_start);

/*
 * Returns true when the action is ALLOWED, false when the limit is exceeded.
 * Atomically increments the current fixed window's counter.
 */
create or replace function public.check_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  c integer;
begin
  insert into public.rate_limits (bucket, window_start, count)
  values (p_bucket, w, 1)
  on conflict (bucket, window_start)
  do update set count = public.rate_limits.count + 1
  returning count into c;

  return c <= p_limit;
end;
$$;

grant execute on function public.check_rate_limit(text, integer, integer) to anon, authenticated;

/*
 * Housekeeping: delete windows older than a day. Call from a scheduled job or
 * occasionally from the service role.
 */
create or replace function public.prune_rate_limits()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limits where window_start < now() - interval '1 day';
$$;

comment on function public.check_rate_limit(text, integer, integer) is
  'Fixed-window rate limiter. Returns true if allowed. SECURITY DEFINER so anon can self-throttle sign-in without table access.';

-- Rollback:
--   drop function if exists public.prune_rate_limits();
--   drop function if exists public.check_rate_limit(text, integer, integer);
--   drop table if exists public.rate_limits;
