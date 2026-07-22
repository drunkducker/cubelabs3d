-- Cube Labs Mail foundation: preferences, branded templates, message logs, and delivery events.
create extension if not exists pgcrypto;

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_account boolean not null default true,
  email_security boolean not null default true,
  email_friend_requests boolean not null default true,
  email_challenges boolean not null default true,
  email_achievements boolean not null default true,
  email_product_updates boolean not null default false,
  email_marketing boolean not null default false,
  push_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.mail_templates (
  template_key text primary key,
  name text not null,
  category text not null,
  subject_template text not null,
  preheader_template text,
  body_template text not null,
  enabled boolean not null default true,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mail_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  recipient_email text not null,
  template_key text references public.mail_templates(template_key) on delete set null,
  category text not null,
  subject text not null,
  provider text not null default 'cube-labs-mail',
  provider_message_id text,
  status text not null default 'queued' check (status in ('queued','sending','sent','delivered','failed','bounced','complained','suppressed')),
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  queued_at timestamptz not null default now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.mail_events (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.mail_messages(id) on delete cascade,
  event_type text not null,
  provider text,
  provider_event_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.mail_templates (template_key,name,category,subject_template,preheader_template,body_template) values
('account-confirmation','Confirm your Cube ID','account','Confirm your Cube Labs account','One click and your Cube ID is ready.','Welcome {{display_name}}. Confirm your email to activate your Cube ID.'),
('password-reset','Reset your Cube Labs password','security','Reset your Cube Labs password','Use this secure link to choose a new password.','A password reset was requested for {{display_name}}. Use the secure link to continue.'),
('welcome','Welcome to Cube Labs','account','Welcome to Cube Labs, {{display_name}}','Your Cube ID is active.','Your Cube ID is ready. Start solving, collecting, and challenging friends.'),
('friend-request','New Cube Labs friend request','social','{{sender_name}} sent you a friend request','A new player wants to connect.','{{sender_name}} wants to add you on Cube Labs.'),
('challenge','New Cube Labs challenge','competition','{{sender_name}} challenged you','Can you beat this scramble?','{{sender_name}} challenged you to a {{puzzle_type}} solve.'),
('achievement','Achievement unlocked','achievement','You unlocked {{achievement_name}}','A new badge was added to your Cube ID.','Congratulations {{display_name}}. You unlocked {{achievement_name}}.')
on conflict (template_key) do update set name=excluded.name, category=excluded.category, subject_template=excluded.subject_template, preheader_template=excluded.preheader_template, body_template=excluded.body_template, updated_at=now();

alter table public.notification_preferences enable row level security;
alter table public.mail_templates enable row level security;
alter table public.mail_messages enable row level security;
alter table public.mail_events enable row level security;

create policy "Users read their notification preferences" on public.notification_preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users insert their notification preferences" on public.notification_preferences for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update their notification preferences" on public.notification_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Enabled templates are readable" on public.mail_templates for select to authenticated using (enabled = true);
create policy "Users read their mail messages" on public.mail_messages for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users read their mail events" on public.mail_events for select to authenticated using (exists (select 1 from public.mail_messages m where m.id = mail_events.message_id and m.user_id = (select auth.uid())));

create index if not exists mail_messages_user_created_idx on public.mail_messages (user_id, queued_at desc);
create index if not exists mail_messages_status_idx on public.mail_messages (status, queued_at);
create index if not exists mail_events_message_created_idx on public.mail_events (message_id, created_at desc);
