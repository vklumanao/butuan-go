-- ButuanGo Milestone 2: safe task recovery before work starts.
-- Run after supabase/migrations/007_saved_addresses.sql.

begin;

alter table public.notifications
drop constraint if exists notifications_type_check;

alter table public.notifications
add constraint notifications_type_check check (
  type in (
    'REQUEST_ACCEPTED',
    'REQUEST_STARTED',
    'COMPLETION_SUBMITTED',
    'REQUEST_COMPLETED',
    'LOCATION_UPDATED',
    'RUNNER_RELEASED',
    'REQUEST_CANCELLED'
  )
);

create or replace function private.validate_request_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.requestor_id is distinct from old.requestor_id
    or new.created_at is distinct from old.created_at then
    raise exception 'Request identity and ownership cannot be changed';
  end if;

  if (
    new.category_id is distinct from old.category_id
    or new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.area is distinct from old.area
    or new.expense_budget is distinct from old.expense_budget
    or new.service_fee is distinct from old.service_fee
    or new.due_at is distinct from old.due_at
  ) and not (old.status = 'OPEN' and new.status = 'OPEN') then
    raise exception 'Request details can only be edited while the request remains OPEN';
  end if;

  if new.runner_id is distinct from old.runner_id and not (
    (
      old.status = 'OPEN'
      and new.status = 'ACCEPTED'
      and old.runner_id is null
      and new.runner_id is not null
    )
    or (
      old.status = 'ACCEPTED'
      and new.status in ('OPEN', 'CANCELLED')
      and old.runner_id is not null
      and new.runner_id is null
    )
  ) then
    raise exception 'Runner assignment can change only during acceptance or pre-start recovery';
  end if;

  if new.status is distinct from old.status and not (
    (old.status = 'OPEN' and new.status in ('ACCEPTED', 'CANCELLED'))
    or (old.status = 'ACCEPTED' and new.status in ('OPEN', 'IN_PROGRESS', 'CANCELLED'))
    or (old.status = 'IN_PROGRESS' and new.status = 'AWAITING_CONFIRMATION')
    or (old.status = 'AWAITING_CONFIRMATION' and new.status = 'COMPLETED')
  ) then
    raise exception 'Invalid request status transition from % to %', old.status, new.status;
  end if;

  if new.accepted_at is distinct from old.accepted_at and not (
    (old.status = 'OPEN' and new.status = 'ACCEPTED' and new.accepted_at is not null)
    or (
      old.status = 'ACCEPTED'
      and new.status in ('OPEN', 'CANCELLED')
      and new.accepted_at is null
    )
  ) then
    raise exception 'accepted_at can change only during acceptance or pre-start recovery';
  end if;

  if new.started_at is distinct from old.started_at
    and not (old.status = 'ACCEPTED' and new.status = 'IN_PROGRESS') then
    raise exception 'started_at can only be set when a task starts';
  end if;
  if new.submitted_at is distinct from old.submitted_at
    and not (old.status = 'IN_PROGRESS' and new.status = 'AWAITING_CONFIRMATION') then
    raise exception 'submitted_at can only be set when completion is submitted';
  end if;
  if new.completed_at is distinct from old.completed_at
    and not (old.status = 'AWAITING_CONFIRMATION' and new.status = 'COMPLETED') then
    raise exception 'completed_at can only be set when completion is confirmed';
  end if;
  if (
    new.cancelled_at is distinct from old.cancelled_at
    or new.cancellation_reason is distinct from old.cancellation_reason
  ) and not (
    old.status in ('OPEN', 'ACCEPTED') and new.status = 'CANCELLED'
  ) then
    raise exception 'Cancellation details can only be set before work starts';
  end if;

  return new;
end;
$$;

create or replace function private.log_request_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  transition_note text;
begin
  if tg_op = 'INSERT' then
    insert into public.request_updates (request_id, actor_id, event_type, to_status)
    values (new.id, (select auth.uid()), 'CREATED', new.status);
  elsif new.status is distinct from old.status then
    transition_note := case
      when new.status = 'CANCELLED' then new.cancellation_reason
      else nullif(current_setting('butuango.transition_note', true), '')
    end;

    insert into public.request_updates (
      request_id, actor_id, event_type, from_status, to_status, note
    )
    values (
      new.id,
      (select auth.uid()),
      'STATUS_CHANGED',
      old.status,
      new.status,
      transition_note
    );
  elsif new.category_id is distinct from old.category_id
    or new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.area is distinct from old.area
    or new.expense_budget is distinct from old.expense_budget
    or new.service_fee is distinct from old.service_fee
    or new.due_at is distinct from old.due_at then
    insert into public.request_updates (request_id, actor_id, event_type, to_status)
    values (new.id, (select auth.uid()), 'UPDATED', new.status);
  end if;
  return new;
end;
$$;

create or replace function private.create_request_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  runner_name text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'ACCEPTED' then
    select full_name into runner_name
    from public.profiles
    where id = new.runner_id;

    insert into public.notifications (user_id, request_id, type, title, message)
    values (
      new.requestor_id,
      new.id,
      'REQUEST_ACCEPTED',
      'Request accepted',
      format(
        '%s accepted your request: %s',
        coalesce(nullif(trim(runner_name), ''), 'A Runner'),
        new.title
      )
    );
  elsif old.status = 'ACCEPTED'
    and new.status = 'OPEN'
    and old.runner_id is not null
    and new.runner_id is null then
    insert into public.notifications (user_id, request_id, type, title, message)
    values (
      new.requestor_id,
      new.id,
      'RUNNER_RELEASED',
      'Runner released request',
      format('Your request is open for another Runner again: %s', new.title)
    );
  elsif new.status = 'CANCELLED' and old.runner_id is not null then
    insert into public.notifications (user_id, request_id, type, title, message)
    values (
      old.runner_id,
      new.id,
      'REQUEST_CANCELLED',
      'Request cancelled before start',
      format('The Requestor cancelled this task before work started: %s', new.title)
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

create or replace function public.cancel_open_request(
  p_request_id uuid,
  p_reason text
)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  updated_request public.requests%rowtype;
begin
  if caller_id is null or (select private.current_profile_role()) is distinct from 'requestor' then
    raise exception 'Only an authenticated Requestor can cancel a request';
  end if;
  if p_reason is null or char_length(trim(p_reason)) not between 5 and 500 then
    raise exception 'A cancellation reason between 5 and 500 characters is required';
  end if;

  update public.requests
  set
    runner_id = null,
    status = 'CANCELLED',
    cancellation_reason = trim(p_reason),
    accepted_at = null,
    cancelled_at = now()
  where id = p_request_id
    and requestor_id = caller_id
    and status in ('OPEN', 'ACCEPTED')
  returning * into updated_request;

  if updated_request.id is null then
    raise exception 'The request was not found or can no longer be cancelled before work starts';
  end if;
  return updated_request;
end;
$$;

create or replace function public.release_accepted_request(
  p_request_id uuid,
  p_reason text
)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  updated_request public.requests%rowtype;
begin
  if caller_id is null or (select private.current_profile_role()) is distinct from 'runner' then
    raise exception 'Only an authenticated Runner can release a task';
  end if;
  if p_reason is null or char_length(trim(p_reason)) not between 5 and 500 then
    raise exception 'A release reason between 5 and 500 characters is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(caller_id::text, 0));
  perform set_config('butuango.transition_note', trim(p_reason), true);

  update public.requests
  set
    runner_id = null,
    status = 'OPEN',
    accepted_at = null
  where id = p_request_id
    and runner_id = caller_id
    and status = 'ACCEPTED'
  returning * into updated_request;

  if updated_request.id is null then
    raise exception 'The task was not found or can no longer be released';
  end if;
  return updated_request;
end;
$$;

revoke all on function public.cancel_open_request(uuid, text) from public, anon;
revoke all on function public.release_accepted_request(uuid, text) from public, anon;
grant execute on function public.cancel_open_request(uuid, text) to authenticated;
grant execute on function public.release_accepted_request(uuid, text) to authenticated;

revoke all on function private.validate_request_change() from public, anon, authenticated;
revoke all on function private.log_request_change() from public, anon, authenticated;
revoke all on function private.create_request_notification() from public, anon, authenticated;

comment on function public.release_accepted_request(uuid, text) is
'Allows only the assigned Runner to release an ACCEPTED task before work starts. The request returns to OPEN and private participant access is revoked.';

comment on function public.cancel_open_request(uuid, text) is
'Allows the owning Requestor to cancel an OPEN or ACCEPTED request before work starts. Any assigned Runner is removed and notified.';

commit;
