-- Cube Labs tracked scrambles, ranked attempts, and solver-memory foundation.
-- Run after the Cube ID/profile and mail foundation migrations.

create extension if not exists pgcrypto;

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

create table if not exists public.scrambles (
  id uuid primary key default gen_random_uuid(),
  puzzle_type text not null,
  scramble text not null,
  scramble_key text generated always as (md5(scramble)) stored,
  source text not null default 'player' check (source in ('official','player','daily','challenge','solver','admin','import')),
  visibility text not null default 'public' check (visibility in ('private','link','public')),
  created_by uuid references public.profiles(id) on delete set null,
  title text,
  notes text,
  difficulty_label text,
  is_ranked boolean not null default true,
  is_active boolean not null default true,
  play_count bigint not null default 0,
  best_time_ms integer,
  best_move_count integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scrambles_puzzle_type_length check (char_length(puzzle_type) between 2 and 40),
  constraint scrambles_scramble_length check (char_length(scramble) between 1 and 5000),
  constraint scrambles_best_time_nonnegative check (best_time_ms is null or best_time_ms >= 0),
  constraint scrambles_best_moves_nonnegative check (best_move_count is null or best_move_count >= 0),
  unique (puzzle_type, scramble_key)
);

create unique index if not exists scrambles_puzzle_key_unique_idx
  on public.scrambles (puzzle_type, scramble_key);

alter table public.solve_results
  add column if not exists scramble_id uuid references public.scrambles(id) on delete set null,
  add column if not exists source text not null default 'play',
  add column if not exists leaderboard_eligible boolean not null default false,
  add column if not exists is_test_data boolean not null default false,
  add column if not exists manual_time_override boolean not null default false,
  add column if not exists manual_tracking_override boolean not null default false,
  add column if not exists actual_time_ms integer,
  add column if not exists actual_move_count integer,
  add column if not exists actual_undo_count integer,
  add column if not exists actual_touch_moves integer,
  add column if not exists actual_button_moves integer,
  add column if not exists reported_undo_count integer,
  add column if not exists reported_touch_moves integer,
  add column if not exists reported_button_moves integer,
  add column if not exists assistance_flags jsonb not null default '{}'::jsonb;

alter table public.challenges
  add column if not exists creator_id uuid references public.profiles(id) on delete cascade,
  add column if not exists sender_id uuid references auth.users(id) on delete cascade,
  add column if not exists scramble_id uuid references public.scrambles(id) on delete set null,
  add column if not exists share_code text not null default encode(gen_random_bytes(12), 'hex'),
  add column if not exists creator_solve_id uuid references public.solve_results(id) on delete set null,
  add column if not exists creator_solved boolean not null default false,
  add column if not exists creator_time_ms integer,
  add column if not exists creator_move_count integer,
  add column if not exists visibility text not null default 'link';

alter table public.challenge_attempts
  add column if not exists solve_result_id uuid references public.solve_results(id) on delete set null,
  add column if not exists scramble_id uuid references public.scrambles(id) on delete set null,
  add column if not exists source text not null default 'challenge',
  add column if not exists leaderboard_eligible boolean not null default false,
  add column if not exists is_test_data boolean not null default false,
  add column if not exists manual_time_override boolean not null default false,
  add column if not exists manual_tracking_override boolean not null default false,
  add column if not exists actual_time_ms integer,
  add column if not exists actual_move_count integer,
  add column if not exists actual_undo_count integer,
  add column if not exists actual_touch_moves integer,
  add column if not exists actual_button_moves integer,
  add column if not exists reported_undo_count integer,
  add column if not exists reported_touch_moves integer,
  add column if not exists reported_button_moves integer,
  add column if not exists assistance_flags jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'solve_results_source_valid' and conrelid = 'public.solve_results'::regclass) then
    alter table public.solve_results add constraint solve_results_source_valid check (source in ('play','leaderboard','challenge','solver','admin','import'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'solve_results_tracking_nonnegative' and conrelid = 'public.solve_results'::regclass) then
    alter table public.solve_results add constraint solve_results_tracking_nonnegative check (
      (actual_time_ms is null or actual_time_ms >= 0) and
      (actual_move_count is null or actual_move_count >= 0) and
      (actual_undo_count is null or actual_undo_count >= 0) and
      (actual_touch_moves is null or actual_touch_moves >= 0) and
      (actual_button_moves is null or actual_button_moves >= 0) and
      (reported_undo_count is null or reported_undo_count >= 0) and
      (reported_touch_moves is null or reported_touch_moves >= 0) and
      (reported_button_moves is null or reported_button_moves >= 0)
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'challenge_attempts_source_valid' and conrelid = 'public.challenge_attempts'::regclass) then
    alter table public.challenge_attempts add constraint challenge_attempts_source_valid check (source in ('challenge','leaderboard','admin','import'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'challenge_attempts_tracking_nonnegative' and conrelid = 'public.challenge_attempts'::regclass) then
    alter table public.challenge_attempts add constraint challenge_attempts_tracking_nonnegative check (
      (actual_time_ms is null or actual_time_ms >= 0) and
      (actual_move_count is null or actual_move_count >= 0) and
      (actual_undo_count is null or actual_undo_count >= 0) and
      (actual_touch_moves is null or actual_touch_moves >= 0) and
      (actual_button_moves is null or actual_button_moves >= 0) and
      (reported_undo_count is null or reported_undo_count >= 0) and
      (reported_touch_moves is null or reported_touch_moves >= 0) and
      (reported_button_moves is null or reported_button_moves >= 0)
    );
  end if;
end $$;

alter table public.challenges drop constraint if exists challenges_status_check;
alter table public.challenges drop constraint if exists challenges_status_valid;
alter table public.challenges add constraint challenges_status_valid check (status in ('open','pending','accepted','completed','declined','cancelled','expired'));

alter table public.challenges drop constraint if exists challenges_visibility_valid;
alter table public.challenges add constraint challenges_visibility_valid check (visibility in ('private','friends','link','public'));

create table if not exists public.scramble_attempts (
  id uuid primary key default gen_random_uuid(),
  scramble_id uuid not null references public.scrambles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  solve_result_id uuid references public.solve_results(id) on delete set null,
  challenge_id uuid references public.challenges(id) on delete set null,
  challenge_attempt_id uuid references public.challenge_attempts(id) on delete set null,
  source text not null default 'play' check (source in ('play','leaderboard','challenge','solver','admin','import')),
  visibility text not null default 'public' check (visibility in ('private','link','public')),
  solve_time_ms integer,
  move_count integer,
  solved boolean not null default false,
  is_dnf boolean not null default false,
  leaderboard_eligible boolean not null default false,
  is_test_data boolean not null default false,
  manual_time_override boolean not null default false,
  manual_tracking_override boolean not null default false,
  actual_time_ms integer,
  actual_move_count integer,
  actual_undo_count integer,
  actual_touch_moves integer,
  actual_button_moves integer,
  reported_undo_count integer,
  reported_touch_moves integer,
  reported_button_moves integer,
  assistance_flags jsonb not null default '{}'::jsonb,
  replay_data jsonb,
  created_at timestamptz not null default now(),
  constraint scramble_attempts_solved_dnf_consistency check (not (solved and is_dnf)),
  constraint scramble_attempts_time_nonnegative check (solve_time_ms is null or solve_time_ms >= 0),
  constraint scramble_attempts_move_count_nonnegative check (move_count is null or move_count >= 0),
  constraint scramble_attempts_tracking_nonnegative check (
    (actual_time_ms is null or actual_time_ms >= 0) and
    (actual_move_count is null or actual_move_count >= 0) and
    (actual_undo_count is null or actual_undo_count >= 0) and
    (actual_touch_moves is null or actual_touch_moves >= 0) and
    (actual_button_moves is null or actual_button_moves >= 0) and
    (reported_undo_count is null or reported_undo_count >= 0) and
    (reported_touch_moves is null or reported_touch_moves >= 0) and
    (reported_button_moves is null or reported_button_moves >= 0)
  ),
  unique (solve_result_id),
  unique (challenge_attempt_id)
);

create table if not exists public.solver_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  puzzle_type text not null,
  title text,
  scramble_id uuid references public.scrambles(id) on delete set null,
  scramble text,
  cube_state jsonb not null,
  solution_steps jsonb not null default '[]'::jsonb,
  solution_summary text,
  solver_name text,
  move_count integer,
  solve_time_ms integer,
  source text not null default 'solver' check (source in ('solver','manual','camera','challenge','play','import')),
  memory_tier text not null default 'signed_in' check (memory_tier in ('signed_in','paid')),
  is_favorite boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint solver_memories_puzzle_type_length check (char_length(puzzle_type) between 2 and 40),
  constraint solver_memories_time_nonnegative check (solve_time_ms is null or solve_time_ms >= 0),
  constraint solver_memories_move_count_nonnegative check (move_count is null or move_count >= 0)
);

update public.challenges set sender_id = coalesce(sender_id, creator_id) where sender_id is null and creator_id is not null;
update public.challenges set creator_id = coalesce(creator_id, sender_id) where creator_id is null and sender_id is not null;

insert into public.scrambles (puzzle_type, scramble, created_by, source, visibility, metadata)
select distinct on (puzzle_type, scramble)
  puzzle_type,
  scramble,
  user_id,
  'import',
  'public',
  jsonb_build_object('backfilled_from','solve_results')
from public.solve_results
where scramble is not null and trim(scramble) <> ''
order by puzzle_type, scramble, created_at
on conflict (puzzle_type, scramble_key) do nothing;

insert into public.scrambles (puzzle_type, scramble, created_by, source, visibility, metadata)
select distinct on (puzzle_type, scramble)
  puzzle_type,
  scramble,
  coalesce(creator_id, sender_id),
  'challenge',
  coalesce(nullif(visibility, ''), 'link'),
  jsonb_build_object('backfilled_from','challenges')
from public.challenges
where scramble is not null and trim(scramble) <> ''
order by puzzle_type, scramble, created_at
on conflict (puzzle_type, scramble_key) do nothing;

update public.solve_results sr
set scramble_id = s.id,
    source = coalesce(sr.replay_data->>'source', sr.source, 'play'),
    is_test_data = coalesce((sr.replay_data->>'is_test_data')::boolean, sr.is_test_data, false),
    manual_time_override = coalesce((sr.replay_data->>'manual_time_override')::boolean, sr.manual_time_override, false),
    manual_tracking_override = coalesce((sr.replay_data->>'manual_tracking_override')::boolean, sr.manual_tracking_override, false),
    actual_move_count = coalesce((sr.replay_data #>> '{actual_metrics,move_count}')::integer, sr.actual_move_count),
    actual_undo_count = coalesce((sr.replay_data #>> '{actual_metrics,undo_uses}')::integer, sr.actual_undo_count),
    actual_touch_moves = coalesce((sr.replay_data #>> '{actual_metrics,touch_moves}')::integer, sr.actual_touch_moves),
    actual_button_moves = coalesce((sr.replay_data #>> '{actual_metrics,button_moves}')::integer, sr.actual_button_moves),
    reported_undo_count = coalesce((sr.replay_data #>> '{reported_metrics,undo_uses}')::integer, sr.reported_undo_count),
    reported_touch_moves = coalesce((sr.replay_data #>> '{reported_metrics,touch_moves}')::integer, sr.reported_touch_moves),
    reported_button_moves = coalesce((sr.replay_data #>> '{reported_metrics,button_moves}')::integer, sr.reported_button_moves),
    assistance_flags = coalesce(sr.replay_data->'assistance_flags', sr.assistance_flags, '{}'::jsonb)
from public.scrambles s
where sr.scramble_id is null
  and s.puzzle_type = sr.puzzle_type
  and s.scramble = sr.scramble;

update public.solve_results
set leaderboard_eligible = solved and not is_dnf and not is_test_data and not manual_time_override and not manual_tracking_override;

update public.challenges c
set scramble_id = s.id
from public.scrambles s
where c.scramble_id is null
  and s.puzzle_type = c.puzzle_type
  and s.scramble = c.scramble;

update public.challenge_attempts ca
set scramble_id = c.scramble_id,
    source = 'challenge',
    is_test_data = coalesce((ca.replay_data->>'is_test_data')::boolean, ca.is_test_data, false),
    manual_time_override = coalesce((ca.replay_data->>'manual_time_override')::boolean, ca.manual_time_override, false),
    manual_tracking_override = coalesce((ca.replay_data->>'manual_tracking_override')::boolean, ca.manual_tracking_override, false),
    actual_move_count = coalesce((ca.replay_data #>> '{actual_metrics,move_count}')::integer, ca.actual_move_count),
    actual_undo_count = coalesce((ca.replay_data #>> '{actual_metrics,undo_uses}')::integer, ca.actual_undo_count),
    actual_touch_moves = coalesce((ca.replay_data #>> '{actual_metrics,touch_moves}')::integer, ca.actual_touch_moves),
    actual_button_moves = coalesce((ca.replay_data #>> '{actual_metrics,button_moves}')::integer, ca.actual_button_moves),
    reported_undo_count = coalesce((ca.replay_data #>> '{reported_metrics,undo_uses}')::integer, ca.reported_undo_count),
    reported_touch_moves = coalesce((ca.replay_data #>> '{reported_metrics,touch_moves}')::integer, ca.reported_touch_moves),
    reported_button_moves = coalesce((ca.replay_data #>> '{reported_metrics,button_moves}')::integer, ca.reported_button_moves),
    assistance_flags = coalesce(ca.replay_data->'assistance_flags', ca.assistance_flags, '{}'::jsonb)
from public.challenges c
where ca.challenge_id = c.id
  and ca.scramble_id is null;

update public.challenge_attempts
set leaderboard_eligible = solved and not is_dnf and not is_test_data and not manual_time_override and not manual_tracking_override;

insert into public.scramble_attempts (
  scramble_id, user_id, solve_result_id, challenge_id, source, visibility,
  solve_time_ms, move_count, solved, is_dnf, leaderboard_eligible,
  is_test_data, manual_time_override, manual_tracking_override,
  actual_time_ms, actual_move_count, actual_undo_count, actual_touch_moves, actual_button_moves,
  reported_undo_count, reported_touch_moves, reported_button_moves, assistance_flags, replay_data, created_at
)
select
  sr.scramble_id, sr.user_id, sr.id, null,
  case when sr.source in ('challenge','leaderboard','solver','admin','import') then sr.source else 'play' end,
  'public',
  sr.solve_time_ms, sr.move_count, sr.solved, sr.is_dnf, sr.leaderboard_eligible,
  sr.is_test_data, sr.manual_time_override, sr.manual_tracking_override,
  sr.actual_time_ms, sr.actual_move_count, sr.actual_undo_count, sr.actual_touch_moves, sr.actual_button_moves,
  sr.reported_undo_count, sr.reported_touch_moves, sr.reported_button_moves, sr.assistance_flags, sr.replay_data, sr.created_at
from public.solve_results sr
where sr.scramble_id is not null
on conflict (solve_result_id) do nothing;

insert into public.scramble_attempts (
  scramble_id, user_id, solve_result_id, challenge_id, challenge_attempt_id, source, visibility,
  solve_time_ms, move_count, solved, is_dnf, leaderboard_eligible,
  is_test_data, manual_time_override, manual_tracking_override,
  actual_time_ms, actual_move_count, actual_undo_count, actual_touch_moves, actual_button_moves,
  reported_undo_count, reported_touch_moves, reported_button_moves, assistance_flags, replay_data, created_at
)
select
  ca.scramble_id, ca.user_id, ca.solve_result_id, ca.challenge_id, ca.id, 'challenge', 'public',
  ca.solve_time_ms, ca.move_count, ca.solved, ca.is_dnf, ca.leaderboard_eligible,
  ca.is_test_data, ca.manual_time_override, ca.manual_tracking_override,
  ca.actual_time_ms, ca.actual_move_count, ca.actual_undo_count, ca.actual_touch_moves, ca.actual_button_moves,
  ca.reported_undo_count, ca.reported_touch_moves, ca.reported_button_moves, ca.assistance_flags, ca.replay_data, ca.created_at
from public.challenge_attempts ca
where ca.scramble_id is not null
  and (ca.solve_result_id is null or not exists (
    select 1 from public.scramble_attempts existing where existing.solve_result_id = ca.solve_result_id
  ))
on conflict (challenge_attempt_id) do nothing;

create index if not exists scrambles_ranked_lookup_idx on public.scrambles (puzzle_type, is_ranked, is_active, created_at desc);
create index if not exists scrambles_creator_idx on public.scrambles (created_by, created_at desc);
create index if not exists solve_results_scramble_rank_idx on public.solve_results (scramble_id, solve_time_ms, move_count) where leaderboard_eligible;
create index if not exists solve_results_user_scramble_idx on public.solve_results (user_id, scramble_id, created_at desc);
create index if not exists challenges_creator_idx on public.challenges (creator_id, status, created_at desc);
create index if not exists challenges_sender_idx on public.challenges (sender_id, status, created_at desc);
create index if not exists challenges_scramble_idx on public.challenges (scramble_id, created_at desc);
create index if not exists challenges_creator_solve_idx on public.challenges (creator_solve_id);
create index if not exists challenges_recipient_solve_idx on public.challenges (recipient_solve_id);
create index if not exists challenge_attempts_scramble_rank_idx on public.challenge_attempts (scramble_id, solve_time_ms, move_count) where leaderboard_eligible;
create index if not exists challenge_attempts_solve_result_idx on public.challenge_attempts (solve_result_id);
create index if not exists scramble_attempts_rank_idx on public.scramble_attempts (scramble_id, solve_time_ms, move_count, created_at) where leaderboard_eligible;
create index if not exists scramble_attempts_user_idx on public.scramble_attempts (user_id, created_at desc);
create index if not exists scramble_attempts_challenge_idx on public.scramble_attempts (challenge_id, created_at desc);
create index if not exists solver_memories_user_idx on public.solver_memories (user_id, created_at desc);
create index if not exists solver_memories_puzzle_idx on public.solver_memories (user_id, puzzle_type, created_at desc);
create index if not exists solver_memories_scramble_idx on public.solver_memories (scramble_id);

create or replace function public.protect_challenge_core_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.creator_id is distinct from old.creator_id
    or new.sender_id is distinct from old.sender_id
    or new.recipient_id is distinct from old.recipient_id
    or new.scramble is distinct from old.scramble
    or new.scramble_id is distinct from old.scramble_id
    or new.share_code is distinct from old.share_code
    or new.visibility is distinct from old.visibility then
    raise exception 'Challenge identity fields cannot be changed after creation.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_challenge_core_fields_trigger on public.challenges;
create trigger protect_challenge_core_fields_trigger
before update on public.challenges
for each row execute function public.protect_challenge_core_fields();

drop trigger if exists scrambles_set_updated_at on public.scrambles;
create trigger scrambles_set_updated_at
before update on public.scrambles
for each row execute function public.set_updated_at();

drop trigger if exists solver_memories_set_updated_at on public.solver_memories;
create trigger solver_memories_set_updated_at
before update on public.solver_memories
for each row execute function public.set_updated_at();

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.refresh_scramble_stats(target_scramble_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.scrambles s
  set play_count = coalesce(stats.play_count, 0),
      best_time_ms = stats.best_time_ms,
      best_move_count = stats.best_move_count,
      updated_at = now()
  from (
    select
      target_scramble_id as scramble_id,
      count(*) filter (where leaderboard_eligible) as play_count,
      min(solve_time_ms) filter (where leaderboard_eligible and solve_time_ms is not null) as best_time_ms,
      min(move_count) filter (where leaderboard_eligible and move_count is not null) as best_move_count
    from public.scramble_attempts
    where scramble_id = target_scramble_id
  ) stats
  where s.id = stats.scramble_id;
end;
$$;

create or replace function private.refresh_scramble_stats_after_attempt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('INSERT','UPDATE') and new.scramble_id is not null then
    perform private.refresh_scramble_stats(new.scramble_id);
  end if;

  if tg_op in ('UPDATE','DELETE') and old.scramble_id is not null and (tg_op = 'DELETE' or old.scramble_id is distinct from new.scramble_id) then
    perform private.refresh_scramble_stats(old.scramble_id);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke execute on function private.refresh_scramble_stats(uuid) from public, anon, authenticated;
revoke execute on function private.refresh_scramble_stats_after_attempt() from public, anon, authenticated;

drop trigger if exists scramble_attempts_refresh_stats_trigger on public.scramble_attempts;
create trigger scramble_attempts_refresh_stats_trigger
after insert or update or delete on public.scramble_attempts
for each row execute function private.refresh_scramble_stats_after_attempt();

do $$
begin
  if exists (select 1 from pg_proc where oid = 'public.make_cube_tag(text, uuid)'::regprocedure) then
    alter function public.make_cube_tag(text, uuid) set search_path = public;
  end if;

  if exists (select 1 from pg_proc where oid = 'public.ensure_profile_identity()'::regprocedure) then
    revoke execute on function public.ensure_profile_identity() from public, anon, authenticated;
  end if;
end $$;

alter table public.scrambles enable row level security;
alter table public.scramble_attempts enable row level security;
alter table public.solver_memories enable row level security;

revoke all on public.scrambles from anon, authenticated;
revoke all on public.scramble_attempts from anon, authenticated;
revoke all on public.solver_memories from anon, authenticated;

grant select on public.scrambles to anon, authenticated;
grant insert, update, delete on public.scrambles to authenticated;
grant select on public.scramble_attempts to anon, authenticated;
grant insert, update, delete on public.scramble_attempts to authenticated;
grant select, insert, update, delete on public.solver_memories to authenticated;
grant select on public.solve_results to anon, authenticated;
grant insert, update, delete on public.solve_results to authenticated;
grant select, insert, update, delete on public.challenge_attempts to authenticated;
grant select, insert, update on public.challenges to authenticated;
grant select on public.challenges to anon;

drop policy if exists scrambles_public_read on public.scrambles;
create policy scrambles_public_read
on public.scrambles for select to anon, authenticated
using (is_active);

drop policy if exists scrambles_owner_insert on public.scrambles;
create policy scrambles_owner_insert
on public.scrambles for insert to authenticated
with check (created_by = (select auth.uid()));

drop policy if exists scrambles_owner_update on public.scrambles;
create policy scrambles_owner_update
on public.scrambles for update to authenticated
using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()));

drop policy if exists scrambles_owner_delete on public.scrambles;
create policy scrambles_owner_delete
on public.scrambles for delete to authenticated
using (created_by = (select auth.uid()));

drop policy if exists solve_results_owner_read on public.solve_results;
drop policy if exists solve_results_public_leaderboard_read on public.solve_results;
drop policy if exists solve_results_authenticated_read on public.solve_results;
create policy solve_results_authenticated_read
on public.solve_results for select to authenticated
using ((select auth.uid()) = user_id or leaderboard_eligible);
create policy solve_results_public_leaderboard_read
on public.solve_results for select to anon
using (leaderboard_eligible);

drop policy if exists challenge_attempts_visible_read on public.challenge_attempts;
drop policy if exists challenge_attempts_public_rank_read on public.challenge_attempts;
drop policy if exists challenge_attempts_authenticated_read on public.challenge_attempts;
create policy challenge_attempts_authenticated_read
on public.challenge_attempts for select to authenticated
using (
  user_id = (select auth.uid())
  or leaderboard_eligible
  or exists (
    select 1 from public.challenges c
    where c.id = challenge_attempts.challenge_id
      and (select auth.uid()) in (c.creator_id, c.sender_id, c.recipient_id)
  )
);
create policy challenge_attempts_public_rank_read
on public.challenge_attempts for select to anon
using (leaderboard_eligible);

drop policy if exists challenges_owner_update on public.challenges;
drop policy if exists "Challenge participants can update" on public.challenges;
drop policy if exists challenges_participant_update on public.challenges;
create policy challenges_participant_update
on public.challenges for update to authenticated
using ((select auth.uid()) in (creator_id, sender_id, recipient_id))
with check ((select auth.uid()) in (creator_id, sender_id, recipient_id));

drop policy if exists scramble_attempts_public_rank_read on public.scramble_attempts;
drop policy if exists scramble_attempts_owner_read on public.scramble_attempts;
drop policy if exists scramble_attempts_challenge_participant_read on public.scramble_attempts;
drop policy if exists scramble_attempts_authenticated_read on public.scramble_attempts;
create policy scramble_attempts_authenticated_read
on public.scramble_attempts for select to authenticated
using (
  user_id = (select auth.uid())
  or (leaderboard_eligible and visibility in ('link','public'))
  or exists (
    select 1 from public.challenges c
    where c.id = scramble_attempts.challenge_id
      and (select auth.uid()) in (c.creator_id, c.sender_id, c.recipient_id)
  )
);
create policy scramble_attempts_public_rank_read
on public.scramble_attempts for select to anon
using (leaderboard_eligible and visibility in ('link','public'));

drop policy if exists scramble_attempts_owner_insert on public.scramble_attempts;
create policy scramble_attempts_owner_insert
on public.scramble_attempts for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists scramble_attempts_owner_update on public.scramble_attempts;
create policy scramble_attempts_owner_update
on public.scramble_attempts for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists scramble_attempts_owner_delete on public.scramble_attempts;
create policy scramble_attempts_owner_delete
on public.scramble_attempts for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists solver_memories_owner_read on public.solver_memories;
create policy solver_memories_owner_read
on public.solver_memories for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists solver_memories_owner_insert on public.solver_memories;
create policy solver_memories_owner_insert
on public.solver_memories for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists solver_memories_owner_update on public.solver_memories;
create policy solver_memories_owner_update
on public.solver_memories for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists solver_memories_owner_delete on public.solver_memories;
create policy solver_memories_owner_delete
on public.solver_memories for delete to authenticated
using (user_id = (select auth.uid()));
