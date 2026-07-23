-- Cube Labs social discovery, friend actions, and privacy request queue.
-- Run after 20260722_cube_id_platform.sql, 20260722_cube_labs_mail_foundation.sql,
-- and 20260722_tracked_scrambles_solver_memory.sql.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists account_status text not null default 'active',
  add column if not exists privacy_export_requested_at timestamptz,
  add column if not exists account_closure_requested_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_account_status_valid'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_account_status_valid
      check (account_status in ('active','export_requested','closure_requested','closed','deleted'));
  end if;
end $$;

create table if not exists public.account_data_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  request_type text not null check (request_type in ('export','close_account','delete_data')),
  status text not null default 'queued' check (status in ('queued','processing','completed','failed','cancelled')),
  requested_email text,
  export_before_delete boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists account_data_requests_set_updated_at on public.account_data_requests;
create trigger account_data_requests_set_updated_at
before update on public.account_data_requests
for each row execute function public.set_updated_at();

alter table public.account_data_requests enable row level security;

revoke all on public.account_data_requests from anon, authenticated;
grant select, insert on public.account_data_requests to authenticated;

drop policy if exists "Profiles are readable by signed-in users" on public.profiles;
drop policy if exists "Public profiles are readable" on public.profiles;
drop policy if exists profiles_public_or_owner_read on public.profiles;
create policy profiles_public_or_owner_read
on public.profiles for select to anon, authenticated
using (
  profile_visibility = 'public'
  or id = (select auth.uid())
);

drop policy if exists "Users manage their friendship rows" on public.friendships;
drop policy if exists friendships_participant_read on public.friendships;
drop policy if exists friendships_requester_insert on public.friendships;
drop policy if exists friendships_participant_update on public.friendships;
drop policy if exists friendships_participant_delete on public.friendships;

create policy friendships_participant_read
on public.friendships for select to authenticated
using ((select auth.uid()) in (requester_id, addressee_id));

create policy friendships_requester_insert
on public.friendships for insert to authenticated
with check (
  (select auth.uid()) = requester_id
  and requester_id <> addressee_id
);

create policy friendships_participant_update
on public.friendships for update to authenticated
using ((select auth.uid()) in (requester_id, addressee_id))
with check ((select auth.uid()) in (requester_id, addressee_id));

create policy friendships_participant_delete
on public.friendships for delete to authenticated
using ((select auth.uid()) in (requester_id, addressee_id));

drop policy if exists account_data_requests_owner_read on public.account_data_requests;
drop policy if exists account_data_requests_owner_insert on public.account_data_requests;

create policy account_data_requests_owner_read
on public.account_data_requests for select to authenticated
using ((select auth.uid()) = user_id);

create policy account_data_requests_owner_insert
on public.account_data_requests for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and status = 'queued'
);

insert into public.mail_templates (template_key,name,category,subject_template,preheader_template,body_template) values
('account-data-export','Cube Labs data export','privacy','Your Cube Labs data export is ready','Your requested account export is attached or linked.','Your Cube Labs account export has been prepared.'),
('account-closure-request','Cube Labs account closure requested','privacy','Cube Labs account closure requested','We received your export-before-delete request.','Your account closure request was received. We will export eligible data before deleting or de-identifying your account records.')
on conflict (template_key) do update set
  name = excluded.name,
  category = excluded.category,
  subject_template = excluded.subject_template,
  preheader_template = excluded.preheader_template,
  body_template = excluded.body_template,
  updated_at = now();

create index if not exists profiles_social_discovery_idx
  on public.profiles (profile_visibility, favorite_puzzle, country_code, region, created_at desc);

create index if not exists profiles_public_name_search_idx
  on public.profiles (profile_visibility, lower(display_name), lower(username), lower(public_slug));

create index if not exists user_stats_social_match_idx
  on public.user_stats (user_id, total_solves desc, current_streak desc);

create index if not exists solve_results_social_time_idx
  on public.solve_results (puzzle_type, solve_time_ms, user_id)
  where leaderboard_eligible and not is_dnf and solve_time_ms is not null;

create index if not exists scramble_attempts_social_match_idx
  on public.scramble_attempts (scramble_id, user_id, solve_time_ms)
  where leaderboard_eligible and visibility in ('link','public') and solve_time_ms is not null;

create index if not exists account_data_requests_user_idx
  on public.account_data_requests (user_id, created_at desc);

create index if not exists account_data_requests_status_idx
  on public.account_data_requests (status, created_at);
