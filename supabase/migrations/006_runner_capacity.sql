-- ButuanGo Milestone 2: one execution-active task per Runner.
-- Run after supabase/migrations/005_request_participants.sql.
-- ACCEPTED and IN_PROGRESS consume capacity; AWAITING_CONFIRMATION does not.

begin;

create or replace function private.enforce_runner_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.runner_id is not null
    and new.status in ('ACCEPTED', 'IN_PROGRESS')
    and (
      old.runner_id is distinct from new.runner_id
      or old.status not in ('ACCEPTED', 'IN_PROGRESS')
    ) then
    perform pg_advisory_xact_lock(hashtextextended(new.runner_id::text, 0));

    if exists (
      select 1
      from public.requests
      where runner_id = new.runner_id
        and status in ('ACCEPTED', 'IN_PROGRESS')
        and id <> new.id
    ) then
      raise exception 'Finish or submit your current task before accepting another request';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists requests_enforce_runner_capacity on public.requests;
create trigger requests_enforce_runner_capacity
before update of runner_id, status on public.requests
for each row execute function private.enforce_runner_capacity();

revoke all on function private.enforce_runner_capacity() from public, anon, authenticated;

create or replace function public.accept_request(p_request_id uuid)
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
    raise exception 'Only an authenticated Runner can accept a request';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(caller_id::text, 0));

  if exists (
    select 1
    from public.requests
    where runner_id = caller_id
      and status in ('ACCEPTED', 'IN_PROGRESS')
  ) then
    raise exception 'Finish or submit your current task before accepting another request';
  end if;

  update public.requests
  set runner_id = caller_id, status = 'ACCEPTED', accepted_at = now()
  where id = p_request_id
    and status = 'OPEN'
    and runner_id is null
    and requestor_id <> caller_id
  returning * into updated_request;

  if updated_request.id is null then
    raise exception 'This request is no longer available';
  end if;
  return updated_request;
end;
$$;

revoke all on function public.accept_request(uuid) from public, anon;
grant execute on function public.accept_request(uuid) to authenticated;

comment on function private.enforce_runner_capacity() is
'Prevents a Runner from holding more than one ACCEPTED or IN_PROGRESS task. Uses a transaction advisory lock to serialize concurrent acceptance attempts.';

commit;
