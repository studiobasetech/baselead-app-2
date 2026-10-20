-- BaseLead: give the server key (service_role) access to every table.
-- Fixes "permission denied for table company_profiles" when redeeming codes,
-- and lets automation, notifications, bookings and proposals work.
-- Safe to run more than once. Row Level Security still protects users.

grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Tables created later get the same access automatically.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;

notify pgrst, 'reload schema';
