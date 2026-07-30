-- Cube Labs privacy, avatar moderation, age screening, export, and deletion foundation.
-- Additive and idempotent so it can be applied even when older repo migrations
-- were committed but not recorded in the live Supabase migration history.

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

-- ---------------------------------------------------------------------------
-- Profile lifecycle and neutral age-screening state.
-- Store only an age band, never a birth date.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists avatar_path text,
  add column if not exists avatar_status text not null default 'none',
  add column if not exists avatar_updated_at timestamptz,
  add column if not exists age_band text,
  add column if not exists age_screened_at timestamptz,
  add column if not exists guardian_status text not null default 'not_required',
  add column if not exists account_status text not null default 'active',
  add column if not exists privacy_export_requested_at timestamptz,
  add column if not exists account_closure_requested_at timestamptz,
  add column if not exists anonymized_at timestamptz;

alter table public.profiles drop constraint if exists profiles_avatar_status_valid;
alter table public.profiles
  add constraint profiles_avatar_status_valid
  check (avatar_status in ('none','pending','approved','rejected'));

alter table public.profiles drop constraint if exists profiles_age_band_valid;
alter table public.profiles
  add constraint profiles_age_band_valid
  check (age_band is null or age_band in ('under_13','13_17','18_plus'));

alter table public.profiles drop constraint if exists profiles_guardian_status_valid;
alter table public.profiles
  add constraint profiles_guardian_status_valid
  check (guardian_status in ('not_required','pending','verified','declined'));

alter table public.profiles drop constraint if exists profiles_account_status_valid;
alter table public.profiles
  add constraint profiles_account_status_valid
  check (account_status in (
    'active','export_requested','closure_requested','deletion_scheduled',
    'anonymized','closed','deleted','restricted'
  ));

-- ---------------------------------------------------------------------------
-- Minimal privileged admin foundation. These tables remain closed to normal
-- anon/authenticated clients; server-only service-role code is the boundary.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','moderator','editor','support','analyst')),
  is_active boolean not null default true,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  expires_at timestamptz
);

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
  success boolean not null default true,
  failure_category text,
  correlation_id text,
  request_meta jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_security_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  severity text not null default 'info' check (severity in ('info','warning','critical')),
  actor_id uuid references auth.users(id) on delete set null,
  target_id text,
  detail jsonb,
  request_meta jsonb,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id text not null,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text,
  severity text not null default 'normal' check (severity in ('low','normal','high','critical')),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  assigned_to uuid references auth.users(id) on delete set null,
  resolution text,
  audit_id uuid references public.admin_audit_log(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Moderated avatar submissions. Original files stay private until approved.
-- ---------------------------------------------------------------------------
create table if not exists public.avatar_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  storage_path text not null,
  mime_type text not null,
  byte_size integer not null,
  width integer,
  height integer,
  crop jsonb not null default '{}'::jsonb,
  sha256 text,
  status text not null default 'pending',
  moderation_reason text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  published_path text,
  updated_at timestamptz not null default now()
);

alter table public.avatar_submissions drop constraint if exists avatar_submissions_status_valid;
alter table public.avatar_submissions
  add constraint avatar_submissions_status_valid
  check (status in ('pending','approved','rejected','withdrawn','deleted'));

create unique index if not exists avatar_submissions_one_pending_per_user
  on public.avatar_submissions (user_id)
  where status = 'pending' and user_id is not null;
create index if not exists avatar_submissions_status_idx
  on public.avatar_submissions (status, submitted_at);

drop trigger if exists avatar_submissions_set_updated_at on public.avatar_submissions;
create trigger avatar_submissions_set_updated_at
before update on public.avatar_submissions
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Unified privacy case queue. Supports self-service, parents, and authorized
-- agents, with verification, appeal links, deadlines, export delivery, and
-- either destructive deletion or retained-data anonymization.
-- ---------------------------------------------------------------------------
create table if not exists public.account_data_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  request_type text not null,
  status text not null default 'queued',
  requester_type text not null default 'self',
  intake_channel text not null default 'account',
  requested_email text,
  subject_email text,
  subject_user_id uuid references auth.users(id) on delete set null,
  requester_name text,
  requester_email text,
  relationship_to_subject text,
  jurisdiction text,
  verification_status text not null default 'pending',
  verification_token_hash text,
  verification_expires_at timestamptz,
  verified_at timestamptz,
  due_at timestamptz,
  extended_due_at timestamptz,
  deletion_not_before timestamptz,
  assigned_to uuid references auth.users(id) on delete set null,
  appeal_of_request_id uuid references public.account_data_requests(id) on delete set null,
  export_before_delete boolean not null default false,
  delete_mode text not null default 'full_delete',
  payload jsonb not null default '{}'::jsonb,
  export_path text,
  export_sha256 text,
  export_bytes bigint,
  export_expires_at timestamptz,
  delivery_status text not null default 'not_started',
  decision_reason text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  subject_reference_hash text
);

-- Add columns when upgrading the older three-type request queue.
alter table public.account_data_requests
  add column if not exists requester_type text not null default 'self',
  add column if not exists intake_channel text not null default 'account',
  add column if not exists subject_email text,
  add column if not exists subject_user_id uuid references auth.users(id) on delete set null,
  add column if not exists requester_name text,
  add column if not exists requester_email text,
  add column if not exists relationship_to_subject text,
  add column if not exists jurisdiction text,
  add column if not exists verification_status text not null default 'pending',
  add column if not exists verification_token_hash text,
  add column if not exists verification_expires_at timestamptz,
  add column if not exists verified_at timestamptz,
  add column if not exists due_at timestamptz,
  add column if not exists extended_due_at timestamptz,
  add column if not exists deletion_not_before timestamptz,
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists appeal_of_request_id uuid references public.account_data_requests(id) on delete set null,
  add column if not exists delete_mode text not null default 'full_delete',
  add column if not exists export_path text,
  add column if not exists export_sha256 text,
  add column if not exists export_bytes bigint,
  add column if not exists export_expires_at timestamptz,
  add column if not exists delivery_status text not null default 'not_started',
  add column if not exists decision_reason text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists subject_reference_hash text;

alter table public.account_data_requests drop constraint if exists account_data_requests_request_type_check;
alter table public.account_data_requests
  add constraint account_data_requests_request_type_valid
  check (request_type in (
    'export','close_account','delete_data','anonymize','correction',
    'appeal','authorized_agent','parent_request'
  ));

alter table public.account_data_requests drop constraint if exists account_data_requests_status_check;
alter table public.account_data_requests drop constraint if exists account_data_requests_status_valid;
alter table public.account_data_requests
  add constraint account_data_requests_status_valid
  check (status in (
    'queued','awaiting_verification','verified','under_review','approved','denied',
    'processing','ready','completed','failed','cancelled','expired'
  ));

alter table public.account_data_requests drop constraint if exists account_data_requests_requester_type_valid;
alter table public.account_data_requests
  add constraint account_data_requests_requester_type_valid
  check (requester_type in ('self','parent','guardian','authorized_agent'));

alter table public.account_data_requests drop constraint if exists account_data_requests_verification_status_valid;
alter table public.account_data_requests
  add constraint account_data_requests_verification_status_valid
  check (verification_status in ('pending','email_sent','verified','manual_review','failed','expired','waived'));

alter table public.account_data_requests drop constraint if exists account_data_requests_delete_mode_valid;
alter table public.account_data_requests
  add constraint account_data_requests_delete_mode_valid
  check (delete_mode in ('full_delete','anonymize'));

alter table public.account_data_requests drop constraint if exists account_data_requests_delivery_status_valid;
alter table public.account_data_requests
  add constraint account_data_requests_delivery_status_valid
  check (delivery_status in ('not_started','queued','sent','failed','downloaded','not_required'));

create or replace function public.set_privacy_request_defaults()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.subject_user_id is null then
    new.subject_user_id := new.user_id;
  end if;
  if new.requester_email is null then
    new.requester_email := new.requested_email;
  end if;
  if new.due_at is null then
    if upper(coalesce(new.jurisdiction, '')) in ('EU','EEA','UK') then
      new.due_at := now() + interval '30 days';
    else
      new.due_at := now() + interval '45 days';
    end if;
  end if;
  if new.request_type in ('close_account','delete_data','anonymize')
     and new.deletion_not_before is null then
    new.deletion_not_before := now() + interval '7 days';
  end if;
  return new;
end;
$$;

drop trigger if exists account_data_requests_defaults on public.account_data_requests;
create trigger account_data_requests_defaults
before insert on public.account_data_requests
for each row execute function public.set_privacy_request_defaults();

drop trigger if exists account_data_requests_set_updated_at on public.account_data_requests;
create trigger account_data_requests_set_updated_at
before update on public.account_data_requests
for each row execute function public.set_updated_at();

create index if not exists account_data_requests_user_idx
  on public.account_data_requests (user_id, created_at desc);
create index if not exists account_data_requests_subject_idx
  on public.account_data_requests (subject_user_id, created_at desc);
create index if not exists account_data_requests_work_queue_idx
  on public.account_data_requests (status, due_at, created_at);
create index if not exists account_data_requests_verification_hash_idx
  on public.account_data_requests (verification_token_hash)
  where verification_token_hash is not null;

create table if not exists public.privacy_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.account_data_requests(id) on delete cascade,
  event_type text not null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_type text not null default 'system',
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists privacy_request_events_request_idx
  on public.privacy_request_events (request_id, created_at);

create table if not exists public.age_screenings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  age_band text not null check (age_band in ('under_13','13_17','18_plus')),
  outcome text not null check (outcome in ('blocked_parent_path','teen_defaults','standard_account')),
  source text not null default 'signup',
  created_at timestamptz not null default now()
);
create index if not exists age_screenings_user_idx
  on public.age_screenings (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Private storage buckets. Approved avatars are copied into the existing public
-- avatars bucket; review images, evidence, and exports are never public.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values
  ('avatar-review','avatar-review',false,3145728,array['image/jpeg','image/png','image/webp']),
  ('privacy-exports','privacy-exports',false,20971520,array['application/json']),
  ('privacy-evidence','privacy-evidence',false,8388608,array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Tighten public avatar uploads to static image formats. Service-role moderation
-- publishes approved files; ordinary users do not write directly to this bucket.
update storage.buckets
set file_size_limit = 3145728,
    allowed_mime_types = array['image/jpeg','image/png','image/webp']
where id = 'avatars';

-- ---------------------------------------------------------------------------
-- RLS: user-visible ownership reads/inserts only; all worker/admin mutations use
-- the service role after server-side authorization.
-- ---------------------------------------------------------------------------
alter table public.admin_members enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.admin_security_events enable row level security;
alter table public.moderation_reports enable row level security;
alter table public.avatar_submissions enable row level security;
alter table public.account_data_requests enable row level security;
alter table public.privacy_request_events enable row level security;
alter table public.age_screenings enable row level security;

revoke all on public.avatar_submissions from anon, authenticated;
revoke all on public.account_data_requests from anon, authenticated;
revoke all on public.privacy_request_events from anon, authenticated;
revoke all on public.age_screenings from anon, authenticated;
grant select on public.avatar_submissions to authenticated;
grant select, insert on public.account_data_requests to authenticated;
grant select on public.privacy_request_events to authenticated;
grant select on public.age_screenings to authenticated;

drop policy if exists avatar_submissions_owner_read on public.avatar_submissions;
create policy avatar_submissions_owner_read
on public.avatar_submissions for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists account_data_requests_owner_read on public.account_data_requests;
create policy account_data_requests_owner_read
on public.account_data_requests for select to authenticated
using ((select auth.uid()) in (user_id, subject_user_id));

drop policy if exists account_data_requests_owner_insert on public.account_data_requests;
create policy account_data_requests_owner_insert
on public.account_data_requests for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and requester_type = 'self'
  and verification_status in ('verified','waived')
  and status in ('queued','verified')
);

drop policy if exists privacy_request_events_owner_read on public.privacy_request_events;
create policy privacy_request_events_owner_read
on public.privacy_request_events for select to authenticated
using (exists (
  select 1 from public.account_data_requests r
  where r.id = privacy_request_events.request_id
    and (select auth.uid()) in (r.user_id, r.subject_user_id)
));

drop policy if exists age_screenings_owner_read on public.age_screenings;
create policy age_screenings_owner_read
on public.age_screenings for select to authenticated
using ((select auth.uid()) = user_id);

-- No direct client policies for avatar-review, privacy-exports, or evidence.
-- Explicitly remove legacy avatar write policies so moderation cannot be bypassed.
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
drop policy if exists "Users can delete their own avatar" on storage.objects;
drop policy if exists avatars_public_read on storage.objects;
drop policy if exists avatars_owner_insert on storage.objects;
drop policy if exists avatars_owner_update on storage.objects;
drop policy if exists avatars_owner_delete on storage.objects;

create policy avatars_public_read
on storage.objects for select to anon, authenticated
using (bucket_id = 'avatars');

-- Optional mail templates when the mail foundation is present.
do $$
begin
  if to_regclass('public.mail_templates') is not null then
    insert into public.mail_templates
      (template_key,name,category,subject_template,preheader_template,body_template)
    values
      ('privacy-verification','Privacy request verification','privacy','Verify your Cube Labs privacy request','Confirm the request before it enters review.','Use the secure one-time link to verify your privacy request.'),
      ('account-data-export','Cube Labs data export','privacy','Your Cube Labs data export is ready','Your requested export is ready for a limited time.','Your export package is ready. Use the secure expiring link to download it.'),
      ('privacy-decision','Privacy request decision','privacy','Update on your Cube Labs privacy request','We completed our review.','Your privacy request has a new decision. Sign in or use your case reference for details.'),
      ('parent-request','Parent or guardian request','privacy','Verify your Cube Labs parent request','Confirm your email to continue.','Use the secure one-time link to verify your parent or guardian request.')
    on conflict (template_key) do update set
      name = excluded.name,
      category = excluded.category,
      subject_template = excluded.subject_template,
      preheader_template = excluded.preheader_template,
      body_template = excluded.body_template,
      updated_at = now();
  end if;
end $$;
