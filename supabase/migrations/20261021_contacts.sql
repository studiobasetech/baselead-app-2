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
