-- ButuanGo Milestone 2: secure in-app notifications for request lifecycle events.
-- Run after supabase/migrations/002_request_workflow.sql.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid references public.requests(id) on delete set null,
  type text not null check (
    type in (
      'REQUEST_ACCEPTED',
      'REQUEST_STARTED',
      'COMPLETION_SUBMITTED',
      'REQUEST_COMPLETED'
    )
  ),
  title text not null check (char_length(trim(title)) between 2 and 120),
  message text not null check (char_length(trim(message)) between 2 and 500),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_at_idx
on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
on public.notifications (user_id, created_at desc)
where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "Users can read their own notifications" on public.notifications;
create policy "Users can read their own notifications"
on public.notifications for select to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.notifications from anon, authenticated;
grant select on table public.notifications to authenticated;

create or replace function private.create_request_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'ACCEPTED' then
    insert into public.notifications (user_id, request_id, type, title, message)
    values (
      new.requestor_id,
      new.id,
      'REQUEST_ACCEPTED',
      'Request accepted',
      format('A Runner accepted your request: %s', new.title)
    );
  elsif new.status = 'IN_PROGRESS' then
    insert into public.notifications (user_id, request_id, type, title, message)
    values (
      new.requestor_id,
      new.id,
      'REQUEST_STARTED',
      'Task started',
      format('Your Runner started working on: %s', new.title)
    );
  elsif new.status = 'AWAITING_CONFIRMATION' then
    insert into public.notifications (user_id, request_id, type, title, message)
    values (
      new.requestor_id,
      new.id,
      'COMPLETION_SUBMITTED',
      'Completion needs confirmation',
      format('Your Runner submitted %s for completion confirmation.', new.title)
    );
  elsif new.status = 'COMPLETED' and new.runner_id is not null then
    insert into public.notifications (user_id, request_id, type, title, message)
    values (
      new.runner_id,
      new.id,
      'REQUEST_COMPLETED',
      'Task completed',
      format('The Requestor confirmed completion of: %s', new.title)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists requests_create_notification on public.requests;
create trigger requests_create_notification
after update of status on public.requests
for each row
when (old.status is distinct from new.status)
execute function private.create_request_notification();

revoke all on function private.create_request_notification() from public, anon, authenticated;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns public.notifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  updated_notification public.notifications%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication is required';
  end if;

  update public.notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id
    and user_id = caller_id
  returning * into updated_notification;

  if updated_notification.id is null then
    raise exception 'The notification was not found';
  end if;

  return updated_notification;
end;
$$;

create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  affected_count integer;
begin
  if caller_id is null then
    raise exception 'Authentication is required';
  end if;

  update public.notifications
  set read_at = now()
  where user_id = caller_id
    and read_at is null;

  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;

revoke all on function public.mark_notification_read(uuid) from public, anon;
revoke all on function public.mark_all_notifications_read() from public, anon;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;

comment on table public.notifications is
'Private in-app notifications created by trusted database triggers for request lifecycle events.';

commit;
