-- =========================================================
-- BASELEAD — START OVER: delete ALL leads of your workspace
-- (and everything attached to them: search results, contacts,
-- activity, emails/outreach, tasks, follow-up enrollments).
-- Your account, company profile, services, plans, sequences
-- (the templates), proposals and settings are KEPT.
--
-- ⚠️ This cannot be undone.
-- Supabase → SQL Editor → New query → paste → Run.
-- =========================================================

do $$
declare
  target_company uuid;
  t text;
  n integer;
begin
  -- Your workspace (the account with this email).
  select c.id into target_company
  from public.company_profiles c
  join auth.users u on u.id = c.user_id
  where lower(u.email) = lower('kimberleypeelemeeser@hotmail.com')
  limit 1;

  if target_company is null then
    raise exception 'Workspace not found for that email.';
  end if;

  create temporary table _leads_to_delete on commit drop as
    select id from public.leads
    where company_id = target_company
       or user_id in (select user_id from public.company_profiles where id = target_company);

  -- Everything that points to those leads.
  foreach t in array array[
    'search_leads', 'lead_contacts', 'lead_activities', 'outreach', 'tasks',
    'sequence_enrollments', 'calendar_events', 'lead_notes'
  ] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'lead_id'
    ) then
      execute format('delete from public.%I where lead_id in (select id from _leads_to_delete)', t);
      get diagnostics n = row_count;
      raise notice '% rows deleted from %', n, t;
    end if;
  end loop;

  -- Proposals are kept, just unlinked from the deleted leads.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'proposals' and column_name = 'lead_id'
  ) then
    update public.proposals set lead_id = null where lead_id in (select id from _leads_to_delete);
  end if;

  delete from public.leads where id in (select id from _leads_to_delete);
  get diagnostics n = row_count;
  raise notice '% leads deleted', n;

  -- Old searches (their results are gone).
  delete from public.searches
  where user_id in (select user_id from public.company_profiles where id = target_company);
end $$;

select 'Leads reset done' as result;
