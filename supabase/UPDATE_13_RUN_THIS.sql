-- =========================================================
-- BASELEAD UPDATE 13 — Push notification settings (phone app)
-- Supabase → SQL Editor → New query → paste → Run. Safe to re-run.
-- =========================================================

alter table public.user_settings
  add column if not exists push_notifications boolean not null default true,
  add column if not exists call_alerts boolean not null default true;

-- Phone tokens table (created in UPDATE 7): make sure the server can use it.
grant select, insert, update, delete on public.push_tokens to authenticated;
grant all on public.push_tokens to service_role;

notify pgrst, 'reload schema';

select 'UPDATE 13 done' as result;
