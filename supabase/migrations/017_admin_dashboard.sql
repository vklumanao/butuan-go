-- ButuanGo Admin operations dashboard and audit visibility.
-- Run after supabase/migrations/016_google_profile_avatars.sql.

begin;

create table if not exists public.admin_audit_events (
  id bigint generated always as identity primary key,
  admin_id uuid not null references public.profiles(id) on delete restrict,
  action text not null check (
    action in (
      'DISPUTE_RESOLVED',
      'ACCOUNT_RESTRICTED',
      'ACCOUNT_RESTRICTION_UPDATED',
      'ACCOUNT_RESTRICTION_CLEARED'
    )
  ),
  entity_type text not null check (
    entity_type in ('request_dispute', 'account_restriction')
  ),
  entity_id uuid not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_events_created_at_idx
on public.admin_audit_events (created_at desc, id desc);

alter table public.admin_audit_events enable row level security;

drop policy if exists "Admins can read audit events"
on public.admin_audit_events;
create policy "Admins can read audit events"
on public.admin_audit_events for select to authenticated
using ((select private.current_profile_role()) = 'admin');

revoke all on table public.admin_audit_events
from public, anon, authenticated;
grant select on table public.admin_audit_events to authenticated;

create or replace function private.audit_admin_dispute_resolution()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'OPEN'
    and new.status in ('RESOLVED', 'DISMISSED')
    and new.resolved_by is not null then
    insert into public.admin_audit_events (
      admin_id,
      action,
      entity_type,
      entity_id,
      details
    )
    values (
      new.resolved_by,
      'DISPUTE_RESOLVED',
      'request_dispute',
      new.id,
      jsonb_build_object(
        'request_id', new.request_id,
        'outcome', new.resolution_outcome,
        'reported_user_id', new.reported_user_id
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists request_disputes_audit_admin_resolution
on public.request_disputes;
create trigger request_disputes_audit_admin_resolution
after update on public.request_disputes
for each row execute function private.audit_admin_dispute_resolution();

create or replace function private.audit_admin_account_restriction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  target_id uuid;
  audit_action text;
  audit_details jsonb;
begin
  if tg_op = 'DELETE' then
    actor_id := coalesce((select auth.uid()), old.created_by);
    target_id := old.account_id;
    audit_action := 'ACCOUNT_RESTRICTION_CLEARED';
    audit_details := jsonb_build_object(
      'restricted_until', old.restricted_until,
      'source_dispute_id', old.source_dispute_id
    );
  elsif tg_op = 'UPDATE' then
    actor_id := new.created_by;
    target_id := new.account_id;
    audit_action := 'ACCOUNT_RESTRICTION_UPDATED';
    audit_details := jsonb_build_object(
      'restricted_until', new.restricted_until,
      'source_dispute_id', new.source_dispute_id
    );
  else
    actor_id := new.created_by;
    target_id := new.account_id;
    audit_action := 'ACCOUNT_RESTRICTED';
    audit_details := jsonb_build_object(
      'restricted_until', new.restricted_until,
      'source_dispute_id', new.source_dispute_id
    );
  end if;

  insert into public.admin_audit_events (
    admin_id,
    action,
    entity_type,
    entity_id,
    details
  )
  values (
    actor_id,
    audit_action,
    'account_restriction',
    target_id,
    audit_details
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists account_restrictions_audit_admin_change
on public.account_restrictions;
create trigger account_restrictions_audit_admin_change
after insert or update or delete on public.account_restrictions
for each row execute function private.audit_admin_account_restriction();

create or replace function public.admin_get_dashboard_summary()
returns table (
  total_accounts bigint,
  onboarded_accounts bigint,
  total_requests bigint,
  open_requests bigint,
  active_requests bigint,
  completed_requests bigint,
  failed_requests bigint,
  open_disputes bigint,
  active_restrictions bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
    or (select private.current_profile_role()) is distinct from 'admin' then
    raise exception 'Only an Admin can view dashboard operations';
  end if;

  return query
  select
    (select count(*) from public.profiles),
    (
      select count(*)
      from public.profiles
      where onboarding_completed_at is not null
    ),
    (select count(*) from public.requests),
    (
      select count(*)
      from public.requests
      where status = 'OPEN'
    ),
    (
      select count(*)
      from public.requests
      where status in ('ACCEPTED', 'IN_PROGRESS', 'AWAITING_CONFIRMATION')
    ),
    (
      select count(*)
      from public.requests
      where status = 'COMPLETED'
    ),
    (
      select count(*)
      from public.requests
      where status = 'FAILED'
    ),
    (
      select count(*)
      from public.request_disputes
      where status = 'OPEN'
    ),
    (
      select count(*)
      from public.account_restrictions
      where restricted_until > now()
    );
end;
$$;

create or replace function public.admin_list_accounts(
  p_search text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  full_name text,
  email text,
  role text,
  active_role text,
  signup_method text,
  onboarding_completed_at timestamptz,
  created_at timestamptz,
  request_count bigint,
  runner_task_count bigint,
  restriction_reason text,
  restricted_until timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  safe_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  safe_offset integer := greatest(coalesce(p_offset, 0), 0);
  search_value text := nullif(trim(coalesce(p_search, '')), '');
begin
  if (select auth.uid()) is null
    or (select private.current_profile_role()) is distinct from 'admin' then
    raise exception 'Only an Admin can list accounts';
  end if;

  return query
  select
    profile.id,
    profile.full_name,
    profile.email,
    profile.role,
    profile.active_role,
    profile.signup_method,
    profile.onboarding_completed_at,
    profile.created_at,
    (
      select count(*)
      from public.requests as owned_request
      where owned_request.requestor_id = profile.id
    ),
    (
      select count(*)
      from public.requests as assigned_request
      where assigned_request.runner_id = profile.id
    ),
    restriction.reason,
    restriction.restricted_until
  from public.profiles as profile
  left join public.account_restrictions as restriction
    on restriction.account_id = profile.id
   and restriction.restricted_until > now()
  where search_value is null
     or profile.full_name ilike '%' || search_value || '%'
     or profile.email ilike '%' || search_value || '%'
     or profile.id::text = search_value
  order by profile.created_at desc, profile.id
  limit safe_limit
  offset safe_offset;
end;
$$;

create or replace function public.admin_list_requests(
  p_status text default null,
  p_search text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  title text,
  area text,
  status text,
  expense_budget numeric,
  service_fee numeric,
  due_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  category_name text,
  requestor_id uuid,
  requestor_name text,
  runner_id uuid,
  runner_name text,
  payment_arrangement text,
  has_open_dispute boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  safe_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  safe_offset integer := greatest(coalesce(p_offset, 0), 0);
  status_value text := nullif(upper(trim(coalesce(p_status, ''))), '');
  search_value text := nullif(trim(coalesce(p_search, '')), '');
begin
  if (select auth.uid()) is null
    or (select private.current_profile_role()) is distinct from 'admin' then
    raise exception 'Only an Admin can list requests';
  end if;

  if status_value is not null
    and status_value <> 'ALL'
    and status_value not in (
      'OPEN',
      'ACCEPTED',
      'IN_PROGRESS',
      'AWAITING_CONFIRMATION',
      'COMPLETED',
      'CANCELLED',
      'FAILED'
    ) then
    raise exception 'Choose a valid request status';
  end if;

  return query
  select
    request.id,
    request.title,
    request.area,
    request.status,
    request.expense_budget,
    request.service_fee,
    request.due_at,
    request.created_at,
    request.updated_at,
    category.name,
    request.requestor_id,
    requestor.full_name,
    request.runner_id,
    runner.full_name,
    payment.arrangement,
    exists (
      select 1
      from public.request_disputes as dispute
      where dispute.request_id = request.id
        and dispute.status = 'OPEN'
    )
  from public.requests as request
  join public.categories as category on category.id = request.category_id
  join public.profiles as requestor on requestor.id = request.requestor_id
  left join public.profiles as runner on runner.id = request.runner_id
  left join public.request_payment_terms as payment
    on payment.request_id = request.id
  where (
      status_value is null
      or status_value = 'ALL'
      or request.status = status_value
    )
    and (
      search_value is null
      or request.title ilike '%' || search_value || '%'
      or request.area ilike '%' || search_value || '%'
      or request.id::text = search_value
      or requestor.full_name ilike '%' || search_value || '%'
      or runner.full_name ilike '%' || search_value || '%'
    )
  order by request.created_at desc, request.id
  limit safe_limit
  offset safe_offset;
end;
$$;

create or replace function public.admin_list_disputes(
  p_status text default 'OPEN',
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  request_id uuid,
  request_title text,
  request_status text,
  category text,
  description text,
  status text,
  resolution_outcome text,
  resolution_note text,
  resolved_at timestamptz,
  created_at timestamptz,
  opened_by uuid,
  opener_name text,
  opener_email text,
  reported_user_id uuid,
  reported_name text,
  reported_email text,
  resolved_by uuid,
  resolver_name text,
  reported_restricted_until timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  safe_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  safe_offset integer := greatest(coalesce(p_offset, 0), 0);
  status_value text := coalesce(
    nullif(upper(trim(coalesce(p_status, ''))), ''),
    'OPEN'
  );
begin
  if (select auth.uid()) is null
    or (select private.current_profile_role()) is distinct from 'admin' then
    raise exception 'Only an Admin can list disputes';
  end if;

  if status_value not in ('ALL', 'OPEN', 'WITHDRAWN', 'RESOLVED', 'DISMISSED') then
    raise exception 'Choose a valid dispute status';
  end if;

  return query
  select
    dispute.id,
    dispute.request_id,
    request.title,
    request.status,
    dispute.category,
    dispute.description,
    dispute.status,
    dispute.resolution_outcome,
    dispute.resolution_note,
    dispute.resolved_at,
    dispute.created_at,
    dispute.opened_by,
    opener.full_name,
    opener.email,
    dispute.reported_user_id,
    reported.full_name,
    reported.email,
    dispute.resolved_by,
    resolver.full_name,
    restriction.restricted_until
  from public.request_disputes as dispute
  join public.requests as request on request.id = dispute.request_id
  join public.profiles as opener on opener.id = dispute.opened_by
  join public.profiles as reported on reported.id = dispute.reported_user_id
  left join public.profiles as resolver on resolver.id = dispute.resolved_by
  left join public.account_restrictions as restriction
    on restriction.account_id = dispute.reported_user_id
   and restriction.restricted_until > now()
  where status_value = 'ALL' or dispute.status = status_value
  order by
    case when dispute.status = 'OPEN' then 0 else 1 end,
    dispute.created_at desc,
    dispute.id
  limit safe_limit
  offset safe_offset;
end;
$$;

create or replace function public.admin_list_audit_events(
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id bigint,
  admin_id uuid,
  admin_name text,
  admin_email text,
  action text,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  safe_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  safe_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if (select auth.uid()) is null
    or (select private.current_profile_role()) is distinct from 'admin' then
    raise exception 'Only an Admin can view audit events';
  end if;

  return query
  select
    event.id,
    event.admin_id,
    admin_profile.full_name,
    admin_profile.email,
    event.action,
    event.entity_type,
    event.entity_id,
    event.details,
    event.created_at
  from public.admin_audit_events as event
  join public.profiles as admin_profile on admin_profile.id = event.admin_id
  order by event.created_at desc, event.id desc
  limit safe_limit
  offset safe_offset;
end;
$$;

revoke all on function public.admin_get_dashboard_summary()
from public, anon;
revoke all on function public.admin_list_accounts(text, integer, integer)
from public, anon;
revoke all on function public.admin_list_requests(text, text, integer, integer)
from public, anon;
revoke all on function public.admin_list_disputes(text, integer, integer)
from public, anon;
revoke all on function public.admin_list_audit_events(integer, integer)
from public, anon;

grant execute on function public.admin_get_dashboard_summary()
to authenticated;
grant execute on function public.admin_list_accounts(text, integer, integer)
to authenticated;
grant execute on function public.admin_list_requests(text, text, integer, integer)
to authenticated;
grant execute on function public.admin_list_disputes(text, integer, integer)
to authenticated;
grant execute on function public.admin_list_audit_events(integer, integer)
to authenticated;

revoke all on function private.audit_admin_dispute_resolution()
from public, anon, authenticated;
revoke all on function private.audit_admin_account_restriction()
from public, anon, authenticated;

comment on table public.admin_audit_events is
'Append-only operational trail for protected Admin dispute and restriction actions.';

comment on function public.admin_get_dashboard_summary() is
'Returns marketplace operations counts only to an authenticated Admin.';

comment on function public.admin_list_accounts(text, integer, integer) is
'Returns a limited operational account directory only to an authenticated Admin.';

comment on function public.admin_list_requests(text, text, integer, integer) is
'Returns request oversight rows without private exact locations only to an Admin.';

comment on function public.admin_list_disputes(text, integer, integer) is
'Returns the protected dispute review queue only to an authenticated Admin.';

comment on function public.admin_list_audit_events(integer, integer) is
'Returns protected Admin action history only to an authenticated Admin.';

commit;
