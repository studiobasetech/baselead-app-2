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
