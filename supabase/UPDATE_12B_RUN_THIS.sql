-- BASELEAD UPDATE 12B — permissions for the calling tables (fixes "permission denied for table calls").
-- Supabase → SQL Editor → New query → paste → Run. Safe to re-run.

grant usage on schema public to authenticated, service_role;

-- The app (signed-in users) can only READ; the security rules decide which rows.
grant select on public.phone_numbers, public.calls, public.phone_settings,
  public.phone_minute_packs, public.phone_policy_acceptances to authenticated;

-- The server can read and write everything (it checks plan, limits and roles).
grant all on public.phone_numbers, public.phone_credentials, public.calls, public.phone_settings,
  public.phone_minute_packs, public.phone_policy_acceptances to service_role;

notify pgrst, 'reload schema';

select 'UPDATE 12B done' as result;
