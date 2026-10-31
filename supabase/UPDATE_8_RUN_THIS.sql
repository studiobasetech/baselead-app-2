-- BaseLead update 8: free accounts. New sign-ups start with NO plan ("inactive").
-- They tap "Start my 7-day free trial" inside the app to begin the trial (once per workspace).
-- Existing workspaces are not changed. Supabase → SQL Editor → paste → Run. Safe to run more than once.

alter table public.company_profiles
  alter column billing_status set default 'inactive',
  alter column trial_started_at drop default,
  alter column trial_ends_at drop default;

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
    new.billing_status := 'inactive';
    new.trial_started_at := null;
    new.trial_ends_at := null;
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
