-- BaseLead: task board (Up next / In progress / Done) + note color and title
alter table public.tasks add column if not exists board_status text not null default 'todo';
alter table public.tasks add column if not exists color text;
alter table public.tasks add column if not exists label text;
update public.tasks set board_status = 'done' where completed_at is not null and board_status <> 'done';
notify pgrst, 'reload schema';
