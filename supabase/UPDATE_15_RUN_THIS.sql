-- BASELEAD UPDATE 15 — new plans: shared minute pools, phone add-ons, automatic overage, usage alerts.
-- Supabase → SQL Editor → New query → paste → Run. Safe to re-run.

-- 1) Monthly phone add-ons (each one is its own Stripe subscription).
create table if not exists public.phone_addons (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company_profiles(id) on delete cascade,
  kind text not null check (kind in ('starter_phone', 'extra_line', 'power_line')),
  quantity integer not null default 1 check (quantity >= 0),
  status text not null default 'active',            -- Stripe status: active, past_due, canceled…
  stripe_subscription_id text unique,
  stripe_customer_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists phone_addons_company_idx on public.phone_addons (company_id, status);

-- 2) Automatic overage settings (opt-in, with a monthly spending cap in USD).
alter table public.phone_settings add column if not exists overage_enabled boolean not null default false;
alter table public.phone_settings add column if not exists overage_cap numeric not null default 50;

-- 3) Minutes of each call that went over the pool (billed at $0.02/min).
alter table public.calls add column if not exists overage_minutes integer not null default 0;

-- 4) One overage charge per company per month (added to their next Stripe invoice).
create table if not exists public.phone_overage_charges (
  company_id uuid not null references public.company_profiles(id) on delete cascade,
  period text not null,                              -- 'YYYY-MM'
  minutes integer not null,
  amount numeric not null,
  stripe_invoice_item_id text,
  created_at timestamptz not null default now(),
  primary key (company_id, period)
);

-- 5) 80% / 100% usage alerts, sent once per month.
create table if not exists public.phone_usage_alerts (
  company_id uuid not null references public.company_profiles(id) on delete cascade,
  period text not null,
  threshold integer not null,
  sent_at timestamptz not null default now(),
  primary key (company_id, period, threshold)
);

-- Security: the app can read its own company's rows; only the server writes.
alter table public.phone_addons enable row level security;
alter table public.phone_overage_charges enable row level security;
alter table public.phone_usage_alerts enable row level security;

drop policy if exists "Team reads phone add-ons" on public.phone_addons;
create policy "Team reads phone add-ons" on public.phone_addons
  for select using (public.is_company_member(company_id));

drop policy if exists "Team reads overage charges" on public.phone_overage_charges;
create policy "Team reads overage charges" on public.phone_overage_charges
  for select using (public.is_company_member(company_id));

grant select on public.phone_addons, public.phone_overage_charges, public.phone_usage_alerts to authenticated;
grant all on public.phone_addons, public.phone_overage_charges, public.phone_usage_alerts to service_role;

notify pgrst, 'reload schema';

select 'UPDATE 15 done' as result;
