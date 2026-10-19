-- BaseLead: unsubscribe / do-not-contact (email compliance)
alter table public.leads add column if not exists do_not_contact boolean not null default false;
alter table public.leads add column if not exists unsubscribed_at timestamptz;
alter table public.leads add column if not exists unsubscribe_reason text;
create index if not exists leads_do_not_contact_idx on public.leads (company_id, lower(email)) where do_not_contact;
notify pgrst, 'reload schema';
