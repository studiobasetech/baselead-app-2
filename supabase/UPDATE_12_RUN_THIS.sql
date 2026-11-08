-- =========================================================
-- BASELEAD UPDATE 12 — Built-in calling (Pro and Scale)
-- Own US number per rep, calls to USA + Canada, automatic
-- recording, call log in the CRM and manager review.
-- Supabase → SQL Editor → New query → paste → Run. Safe to re-run.
-- =========================================================

-- 1) Phone numbers (one per rep). The number belongs to the company.
create table if not exists public.phone_numbers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company_profiles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  phone_number text not null,
  telnyx_number_id text,
  status text not null default 'active',           -- active | released
  created_at timestamptz not null default now(),
  released_at timestamptz
);
create unique index if not exists phone_numbers_number_active_idx
  on public.phone_numbers (phone_number) where status = 'active';
create unique index if not exists phone_numbers_user_active_idx
  on public.phone_numbers (company_id, user_id) where status = 'active' and user_id is not null;
create index if not exists phone_numbers_company_idx on public.phone_numbers (company_id);

-- 2) Each rep's calling login for the in-app phone (server only, never read by the browser).
create table if not exists public.phone_credentials (
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.company_profiles(id) on delete cascade,
  telnyx_credential_id text not null,
  sip_username text not null,
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

-- 3) Calls (the call log in the CRM).
create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company_profiles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  direction text not null default 'outbound',       -- outbound | inbound
  from_number text,
  to_number text,
  status text not null default 'initiated',         -- initiated | ringing | answered | completed | missed | blocked | failed
  started_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer not null default 0,
  billable_minutes integer not null default 0,
  outcome text,                                      -- connected | voicemail | no_answer | interested | meeting | not_interested | wrong_number | callback
  notes text,
  recording_id text,
  recording_status text,                             -- recording | saved | none
  ai_summary jsonb,
  score smallint check (score between 1 and 5),
  manager_note text,
  flagged boolean not null default false,
  flags text[] not null default '{}',                -- not_a_lead | after_hours | long_call | unknown_caller
  telnyx_call_control_id text,
  telnyx_call_session_id text,
  created_at timestamptz not null default now()
);
create index if not exists calls_company_started_idx on public.calls (company_id, started_at desc);
create index if not exists calls_user_started_idx on public.calls (user_id, started_at desc);
create index if not exists calls_lead_idx on public.calls (lead_id);
create index if not exists calls_control_idx on public.calls (telnyx_call_control_id);
create index if not exists calls_session_idx on public.calls (telnyx_call_session_id);

-- 4) Phone rules per company.
create table if not exists public.phone_settings (
  company_id uuid primary key references public.company_profiles(id) on delete cascade,
  non_lead_policy text not null default 'flag',     -- flag | block
  announcement boolean not null default true,       -- "This call may be recorded…"
  hours_start smallint not null default 8,
  hours_end smallint not null default 19,
  timezone text not null default 'America/Chicago',
  long_call_minutes smallint not null default 45,
  rep_minute_limits jsonb not null default '{}',    -- { "<user_id>": 600 }  (Scale)
  updated_at timestamptz not null default now()
);

-- 5) Extra minutes bought (packs), per month.
create table if not exists public.phone_minute_packs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company_profiles(id) on delete cascade,
  minutes integer not null,
  amount numeric not null,
  period text not null,                              -- 'YYYY-MM'
  stripe_session_id text unique,
  created_at timestamptz not null default now()
);
create index if not exists phone_minute_packs_company_idx on public.phone_minute_packs (company_id, period);

-- 6) Reps accept the recording policy once per company.
create table if not exists public.phone_policy_acceptances (
  company_id uuid not null references public.company_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  accepted_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

-- ---------------------------------------------------------
-- Security: the browser can READ; all writes go through the
-- server (service key), which checks plan, limits and roles.
-- ---------------------------------------------------------
alter table public.phone_numbers enable row level security;
alter table public.phone_credentials enable row level security;
alter table public.calls enable row level security;
alter table public.phone_settings enable row level security;
alter table public.phone_minute_packs enable row level security;
alter table public.phone_policy_acceptances enable row level security;

drop policy if exists "Team reads phone numbers" on public.phone_numbers;
create policy "Team reads phone numbers" on public.phone_numbers
  for select using (public.is_company_member(company_id));

-- Reps see their own calls; owners, admins and managers see the whole team.
drop policy if exists "Reps read own calls, managers read all" on public.calls;
create policy "Reps read own calls, managers read all" on public.calls
  for select using (user_id = auth.uid() or public.is_company_manager(company_id));

drop policy if exists "Team reads phone settings" on public.phone_settings;
create policy "Team reads phone settings" on public.phone_settings
  for select using (public.is_company_member(company_id));

drop policy if exists "Managers read minute packs" on public.phone_minute_packs;
create policy "Managers read minute packs" on public.phone_minute_packs
  for select using (public.is_company_manager(company_id));

drop policy if exists "Own policy acceptance" on public.phone_policy_acceptances;
create policy "Own policy acceptance" on public.phone_policy_acceptances
  for select using (user_id = auth.uid() or public.is_company_manager(company_id));

-- phone_credentials: no policies = only the server can read it.

notify pgrst, 'reload schema';

select 'UPDATE 12 done' as result;
