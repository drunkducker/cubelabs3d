-- Cube Labs admin portal foundation.
-- Adds role-based access control and the privileged-action audit log.
-- Run this in the Supabase SQL editor after the base schema and the
-- 20260722_cube_id_platform.sql migration.

-- 1. Roles ------------------------------------------------------------------

alter table public.profiles
  add column if not exists role text not null default 'user';

alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'support', 'analyst', 'editor', 'moderator', 'admin', 'owner'));

-- Bootstrap the first owner by email. The application also honours an
-- ADMIN_OWNER_EMAIL env var as a failsafe, so access never depends solely on
-- this row being present.
update public.profiles p
set role = 'owner'
from auth.users u
where u.id = p.id
  and lower(u.email) = lower('dleshrader@gmail.com');

-- 2. Escalation guard -------------------------------------------------------
-- The existing "Users can update their own profile" policy would otherwise let
-- a user set their own role. Block any role change unless the acting user is an
-- owner. (Owner-driven role management arrives with the User Manager section
-- via a dedicated protected path.)
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if not exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'owner'
    ) then
      raise exception 'Only an owner may change a profile role.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role_trigger on public.profiles;
create trigger protect_profile_role_trigger
before update of role on public.profiles
for each row execute function public.protect_profile_role();

-- 3. Admin-tier helper ------------------------------------------------------
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid
      and role in ('owner', 'admin', 'moderator', 'editor', 'support', 'analyst')
  );
$$;

-- 4. Audit log --------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null,
  target_type text,
  target_id text,
  previous_value jsonb,
  new_value jsonb,
  reason text,
  metadata jsonb,
  success boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_action_idx
  on public.admin_audit_log (action);

alter table public.admin_audit_log enable row level security;

drop policy if exists "Admins can read audit log" on public.admin_audit_log;
create policy "Admins can read audit log"
on public.admin_audit_log for select
to authenticated
using (public.is_admin((select auth.uid())));

drop policy if exists "Admins can append audit log" on public.admin_audit_log;
create policy "Admins can append audit log"
on public.admin_audit_log for insert
to authenticated
with check (
  public.is_admin((select auth.uid()))
  and actor_id = (select auth.uid())
);
