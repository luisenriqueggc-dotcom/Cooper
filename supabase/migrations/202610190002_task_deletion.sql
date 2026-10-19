begin;
alter table public.tasks add column if not exists deleted_at timestamptz;
alter table public.tasks add column if not exists deleted_by uuid references public.profiles;
drop policy if exists member_read on public.tasks;
create policy member_read on public.tasks for select to authenticated
 using(public.is_member() and deleted_at is null);
drop policy if exists member_read on public.task_assignees;
create policy member_read on public.task_assignees for select to authenticated
 using(public.is_member() and exists(select 1 from public.tasks t where t.id=task_id));

-- An old AI proposal cannot modify a task after it was removed from the board.
create or replace function public.protect_deleted_task() returns trigger
language plpgsql set search_path='' as $$
begin
 if old.deleted_at is not null and new.deleted_at is not null then
   raise exception 'Task deleted; restore before editing' using errcode='40001';
 end if;
 return new;
end $$;
drop trigger if exists protect_deleted_task on public.tasks;
create trigger protect_deleted_task before update on public.tasks
 for each row execute function public.protect_deleted_task();

create or replace function public.delete_task(task_id uuid, expected_version integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare t public.tasks;
begin
 if not public.is_admin() then raise exception 'Forbidden' using errcode='42501';end if;
 select * into t from public.tasks where id=task_id for update;
 if not found then raise exception 'Task not found';end if;
 if t.deleted_at is not null then return t.id;end if;
 if expected_version is distinct from t.version then
   raise exception 'Task changed; refresh before deleting' using errcode='40001';
 end if;
 update public.tasks set deleted_at=now(),deleted_by=auth.uid(),
 version=version+1,updated_at=now() where id=t.id;
 return t.id;
end $$;
revoke all on function public.delete_task(uuid,integer),public.protect_deleted_task() from public;
grant execute on function public.delete_task(uuid,integer) to authenticated;
commit;
