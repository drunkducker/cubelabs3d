-- Cube Labs ad click/impression tracking.
-- A security-definer function increments counters without exposing the ads
-- table for writes. Callable by anyone (analytics counters, not sensitive).
-- Run after the ads migration.

create or replace function public.track_ad_event(ad uuid, event text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if event = 'click' then
    update public.ads set clicks = clicks + 1 where id = ad;
  elsif event = 'impression' then
    update public.ads set impressions = impressions + 1 where id = ad;
  end if;
end;
$$;

grant execute on function public.track_ad_event(uuid, text) to anon, authenticated;
