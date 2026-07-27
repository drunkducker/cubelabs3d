-- User-facing safety: account blocking and abuse reporting.
-- Adds the user_blocks table and opens a tightly scoped insert path on the
-- existing public.moderation_reports table (created in 20260723_admin_platform.sql)
-- so ordinary members can file reports that the admin moderation queue already
-- consumes. Run after 20260723_admin_platform.sql.
--
-- Design notes:
--   * user_blocks is deny-by-default under RLS; a member can see, create, and
--     remove only their own block rows. Nobody can read who blocked them.
--   * moderation_reports stays deny-by-default for reads. The new insert policy
--     pins reporter_id to the caller and forces a fresh, low-trust row so a
--     member cannot pre-resolve, escalate severity, or assign a report.

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Account blocks
-- ----------------------------------------------------------------------------
create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  check (blocker_id <> blocked_id),
  unique (blocker_id, blocked_id)
);

create index if not exists user_blocks_blocker_idx on public.user_blocks (blocker_id, created_at desc);
create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

revoke all on public.user_blocks from anon, authenticated;
grant select, insert, delete on public.user_blocks to authenticated;

drop policy if exists user_blocks_owner_read on public.user_blocks;
create policy user_blocks_owner_read
on public.user_blocks for select to authenticated
using ((select auth.uid()) = blocker_id);

drop policy if exists user_blocks_owner_insert on public.user_blocks;
create policy user_blocks_owner_insert
on public.user_blocks for insert to authenticated
with check (
  (select auth.uid()) = blocker_id
  and blocker_id <> blocked_id
);

drop policy if exists user_blocks_owner_delete on public.user_blocks;
create policy user_blocks_owner_delete
on public.user_blocks for delete to authenticated
using ((select auth.uid()) = blocker_id);

-- ----------------------------------------------------------------------------
-- 2. Member abuse reports (scoped insert on the existing admin table)
-- ----------------------------------------------------------------------------
grant select, insert on public.moderation_reports to authenticated;

-- A member may only read reports they filed. Admin tooling uses the service
-- role, which bypasses RLS, so this does not affect moderation.
drop policy if exists moderation_reports_reporter_read on public.moderation_reports;
create policy moderation_reports_reporter_read
on public.moderation_reports for select to authenticated
using ((select auth.uid()) = reporter_id);

-- A member may create a report only as themselves, and only a fresh, unassigned,
-- unresolved row at low/normal severity. Triage fields stay under admin control.
drop policy if exists moderation_reports_reporter_insert on public.moderation_reports;
create policy moderation_reports_reporter_insert
on public.moderation_reports for insert to authenticated
with check (
  (select auth.uid()) = reporter_id
  and status = 'open'
  and severity in ('low', 'normal')
  and assigned_to is null
  and resolution is null
  and audit_id is null
);
