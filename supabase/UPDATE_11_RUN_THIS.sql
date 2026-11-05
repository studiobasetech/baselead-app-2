-- =========================================================
-- BASELEAD UPDATE 11 — Multiple companies (Scale plan)
-- One account can run up to 5 companies (brands or clients),
-- each with its own leads, pipeline, team and settings.
-- Extra companies use the plan of the main company.
-- Supabase → SQL Editor → New query → paste → Run. Safe to re-run.
-- =========================================================

alter table public.company_profiles
  add column if not exists parent_company_id uuid references public.company_profiles(id) on delete cascade,
  add column if not exists owner_user_id uuid references auth.users(id) on delete cascade;

-- Extra companies are not "the" company of the user (that stays unique);
-- the owner reaches them as a team member with the "owner" role.
alter table public.company_profiles alter column user_id drop not null;

create index if not exists company_profiles_parent_idx on public.company_profiles (parent_company_id);
create index if not exists company_profiles_owner_idx on public.company_profiles (owner_user_id);

notify pgrst, 'reload schema';

select 'UPDATE 11 done' as result;
