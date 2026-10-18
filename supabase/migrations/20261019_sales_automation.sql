-- =========================================================
-- BASELEAD: SALES AUTOMATION
-- (activity timeline, sequences, tasks, booking pages,
--  lead assignment, automatic pipeline)
-- Run AFTER 20261018_billing_calendar.sql.
-- Supabase → SQL Editor → New query → paste → Run. Safe to re-run.
-- =========================================================

-- Helper: is the current user part of this workspace?
create or replace function public.is_company_member(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.company_profiles c
    where c.id = target and c.user_id = auth.uid()
  ) or exists (
    select 1 from public.team_members m
    where m.company_id = target and m.user_id = auth.uid() and m.status = 'active'
  );
$$;

-- ---------------------------------------------------------
-- Leads: owner, deal value, follow-up dates
-- ---------------------------------------------------------
alter table public.leads
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists deal_value numeric,
  add column if not exists expected_close_date date,
  add column if not exists last_activity_at timestamptz,
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists lost_reason text,
  add column if not exists contact_name text,
  add column if not exists contact_title text,
  add column if not exists linkedin_contact_url text;

update public.leads set assigned_to = user_id where assigned_to is null;

create index if not exists leads_assigned_idx on public.leads (assigned_to);
create index if not exists leads_company_status_idx on public.leads (company_id, status);

-- ---------------------------------------------------------
-- Outreach: thread tracking for reply detection
-- ---------------------------------------------------------
alter table public.outreach
  add column if not exists gmail_thread_id text,
  add column if not exists enrollment_id uuid,
  add column if not exists step_order integer,
  add column if not exists company_id uuid;

-- ---------------------------------------------------------
-- Activity timeline
-- ---------------------------------------------------------
create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.company_profiles(id) on delete cascade,
  lead_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  type text not null,
  title text not null,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lead_activities_lead_idx on public.lead_activities (lead_id, created_at desc);
alter table public.lead_activities enable row level security;
drop policy if exists "Workspace reads activities" on public.lead_activities;
create policy "Workspace reads activities" on public.lead_activities
  for all using (public.is_company_member(company_id) or user_id = auth.uid())
  with check (public.is_company_member(company_id) or user_id = auth.uid());

-- ---------------------------------------------------------
-- Tasks (the rep's "Today" list)
-- ---------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.company_profiles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  lead_id uuid,
  title text not null,
  type text not null default 'todo',
  notes text,
  due_at timestamptz,
  completed_at timestamptz,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

create index if not exists tasks_user_due_idx on public.tasks (user_id, completed_at, due_at);
alter table public.tasks enable row level security;
drop policy if exists "Workspace manages tasks" on public.tasks;
create policy "Workspace manages tasks" on public.tasks
  for all using (public.is_company_member(company_id) or user_id = auth.uid())
  with check (public.is_company_member(company_id) or user_id = auth.uid());

-- ---------------------------------------------------------
-- Sequences (multi-step follow-ups)
-- ---------------------------------------------------------
create table if not exists public.sequences (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.company_profiles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.sequence_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.sequences(id) on delete cascade,
  step_order integer not null,
  delay_days integer not null default 0,
  type text not null default 'email',
  subject text,
  body text,
  created_at timestamptz not null default now(),
  unique (sequence_id, step_order)
);

create table if not exists public.sequence_enrollments (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.sequences(id) on delete cascade,
  company_id uuid references public.company_profiles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  lead_id uuid not null,
  status text not null default 'active',
  current_step integer not null default 0,
  next_run_at timestamptz default now(),
  gmail_thread_id text,
  last_error text,
  created_at timestamptz not null default now(),
  unique (sequence_id, lead_id)
);

create index if not exists enrollments_due_idx on public.sequence_enrollments (status, next_run_at);

alter table public.sequences enable row level security;
alter table public.sequence_steps enable row level security;
alter table public.sequence_enrollments enable row level security;

drop policy if exists "Workspace manages sequences" on public.sequences;
create policy "Workspace manages sequences" on public.sequences
  for all using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

drop policy if exists "Workspace manages steps" on public.sequence_steps;
create policy "Workspace manages steps" on public.sequence_steps
  for all using (exists (select 1 from public.sequences s where s.id = sequence_id and public.is_company_member(s.company_id)))
  with check (exists (select 1 from public.sequences s where s.id = sequence_id and public.is_company_member(s.company_id)));

drop policy if exists "Workspace manages enrollments" on public.sequence_enrollments;
create policy "Workspace manages enrollments" on public.sequence_enrollments
  for all using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

-- ---------------------------------------------------------
-- Booking pages (public "book a call" links)
-- ---------------------------------------------------------
create table if not exists public.booking_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  company_id uuid references public.company_profiles(id) on delete cascade,
  slug text not null unique,
  title text not null default 'Intro call',
  description text,
  duration_minutes integer not null default 30,
  buffer_minutes integer not null default 10,
  min_notice_hours integer not null default 12,
  days_ahead integer not null default 21,
  timezone text not null default 'America/Chicago',
  availability jsonb not null default '{"1":[["09:00","17:00"]],"2":[["09:00","17:00"]],"3":[["09:00","17:00"]],"4":[["09:00","17:00"]],"5":[["09:00","17:00"]]}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.booking_pages enable row level security;
drop policy if exists "Owner manages booking page" on public.booking_pages;
create policy "Owner manages booking page" on public.booking_pages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.calendar_events
  add column if not exists booked_by_email text,
  add column if not exists meet_url text;

-- Team members can see and work the workspace's leads.
drop policy if exists "Workspace members access leads" on public.leads;
create policy "Workspace members access leads" on public.leads
  for all using (company_id is not null and public.is_company_member(company_id))
  with check (company_id is not null and public.is_company_member(company_id));

-- ---------------------------------------------------------
-- Discount codes: remember which code activated the plan.
-- (Protected like the other billing columns.)
-- ---------------------------------------------------------
alter table public.company_profiles
  add column if not exists promo_code text;
