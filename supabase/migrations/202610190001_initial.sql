begin;
create type public.app_role as enum ('admin','viewer');
create type public.task_status as enum ('backlog','todo','in_progress','review','done');
create type public.task_priority as enum ('low','normal','high','urgent');
create table public.profiles (
 id uuid primary key references auth.users(id) on delete restrict,
 display_name text not null check(length(display_name) between 1 and 120),
 role public.app_role not null default 'viewer', active boolean not null default false,
 created_at timestamptz not null default now()
);
create function public.is_member() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and active)
$$;
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and active and role='admin')
$$;
revoke all on function public.is_member(),public.is_admin() from public;
grant execute on function public.is_member(),public.is_admin() to authenticated;
create table public.areas(id uuid primary key default gen_random_uuid(), name text not null unique);
create table public.business_lines(id uuid primary key default gen_random_uuid(), name text not null unique);
create table public.projects(
 id uuid primary key default gen_random_uuid(),name text not null,
 description text not null default '',area_id uuid references public.areas,
 business_line_id uuid references public.business_lines,archived boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.tasks(
 id uuid primary key default gen_random_uuid(),title text not null check(length(title) between 3 and 180),
 context text not null default '' check(length(context)<=12000),
 status public.task_status not null default 'todo',priority public.task_priority not null default 'normal',
 due_date date,area_id uuid references public.areas,business_line_id uuid references public.business_lines,
 project_id uuid references public.projects,requester_id uuid references public.profiles,
 created_by uuid not null default auth.uid() references public.profiles,
 version integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 completed_at timestamptz
);
create table public.task_assignees(
 task_id uuid references public.tasks on delete cascade,user_id uuid references public.profiles,
 primary key(task_id,user_id)
);
create table public.comments(
 id uuid primary key default gen_random_uuid(),task_id uuid not null references public.tasks on delete cascade,
 author_id uuid not null default auth.uid() references public.profiles,
 body text not null check(length(body) between 1 and 12000),created_at timestamptz not null default now()
);
create table public.files(
 id uuid primary key default gen_random_uuid(),task_id uuid not null references public.tasks on delete cascade,
 uploaded_by uuid not null default auth.uid() references public.profiles,
 object_path text not null unique,original_name text not null,mime_type text not null,
 size_bytes bigint not null check(size_bytes between 1 and 10485760),created_at timestamptz not null default now()
);
create table public.task_history(
 id bigint generated always as identity primary key,task_id uuid not null references public.tasks,
 actor_id uuid references public.profiles,entity text not null,operation text not null,
 before_data jsonb,after_data jsonb,created_at timestamptz not null default now()
);
create table public.chat_sessions(
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references public.profiles,
 title text not null default 'Nueva conversación',created_at timestamptz not null default now()
);
create table public.chat_messages(
 id uuid primary key default gen_random_uuid(),session_id uuid not null references public.chat_sessions on delete cascade,
 role text not null check(role in ('user','assistant')),content text not null check(length(content)<=20000),
 created_at timestamptz not null default now()
);
create table public.ai_actions(
 id uuid primary key default gen_random_uuid(),session_id uuid not null references public.chat_sessions,
 user_id uuid not null default auth.uid() references public.profiles,payload jsonb not null,
 status text not null default 'pending' check(status in ('pending','applied','cancelled')),
 result_task_id uuid references public.tasks,created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '30 minutes'
);
create table public.ai_usage(user_id uuid references public.profiles,minute timestamptz not null,count integer not null,primary key(user_id,minute));
create index tasks_status_due on public.tasks(status,due_date);
create index tasks_project on public.tasks(project_id);
create index tasks_area on public.tasks(area_id);
create index assignees_user on public.task_assignees(user_id);
create index comments_task on public.comments(task_id,created_at);
create index files_task on public.files(task_id);
create index history_task on public.task_history(task_id,created_at);
create index messages_session on public.chat_messages(session_id,created_at);
create index sessions_user on public.chat_sessions(user_id);

-- All access is authenticated. Profiles/roles can only be provisioned out of band.
alter table public.profiles enable row level security;
create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_member());
grant select on public.profiles to authenticated;
revoke insert,update,delete on public.profiles from anon,authenticated;
do $$ declare t text; begin
 foreach t in array array['areas','business_lines','projects','tasks','task_assignees'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy member_read on public.%I for select to authenticated using(public.is_member())',t);
 execute format('grant select on public.%I to authenticated',t);
 end loop;
 foreach t in array array['areas','business_lines','projects','comments','files'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy admin_all on public.%I for all to authenticated using(public.is_admin()) with check(public.is_admin())',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 end loop;
end $$;
-- Task mutations only through validated atomic RPC; audit cannot be edited by clients.
revoke insert,update,delete on public.tasks,public.task_assignees from anon,authenticated;
alter table public.task_history enable row level security;
create policy history_read on public.task_history for select to authenticated using(public.is_admin());
grant select on public.task_history to authenticated;
revoke insert,update,delete on public.task_history from anon,authenticated;
alter table public.chat_sessions enable row level security;
create policy own_sessions on public.chat_sessions for all to authenticated using(public.is_admin() and user_id=auth.uid()) with check(public.is_admin() and user_id=auth.uid());
grant select,insert on public.chat_sessions to authenticated;
alter table public.chat_messages enable row level security;
create policy own_messages on public.chat_messages for all to authenticated using(public.is_admin() and exists(select 1 from public.chat_sessions s where s.id=session_id and s.user_id=auth.uid())) with check(public.is_admin() and exists(select 1 from public.chat_sessions s where s.id=session_id and s.user_id=auth.uid()));
grant select,insert on public.chat_messages to authenticated;
alter table public.ai_actions enable row level security;
create policy own_actions on public.ai_actions for select to authenticated using(public.is_admin() and user_id=auth.uid());
create policy propose_action on public.ai_actions for insert to authenticated with check(public.is_admin() and user_id=auth.uid() and status='pending' and result_task_id is null and exists(select 1 from public.chat_sessions s where s.id=session_id and s.user_id=auth.uid()));
grant select,insert on public.ai_actions to authenticated;
revoke update,delete on public.ai_actions from anon,authenticated;
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon,authenticated;

create function public.audit_task() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.task_history(task_id,actor_id,entity,operation,before_data,after_data)
 values((case when tg_table_name='tasks' then coalesce(to_jsonb(new)->>'id',to_jsonb(old)->>'id') else coalesce(to_jsonb(new)->>'task_id',to_jsonb(old)->>'task_id') end)::uuid,
 auth.uid(),tg_table_name,tg_op,case when tg_op='INSERT' then null else to_jsonb(old) end,case when tg_op='DELETE' then null else to_jsonb(new) end);
 return coalesce(new,old);
end $$;
create trigger task_audit after insert or update on public.tasks for each row execute function public.audit_task();
create trigger assignee_audit after insert or delete on public.task_assignees for each row execute function public.audit_task();
create trigger comment_audit after insert or update or delete on public.comments for each row execute function public.audit_task();
create trigger file_audit after insert or update or delete on public.files for each row execute function public.audit_task();

-- Shared serverless rate limit. No process-local counters.
create function public.consume_ai_quota() returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;begin
 if not public.is_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
 insert into public.ai_usage(user_id,minute,count) values(auth.uid(),date_trunc('minute',now()),1)
 on conflict(user_id,minute) do update set count=public.ai_usage.count+1 returning count into n;
 return n<=10;
end $$;

-- Serializes confirmation, detects stale edits and returns same result on retry.
create function public.apply_action(action_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare a public.ai_actions; t jsonb; task_key uuid; person uuid; old_version integer;begin
 if not public.is_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
 select * into a from public.ai_actions where id=action_id and user_id=auth.uid() for update;
 if not found then raise exception 'Action not found';end if;
 if a.status='applied' then return a.result_task_id;end if;
 if a.status<>'pending' or a.expires_at<now() then raise exception 'Action expired or cancelled';end if;
 t=a.payload->'task';
 if t is null or jsonb_typeof(t)<>'object' or t->>'title' is null or t->>'context' is null or t->>'status' is null or t->>'priority' is null or jsonb_typeof(t->'assignee_ids') is distinct from 'array' then raise exception 'Invalid task';end if;
 if jsonb_array_length(t->'assignee_ids')>20 then raise exception 'Too many assignees';end if;
 if t->>'requester_id' is not null and not exists(select 1 from public.profiles where id=(t->>'requester_id')::uuid and active) then raise exception 'Inactive requester';end if;
 if a.payload->>'kind'='create' then
 insert into public.tasks(title,context,status,priority,due_date,area_id,business_line_id,project_id,requester_id,completed_at)
 values(t->>'title',t->>'context',(t->>'status')::public.task_status,(t->>'priority')::public.task_priority,(t->>'due_date')::date,(t->>'area_id')::uuid,(t->>'business_line_id')::uuid,(t->>'project_id')::uuid,(t->>'requester_id')::uuid,case when t->>'status'='done' then now() end) returning id into task_key;
 elsif a.payload->>'kind'='update' then
 task_key=(a.payload->>'task_id')::uuid;
 select version into old_version from public.tasks where id=task_key for update;
 if old_version is null or (a.payload->>'expected_version')::integer is distinct from old_version then raise exception 'Task changed; refresh and propose again' using errcode='40001';end if;
 update public.tasks set title=t->>'title',context=t->>'context',status=(t->>'status')::public.task_status,priority=(t->>'priority')::public.task_priority,due_date=(t->>'due_date')::date,area_id=(t->>'area_id')::uuid,business_line_id=(t->>'business_line_id')::uuid,project_id=(t->>'project_id')::uuid,requester_id=(t->>'requester_id')::uuid,version=version+1,updated_at=now(),completed_at=case when t->>'status'='done' then coalesce(completed_at,now()) else null end where id=task_key;
 delete from public.task_assignees where task_id=task_key;
 else raise exception 'Unknown action';end if;
 for person in select distinct value::uuid from jsonb_array_elements_text(t->'assignee_ids') loop
 if not exists(select 1 from public.profiles where id=person and active) then raise exception 'Inactive assignee';end if;
 insert into public.task_assignees(task_id,user_id) values(task_key,person);
 end loop;
 update public.ai_actions set status='applied',result_task_id=task_key where id=a.id;
 return task_key;
end $$;
revoke all on function public.apply_action(uuid),public.consume_ai_quota(),public.audit_task() from public;
grant execute on function public.apply_action(uuid),public.consume_ai_quota() to authenticated;
-- Private bucket; viewer has no file access. Attachments never sent to AI automatically.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('task-files','task-files',false,10485760,array['application/pdf','image/png','image/jpeg','text/plain']);
create policy admin_files on storage.objects for all to authenticated using(bucket_id='task-files' and public.is_admin()) with check(bucket_id='task-files' and public.is_admin());
commit;
