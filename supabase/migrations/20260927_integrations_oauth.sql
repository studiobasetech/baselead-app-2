create table if not exists public.connected_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  status text not null default 'connected'
    check (status in ('connected', 'disconnected', 'error')),
  account_email text,
  account_name text,
  metadata jsonb not null default '{}'::jsonb,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_synced_at timestamptz,
  last_error text,
  unique (user_id, provider)
);

create table if not exists public.integration_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null
    check (provider in ('gmail', 'google-calendar', 'google-sheets')),
  refresh_token_encrypted text not null,
  scopes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

alter table public.connected_integrations enable row level security;
alter table public.integration_credentials enable row level security;

create policy "Users manage their own integrations"
  on public.connected_integrations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their encrypted integration credentials"
  on public.integration_credentials
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);