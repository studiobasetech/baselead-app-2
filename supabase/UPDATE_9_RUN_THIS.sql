-- =========================================================
-- BASELEAD UPDATE 9 — Outreach tracking columns
-- The app's Today, Outreach, Reports and automation read these
-- columns, but they were missing in the database (400 errors).
-- Supabase → SQL Editor → New query → paste → Run. Safe to re-run.
-- =========================================================

alter table public.outreach
  add column if not exists campaign text,
  add column if not exists scheduled_at timestamptz,
  add column if not exists sent_at timestamptz,
  add column if not exists opened_at timestamptz,
  add column if not exists replied_at timestamptz,
  add column if not exists next_step text,
  add column if not exists next_step_at timestamptz;

create index if not exists outreach_user_replied_idx on public.outreach (user_id, replied_at);
create index if not exists outreach_user_next_step_idx on public.outreach (user_id, next_step_at);
create index if not exists outreach_scheduled_idx on public.outreach (status, scheduled_at);

-- Refresh the API so the new columns work right away
notify pgrst, 'reload schema';

select 'UPDATE 9 done' as result;
