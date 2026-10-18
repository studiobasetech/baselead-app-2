-- =========================================================
-- BASELEAD PLAN & ENTITLEMENTS FOUNDATION
-- Step 1
--
-- Payment/Stripe is intentionally NOT included.
-- The company's stored plan is the temporary source of truth
-- until payment is connected later.
-- =========================================================

alter table public.company_profiles
  add column if not exists plan text;

update public.company_profiles
set plan = 'Pro'
where plan is null
   or plan not in ('Starter', 'Pro', 'Scale');

alter table public.company_profiles
  alter column plan set default 'Pro';

alter table public.company_profiles
  alter column plan set not null;

alter table public.company_profiles
  drop constraint if exists company_profiles_plan_check;

alter table public.company_profiles
  add constraint company_profiles_plan_check
  check (plan in ('Starter', 'Pro', 'Scale'));
