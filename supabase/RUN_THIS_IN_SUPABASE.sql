-- =========================================================
-- BASELEAD: ALL NEW DATABASE CHANGES IN ONE FILE
-- Supabase → SQL Editor → New query → paste everything → Run.
-- Safe to run more than once.
-- =========================================================

-- =========================================================
-- BASELEAD: REAL BILLING + CALENDAR
-- Run this once in Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Billing columns on company_profiles
-- ---------------------------------------------------------
alter table public.company_profiles
  add column if not exists billing_status text default 'trialing',
  add column if not exists trial_started_at timestamptz default now(),
  add column if not exists trial_ends_at timestamptz default (now() + interval '7 days'),
  add column if not exists trial_lead_limit integer default 100,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists billing_cycle text,
  add column if not exists current_period_end timestamptz,
  add column if not exists cancel_at_period_end boolean default false;

alter table public.company_profiles
  alter column plan set default 'Starter';

-- ---------------------------------------------------------
-- 2. Protect billing columns
--    Users can still edit their company profile, but ONLY the
--    server (service role, after Stripe confirms payment) can
--    change plan, billing status, trial or Stripe fields.
-- ---------------------------------------------------------
create or replace function public.protect_company_billing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.plan := 'Starter';
    new.billing_status := 'trialing';
    new.trial_started_at := now();
    new.trial_ends_at := now() + interval '7 days';
    new.trial_lead_limit := 100;
    new.stripe_customer_id := null;
    new.stripe_subscription_id := null;
    new.billing_cycle := null;
    new.current_period_end := null;
    new.cancel_at_period_end := false;
  else
    new.plan := old.plan;
    new.billing_status := old.billing_status;
    new.trial_started_at := old.trial_started_at;
    new.trial_ends_at := old.trial_ends_at;
    new.trial_lead_limit := old.trial_lead_limit;
    new.stripe_customer_id := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.billing_cycle := old.billing_cycle;
    new.current_period_end := old.current_period_end;
    new.cancel_at_period_end := old.cancel_at_period_end;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_company_billing on public.company_profiles;

create trigger protect_company_billing
  before insert or update on public.company_profiles
  for each row execute function public.protect_company_billing();

-- ---------------------------------------------------------
-- 3. Calendar events
-- ---------------------------------------------------------
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_id uuid references public.company_profiles(id) on delete cascade,
  lead_id uuid,
  lead_name text,
  title text not null,
  type text not null default 'Meeting',
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  notes text,
  status text not null default 'Scheduled',
  attendee text,
  opportunity_value numeric,
  google_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.calendar_events
  add column if not exists lead_name text;

create index if not exists calendar_events_user_start_idx
  on public.calendar_events (user_id, starts_at);

create index if not exists calendar_events_company_start_idx
  on public.calendar_events (company_id, starts_at);

alter table public.calendar_events enable row level security;

drop policy if exists "Users manage their calendar events" on public.calendar_events;

create policy "Users manage their calendar events"
  on public.calendar_events
  for all
  using (
    auth.uid() = user_id
    or company_id in (
      select id from public.company_profiles where user_id = auth.uid()
      union
      select company_id from public.team_members
        where user_id = auth.uid() and status = 'active'
    )
  )
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------
-- 4. API keys (Scale plan). Only a hash of the key is stored.
-- ---------------------------------------------------------
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.company_profiles(id) on delete cascade,
  prefix text not null,
  key_hash text not null unique,
  requests_this_month integer not null default 0,
  usage_month text,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.api_keys enable row level security;

drop policy if exists "Users manage their API keys" on public.api_keys;

create policy "Users manage their API keys"
  on public.api_keys
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------
-- 5. Link older leads to their workspace so they appear in
--    Outreach, Calendar and Reports for the whole team.
-- ---------------------------------------------------------
update public.leads l
set company_id = c.id
from public.company_profiles c
where l.company_id is null
  and c.user_id = l.user_id;

-- ---------------------------------------------------------
-- 6. Outreach: keep the Gmail message id after sending.
-- ---------------------------------------------------------
alter table public.outreach
  add column if not exists gmail_message_id text,
  add column if not exists send_error text;


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
-- =========================================================
-- BASELEAD: PROPOSALS (e-signature + payment) & PAYMENTS
-- Run after 20261019_sales_automation.sql. Safe to re-run.
-- =========================================================

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.company_profiles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  lead_id uuid,
  number text,
  title text not null,
  intro text,
  line_items jsonb not null default '[]'::jsonb,
  currency text not null default 'usd',
  discount numeric not null default 0,
  tax_rate numeric not null default 0,
  subtotal numeric not null default 0,
  total numeric not null default 0,
  terms text,
  valid_until date,
  payment_mode text not null default 'none',      -- none | deposit | full
  deposit_percent numeric not null default 50,
  status text not null default 'draft',           -- draft | sent | viewed | signed | paid | declined
  public_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  client_name text,
  client_email text,
  sent_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  signer_name text,
  signer_email text,
  signature_data text,
  signer_ip text,
  paid_at timestamptz,
  amount_paid numeric,
  stripe_session_id text,
  declined_at timestamptz,
  decline_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proposals_company_idx on public.proposals (company_id, created_at desc);
create index if not exists proposals_lead_idx on public.proposals (lead_id);

alter table public.proposals enable row level security;
drop policy if exists "Workspace manages proposals" on public.proposals;
create policy "Workspace manages proposals" on public.proposals
  for all using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

-- Each workspace's own Stripe key (encrypted by the server) so
-- proposal payments go straight to that business.
create table if not exists public.workspace_secrets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company_profiles(id) on delete cascade,
  provider text not null,
  secret_encrypted text not null,
  label text,
  updated_at timestamptz not null default now(),
  unique (company_id, provider)
);

alter table public.workspace_secrets enable row level security;
-- No policies: only the server (service role) can read or write secrets.

-- Sales goals for the manager dashboard
alter table public.team_members
  add column if not exists monthly_goal numeric;

alter table public.company_profiles
  add column if not exists owner_monthly_goal numeric;


-- =========================================================
-- BASELEAD: DECISION-MAKER CONTACTS
-- =========================================================
create table if not exists public.lead_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.company_profiles(id) on delete cascade,
  lead_id uuid not null,
  full_name text,
  first_name text,
  last_name text,
  title text,
  seniority text,
  department text,
  email text,
  email_confidence integer,
  phone text,
  linkedin_url text,
  source text not null default 'manual',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (lead_id, email)
);

create index if not exists lead_contacts_lead_idx on public.lead_contacts (lead_id);

alter table public.lead_contacts enable row level security;
drop policy if exists "Workspace manages contacts" on public.lead_contacts;
create policy "Workspace manages contacts" on public.lead_contacts
  for all using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));
