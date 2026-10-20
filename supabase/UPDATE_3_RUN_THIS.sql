-- BaseLead: task board columns (Up next / In progress / Done)
alter table public.tasks add column if not exists board_status text not null default 'todo';
update public.tasks set board_status = 'done' where completed_at is not null and board_status <> 'done';
notify pgrst, 'reload schema';
