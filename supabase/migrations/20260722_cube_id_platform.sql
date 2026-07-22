-- Cube Labs social/player platform foundation.
-- Run this migration in the Supabase SQL editor after the base schema.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists cube_tag text,
  add column if not exists public_slug text,
  add column if not exists bio text,
  add column if not exists title text not null default 'Cube Explorer',
  add column if not exists country_code text,
  add column if not exists region text,
  add column if not exists favorite_puzzle text,
  add column if not exists profile_visibility text not null default 'public',
  add column if not exists show_location boolean not null default false,
  add column if not exists show_collection boolean not null default true,
  add column if not exists show_activity boolean not null default true;

create unique index if not exists profiles_cube_tag_unique_idx
  on public.profiles (lower(cube_tag)) where cube_tag is not null;
create unique index if not exists profiles_public_slug_unique_idx
  on public.profiles (lower(public_slug)) where public_slug is not null;
create index if not exists profiles_display_name_search_idx
  on public.profiles (lower(display_name));

create or replace function public.make_cube_tag(display_value text, user_id uuid)
returns text
language sql
immutable
as $$
  select regexp_replace(coalesce(nullif(trim(display_value), ''), 'Cuber'), '[^A-Za-z0-9_]', '', 'g')
    || '#' || upper(substr(replace(user_id::text, '-', ''), 1, 4));
$$;

create or replace function public.ensure_profile_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.display_name is null or trim(new.display_name) = '' then
    new.display_name := 'Cube Solver';
  end if;
  if new.cube_tag is null or trim(new.cube_tag) = '' then
    new.cube_tag := public.make_cube_tag(new.display_name, new.id);
  end if;
  if new.public_slug is null or trim(new.public_slug) = '' then
    new.public_slug := lower(regexp_replace(new.display_name, '[^A-Za-z0-9]+', '-', 'g'))
      || '-' || lower(substr(replace(new.id::text, '-', ''), 1, 6));
  end if;
  return new;
end;
$$;

drop trigger if exists ensure_profile_identity_trigger on public.profiles;
create trigger ensure_profile_identity_trigger
before insert or update of display_name, cube_tag, public_slug on public.profiles
for each row execute function public.ensure_profile_identity();

update public.profiles
set display_name = coalesce(nullif(trim(display_name), ''), 'Cube Solver')
where display_name is null or trim(display_name) = '';
update public.profiles
set cube_tag = public.make_cube_tag(display_name, id)
where cube_tag is null;
update public.profiles
set public_slug = lower(regexp_replace(display_name, '[^A-Za-z0-9]+', '-', 'g'))
  || '-' || lower(substr(replace(id::text, '-', ''), 1, 6))
where public_slug is null;

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid references auth.users(id) on delete cascade,
  puzzle_type text not null default '3x3',
  scramble text not null,
  sender_solve_id uuid references public.solve_results(id) on delete set null,
  sender_time_ms integer,
  recipient_solve_id uuid references public.solve_results(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','accepted','completed','declined','expired')),
  message text,
  share_token text not null default encode(gen_random_bytes(12), 'hex'),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (share_token)
);

create table if not exists public.achievements (
  id text primary key,
  name text not null,
  description text not null,
  icon text,
  category text not null default 'general',
  points integer not null default 0,
  sort_order integer not null default 0
);

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  progress jsonb,
  primary key (user_id, achievement_id)
);

create table if not exists public.cube_collection (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand text,
  model text not null,
  puzzle_type text not null,
  nickname text,
  image_url text,
  rating smallint check (rating between 1 and 5),
  notes text,
  is_favorite boolean not null default false,
  acquired_at date,
  created_at timestamptz not null default now()
);

create table if not exists public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_solves bigint not null default 0,
  solved_count bigint not null default 0,
  total_moves bigint not null default 0,
  practice_time_ms bigint not null default 0,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_solve_date date,
  best_times jsonb not null default '{}'::jsonb,
  averages jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  visibility text not null default 'friends' check (visibility in ('private','friends','public')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.achievements (id,name,description,icon,category,points,sort_order) values
  ('first-solve','First Solve','Complete your first recorded solve.','sparkles','solving',10,10),
  ('sub-60','Sub-60','Solve a 3x3 in under 60 seconds.','timer','speed',25,20),
  ('sub-30','Sub-30','Solve a 3x3 in under 30 seconds.','zap','speed',50,30),
  ('hundred-solves','Century','Record 100 solves.','trophy','solving',100,40),
  ('collector','Collector','Add five puzzles to your collection.','layers','collection',50,50),
  ('pioneer','Cube Labs Pioneer','Join during the founding era of Cube Labs.','cube','community',100,1)
on conflict (id) do update set name = excluded.name, description = excluded.description;

alter table public.friendships enable row level security;
alter table public.challenges enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.cube_collection enable row level security;
alter table public.user_stats enable row level security;
alter table public.activity_events enable row level security;

create policy "Public profiles are readable"
on public.profiles for select to anon, authenticated
using (profile_visibility = 'public' or id = (select auth.uid()));

create policy "Users manage their friendship rows"
on public.friendships for all to authenticated
using ((select auth.uid()) in (requester_id, addressee_id))
with check ((select auth.uid()) = requester_id or (select auth.uid()) = addressee_id);

create policy "Challenge participants can read"
on public.challenges for select to authenticated
using ((select auth.uid()) in (sender_id, recipient_id));
create policy "Users can create challenges"
on public.challenges for insert to authenticated
with check ((select auth.uid()) = sender_id);
create policy "Challenge participants can update"
on public.challenges for update to authenticated
using ((select auth.uid()) in (sender_id, recipient_id));

create policy "Achievements are public"
on public.achievements for select to anon, authenticated using (true);
create policy "User achievements are readable"
on public.user_achievements for select to anon, authenticated using (true);

create policy "Collections follow profile privacy"
on public.cube_collection for select to anon, authenticated
using (
  user_id = (select auth.uid()) or exists (
    select 1 from public.profiles p
    where p.id = cube_collection.user_id
      and p.profile_visibility = 'public'
      and p.show_collection = true
  )
);
create policy "Users manage their collection"
on public.cube_collection for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Stats are readable"
on public.user_stats for select to anon, authenticated using (true);
create policy "Users insert their stats"
on public.user_stats for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update their stats"
on public.user_stats for update to authenticated using ((select auth.uid()) = user_id);

create policy "Activity follows visibility"
on public.activity_events for select to authenticated
using (user_id = (select auth.uid()) or visibility = 'public');
create policy "Users manage their activity"
on public.activity_events for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create index if not exists friendships_requester_idx on public.friendships (requester_id, status);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);
create index if not exists challenges_recipient_idx on public.challenges (recipient_id, status, created_at desc);
create index if not exists collection_user_idx on public.cube_collection (user_id, created_at desc);
create index if not exists activity_user_idx on public.activity_events (user_id, created_at desc);
