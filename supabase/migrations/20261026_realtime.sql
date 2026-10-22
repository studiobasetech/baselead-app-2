-- =========================================================
-- UPDATE 6 — Live updates (Supabase Realtime)
-- Lets the app show "Maria replied" the moment it happens and
-- refresh Today and the Pipeline without reloading the page.
-- Safe to run more than once.
-- =========================================================
do $$
declare
  t text;
begin
  foreach t in array array['leads', 'outreach', 'tasks', 'lead_activities'] loop
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = t)
       and not exists (
         select 1 from pg_publication_tables
         where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
       ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Send the previous values on updates so the app knows what changed
-- (e.g. "replied_at was empty, now it's set").
alter table public.outreach replica identity full;
