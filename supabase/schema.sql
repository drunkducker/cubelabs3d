create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.solve_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  puzzle_type text not null,
  scramble text not null,
  solve_time_ms integer,
  move_count integer,
  solved boolean not null default false,
  is_dnf boolean not null default false,
  replay_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.solve_results enable row level security;

create policy "Profiles are readable by signed-in users"
on public.profiles for select
to authenticated
using (true);

create policy "Users can insert their own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users can read their own solves"
on public.solve_results for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own solves"
on public.solve_results for insert
to authenticated
with check ((select auth.uid()) = user_id);

create index if not exists solve_results_user_created_idx
on public.solve_results (user_id, created_at desc);
