-- BaseLead update 7: push notifications for the iPhone/Android app.
-- Supabase → SQL Editor → paste → Run. Safe to run more than once.

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_id_idx on public.push_tokens(user_id);

alter table public.push_tokens enable row level security;

drop policy if exists "push_tokens_own_select" on public.push_tokens;
create policy "push_tokens_own_select" on public.push_tokens for select using (auth.uid() = user_id);
drop policy if exists "push_tokens_own_insert" on public.push_tokens;
create policy "push_tokens_own_insert" on public.push_tokens for insert with check (auth.uid() = user_id);
drop policy if exists "push_tokens_own_update" on public.push_tokens;
create policy "push_tokens_own_update" on public.push_tokens for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "push_tokens_own_delete" on public.push_tokens;
create policy "push_tokens_own_delete" on public.push_tokens for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.push_tokens to authenticated;
grant all on public.push_tokens to service_role;
