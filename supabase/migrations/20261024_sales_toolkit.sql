-- BaseLead: Sales Toolkit (resources for the sales team)
-- Folders, documents, videos, images, links, scripts, training courses + progress.

create or replace function public.is_company_manager(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.company_profiles c
    where c.id = target and c.user_id = auth.uid()
  ) or exists (
    select 1 from public.team_members m
    where m.company_id = target and m.user_id = auth.uid()
      and m.status = 'active' and m.role in ('Admin', 'Manager')
  );
$$;

create table if not exists public.resource_folders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company_profiles(id) on delete cascade,
  parent_id uuid references public.resource_folders(id) on delete cascade,
  name text not null,
  description text,
  emoji text default '📁',
  is_course boolean not null default false,
  position integer not null default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company_profiles(id) on delete cascade,
  folder_id uuid references public.resource_folders(id) on delete cascade,
  title text not null,
  description text,
  kind text not null default 'document',
  url text,
  storage_path text,
  file_name text,
  mime_type text,
  size_bytes bigint,
  body text,
  tags text[] not null default '{}',
  pinned boolean not null default false,
  position integer not null default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resource_progress (
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.company_profiles(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (resource_id, user_id)
);

create index if not exists resources_company_folder_idx on public.resources (company_id, folder_id);
create index if not exists resource_folders_company_idx on public.resource_folders (company_id, parent_id);

alter table public.resource_folders enable row level security;
alter table public.resources enable row level security;
alter table public.resource_progress enable row level security;

drop policy if exists "Team reads folders" on public.resource_folders;
create policy "Team reads folders" on public.resource_folders for select using (public.is_company_member(company_id));
drop policy if exists "Managers edit folders" on public.resource_folders;
create policy "Managers edit folders" on public.resource_folders for all
  using (public.is_company_manager(company_id)) with check (public.is_company_manager(company_id));

drop policy if exists "Team reads resources" on public.resources;
create policy "Team reads resources" on public.resources for select using (public.is_company_member(company_id));
drop policy if exists "Managers edit resources" on public.resources;
create policy "Managers edit resources" on public.resources for all
  using (public.is_company_manager(company_id)) with check (public.is_company_manager(company_id));

drop policy if exists "Own progress" on public.resource_progress;
create policy "Own progress" on public.resource_progress for all
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_company_member(company_id));
drop policy if exists "Managers read progress" on public.resource_progress;
create policy "Managers read progress" on public.resource_progress for select using (public.is_company_manager(company_id));

grant select, insert, update, delete on public.resource_folders, public.resources, public.resource_progress to authenticated;
grant all on public.resource_folders, public.resources, public.resource_progress to service_role;

-- Private file storage (50 MB per file on Supabase's free plan)
insert into storage.buckets (id, name, public, file_size_limit)
values ('sales-resources', 'sales-resources', false, 52428800)
on conflict (id) do nothing;

drop policy if exists "Team reads sales files" on storage.objects;
create policy "Team reads sales files" on storage.objects for select
  using (bucket_id = 'sales-resources' and public.is_company_member(((storage.foldername(name))[1])::uuid));
drop policy if exists "Managers upload sales files" on storage.objects;
create policy "Managers upload sales files" on storage.objects for insert
  with check (bucket_id = 'sales-resources' and public.is_company_manager(((storage.foldername(name))[1])::uuid));
drop policy if exists "Managers delete sales files" on storage.objects;
create policy "Managers delete sales files" on storage.objects for delete
  using (bucket_id = 'sales-resources' and public.is_company_manager(((storage.foldername(name))[1])::uuid));

notify pgrst, 'reload schema';
