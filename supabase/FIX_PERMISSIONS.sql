-- BaseLead: give the app permission to use the new tables.
-- Newer Supabase projects don't grant access to new tables automatically,
-- so the tables existed but the app was blocked ("permission denied").
-- Safe to run more than once. Row Level Security still protects every row.

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on
  public.calendar_events,
  public.api_keys,
  public.lead_activities,
  public.tasks,
  public.sequences,
  public.sequence_steps,
  public.sequence_enrollments,
  public.booking_pages,
  public.proposals,
  public.lead_contacts
to authenticated;

-- Encrypted keys: server only, never the browser.
revoke all on public.workspace_secrets from anon, authenticated;

grant all on
  public.calendar_events,
  public.api_keys,
  public.lead_activities,
  public.tasks,
  public.sequences,
  public.sequence_steps,
  public.sequence_enrollments,
  public.booking_pages,
  public.proposals,
  public.lead_contacts,
  public.workspace_secrets
to service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;

-- Refresh the API so the change is picked up right away.
notify pgrst, 'reload schema';
