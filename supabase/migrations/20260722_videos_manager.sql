-- Cube Labs managed YouTube videos.
-- Managed content rendered by placement, like ads. Run after the admin
-- foundation migration.

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  youtube_id text not null,                 -- 11-char YouTube video id
  description text,
  category text,                            -- e.g. Beginner, CFOP, OLL
  placement text not null default 'learn_featured',
  priority integer not null default 0,
  is_active boolean not null default false,
  is_test boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists videos_placement_active_idx
  on public.videos (placement, is_active, priority desc);

alter table public.videos enable row level security;

drop policy if exists "Admins manage videos" on public.videos;
create policy "Admins manage videos"
on public.videos for all
to authenticated
using (public.is_admin((select auth.uid())))
with check (public.is_admin((select auth.uid())));

drop policy if exists "Public can read live videos" on public.videos;
create policy "Public can read live videos"
on public.videos for select
to anon, authenticated
using (
  is_active
  and not is_test
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
);
