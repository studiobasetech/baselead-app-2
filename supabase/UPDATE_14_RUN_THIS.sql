-- BASELEAD UPDATE 14 — Ringtone for incoming calls (per user).
-- Supabase → SQL Editor → New query → paste → Run. Safe to re-run.
alter table public.user_settings
  add column if not exists ringtone text not null default 'breeze';
notify pgrst, 'reload schema';
select 'UPDATE 14 done' as result;
