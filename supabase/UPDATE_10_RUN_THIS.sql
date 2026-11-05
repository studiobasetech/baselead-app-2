-- =========================================================
-- BASELEAD UPDATE 10 — Email accounts (IMAP / SMTP)
-- Lets each user connect any email account (Hostinger, Zoho,
-- GoDaddy, Namecheap, Yahoo, iCloud, cPanel, custom domains...)
-- to send outreach and detect replies. Passwords are stored
-- encrypted by the server and are never readable from the app.
-- Supabase → SQL Editor → New query → paste → Run. Safe to re-run.
-- =========================================================

create table if not exists public.email_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.company_profiles(id) on delete cascade,
  email text not null,
  display_name text,
  provider text not null default 'custom',
  smtp_host text not null,
  smtp_port integer not null default 465,
  smtp_secure boolean not null default true,
  imap_host text,
  imap_port integer not null default 993,
  username text not null,
  password_encrypted text not null,
  daily_limit integer not null default 50,
  is_default boolean not null default true,
  status text not null default 'connected',
  last_error text,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, email)
);

create index if not exists email_accounts_user_idx on public.email_accounts (user_id);

alter table public.email_accounts enable row level security;

-- Each user manages only their own email accounts.
drop policy if exists "email_accounts_own_select" on public.email_accounts;
create policy "email_accounts_own_select" on public.email_accounts
  for select using (user_id = auth.uid());
drop policy if exists "email_accounts_own_insert" on public.email_accounts;
create policy "email_accounts_own_insert" on public.email_accounts
  for insert with check (user_id = auth.uid());
drop policy if exists "email_accounts_own_update" on public.email_accounts;
create policy "email_accounts_own_update" on public.email_accounts
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "email_accounts_own_delete" on public.email_accounts;
create policy "email_accounts_own_delete" on public.email_accounts
  for delete using (user_id = auth.uid());

-- The password column is never sent to the browser
-- (only the server, with the service key, can read it).
revoke select on public.email_accounts from anon, authenticated;
grant select (id, user_id, company_id, email, display_name, provider, smtp_host, smtp_port, smtp_secure,
  imap_host, imap_port, username, daily_limit, is_default, status, last_error, last_checked_at, created_at, updated_at)
  on public.email_accounts to authenticated;

-- Which account sent each email + AI label for replies.
alter table public.outreach
  add column if not exists sent_from text,
  add column if not exists reply_label text;

notify pgrst, 'reload schema';

select 'UPDATE 10 done' as result;
