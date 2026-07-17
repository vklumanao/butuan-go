-- ButuanGo Milestone 2: limited participant identity disclosure.
-- Run after supabase/migrations/004_request_locations.sql.

begin;

create or replace function public.get_request_participants(p_request_id uuid)
returns table (
  user_id uuid,
  participant_type text,
  full_name text,
  phone_number text,
  avatar_url text,
  role text,
  member_since timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request_record public.requests%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication is required';
  end if;

  select * into request_record
  from public.requests
  where id = p_request_id;

  if request_record.id is null then
    raise exception 'The request was not found';
  end if;

  if caller_id is distinct from request_record.requestor_id
    and caller_id is distinct from request_record.runner_id then
    raise exception 'Only request participants can view participant information';
  end if;

  return query
  select
    profile.id,
    case
      when profile.id = request_record.requestor_id then 'requestor'
      when profile.id = request_record.runner_id then 'runner'
    end,
    profile.full_name,
    profile.phone_number,
    profile.avatar_url,
    profile.role,
    profile.created_at
  from public.profiles as profile
  where profile.id = request_record.requestor_id
    or profile.id = request_record.runner_id
  order by
    case when profile.id = request_record.requestor_id then 1 else 2 end;
end;
$$;

revoke all on function public.get_request_participants(uuid) from public, anon;
grant execute on function public.get_request_participants(uuid) to authenticated;

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

revoke all on function private.create_request_notification() from public, anon, authenticated;

comment on function public.get_request_participants(uuid) is
'Returns limited profile fields only when the caller is the Requestor or assigned Runner for the specified request.';

commit;
