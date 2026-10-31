-- BaseLead security check (read-only: changes nothing).
-- Supabase → SQL Editor → paste → Run. Copy the result table back to Claude.
-- Every table should show rls_enabled = true and at least 1 policy.
-- A table with rls_enabled = false can be read by ANYONE who has the app's public key.

select
  c.relname                                   as table_name,
  c.relrowsecurity                            as rls_enabled,
  count(p.polname)                            as policies,
  string_agg(p.polname, ', ' order by p.polname) as policy_names
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public'
  and c.relkind = 'r'
group by c.relname, c.relrowsecurity
order by c.relrowsecurity, c.relname;
