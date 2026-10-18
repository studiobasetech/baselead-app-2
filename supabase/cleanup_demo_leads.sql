-- =========================================================
-- BASELEAD: DELETE ALL FAKE / DEMO LEADS
-- Supabase → SQL Editor → New query → paste → Run.
-- Only removes sample leads created by the old test search.
-- Real leads (Google Places, CSV, added by hand) are kept.
-- =========================================================

do $$
declare
  demo_ids text[];
begin
  select coalesce(array_agg(id::text), '{}') into demo_ids
  from public.leads
  where source in ('test', 'demo', 'mock')
     or raw_data->>'provider' in ('mock', 'demo')
     or raw_data->>'test_data' = 'true'
     or source_id like 'mock-%'
     or email ilike '%.example'
     or website ilike '%example.com/%';

  raise notice 'Deleting % demo leads', coalesce(array_length(demo_ids, 1), 0);

  -- Things linked to those leads
  delete from public.search_leads where lead_id::text = any(demo_ids);
  delete from public.outreach where lead_id::text = any(demo_ids);

  if to_regclass('public.calendar_events') is not null then
    execute 'delete from public.calendar_events where lead_id::text = any($1)' using demo_ids;
  end if;

  -- The demo leads themselves
  delete from public.leads where id::text = any(demo_ids);

  -- Old searches that no longer have any leads
  delete from public.searches s
  where not exists (
    select 1 from public.search_leads sl where sl.search_id = s.id
  );
end $$;

-- How many real leads are left
select count(*) as real_leads_remaining from public.leads;
