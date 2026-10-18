-- =========================================================
-- BASELEAD: DELETE ALL LEADS (fresh start)
-- Supabase → SQL Editor → New query → paste → Run.
--
-- ⚠️ Permanently deletes EVERY lead in the database, plus
-- what depends on them: search history, outreach emails
-- for those leads and calendar events linked to a lead.
-- Companies, users, team, settings and plans are NOT touched.
-- This cannot be undone.
-- =========================================================

-- Preview what will be deleted (optional: run this line alone first)
-- select (select count(*) from public.leads) as leads,
--        (select count(*) from public.outreach) as outreach,
--        (select count(*) from public.searches) as searches;

begin;

delete from public.search_leads;
delete from public.searches;
delete from public.outreach where lead_id is not null;

do $$
begin
  if to_regclass('public.calendar_events') is not null then
    delete from public.calendar_events where lead_id is not null;
  end if;
end $$;

delete from public.leads;

commit;

-- Should show 0
select count(*) as leads_remaining from public.leads;
