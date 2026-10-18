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
