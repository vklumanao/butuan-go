-- ButuanGo account lifecycle controls: marketplace restriction, read-only
-- suspension, permanent ban, and audited restoration.
-- Run after supabase/migrations/018_trust_features.sql.

begin;

alter table public.account_restrictions
add column if not exists access_level text not null default 'RESTRICTED';

alter table public.account_restrictions
drop constraint if exists account_restrictions_access_level_check;
alter table public.account_restrictions
add constraint account_restrictions_access_level_check check (
  access_level in ('RESTRICTED', 'SUSPENDED', 'BANNED')
);

alter table public.account_restrictions
drop constraint if exists account_restrictions_future_window;
alter table public.account_restrictions
alter column restricted_until drop not null;
alter table public.account_restrictions
drop constraint if exists account_restrictions_duration_shape;
alter table public.account_restrictions
add constraint account_restrictions_duration_shape check (
  (access_level = 'BANNED' and restricted_until is null)
  or
  (
    access_level in ('RESTRICTED', 'SUSPENDED')
    and restricted_until is not null
    and restricted_until > created_at
  )
);

create or replace function private.normalize_account_access_control()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.access_level = 'BANNED' then
    new.restricted_until := null;
  elsif new.restricted_until is null then
    raise exception 'Temporary account controls require an end date';
  end if;

  return new;
end;
$$;

drop trigger if exists account_restrictions_normalize_access_control
on public.account_restrictions;
create trigger account_restrictions_normalize_access_control
before insert or update on public.account_restrictions
for each row execute function private.normalize_account_access_control();

create or replace function private.account_access_level(p_account_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select access_level
  from public.account_restrictions
  where account_id = p_account_id
    and (
      access_level = 'BANNED'
      or restricted_until > now()
    );
$$;

create or replace function private.account_is_restricted(p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.account_access_level(p_account_id) is not null;
$$;

create or replace function private.account_is_read_only(p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    private.account_access_level(p_account_id) in ('SUSPENDED', 'BANNED'),
    false
  );
$$;

create or replace function private.enforce_account_read_only()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  caller_access text;
begin
  if caller_id is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  caller_access := private.account_access_level(caller_id);
  if caller_access in ('SUSPENDED', 'BANNED') then
    raise exception 'This account is read-only because it is %',
      case
        when caller_access = 'BANNED' then 'permanently banned'
        else 'suspended'
      end;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists requests_enforce_account_read_only
on public.requests;
create trigger requests_enforce_account_read_only
before insert or update or delete on public.requests
for each row execute function private.enforce_account_read_only();

drop trigger if exists request_locations_enforce_account_read_only
on public.request_locations;
create trigger request_locations_enforce_account_read_only
before insert or update or delete on public.request_locations
for each row execute function private.enforce_account_read_only();

drop trigger if exists saved_addresses_enforce_account_read_only
on public.saved_addresses;
create trigger saved_addresses_enforce_account_read_only
before insert or update or delete on public.saved_addresses
for each row execute function private.enforce_account_read_only();

drop trigger if exists request_payment_terms_enforce_account_read_only
on public.request_payment_terms;
create trigger request_payment_terms_enforce_account_read_only
before insert or update or delete on public.request_payment_terms
for each row execute function private.enforce_account_read_only();

drop trigger if exists request_payment_details_enforce_account_read_only
on public.request_payment_details;
create trigger request_payment_details_enforce_account_read_only
before insert or update or delete on public.request_payment_details
for each row execute function private.enforce_account_read_only();

drop trigger if exists request_price_changes_enforce_account_read_only
on public.request_price_changes;
create trigger request_price_changes_enforce_account_read_only
before insert or update or delete on public.request_price_changes
for each row execute function private.enforce_account_read_only();

drop trigger if exists request_receipts_enforce_account_read_only
on public.request_receipts;
create trigger request_receipts_enforce_account_read_only
before insert or update or delete on public.request_receipts
for each row execute function private.enforce_account_read_only();

drop trigger if exists request_handoffs_enforce_account_read_only
on public.request_handoffs;
create trigger request_handoffs_enforce_account_read_only
before insert or update or delete on public.request_handoffs
for each row execute function private.enforce_account_read_only();

drop trigger if exists request_settlements_enforce_account_read_only
on public.request_settlements;
create trigger request_settlements_enforce_account_read_only
before insert or update or delete on public.request_settlements
for each row execute function private.enforce_account_read_only();

drop trigger if exists request_failures_enforce_account_read_only
on public.request_failures;
create trigger request_failures_enforce_account_read_only
before insert or update or delete on public.request_failures
for each row execute function private.enforce_account_read_only();

drop trigger if exists request_ratings_enforce_account_read_only
on public.request_ratings;
create trigger request_ratings_enforce_account_read_only
before insert or update or delete on public.request_ratings
for each row execute function private.enforce_account_read_only();

-- Suspended and banned users retain read access and may still create a private
-- safety report or transaction dispute. Receipt file writes are read-only.
drop policy if exists "Assigned runners can upload receipt files"
on storage.objects;
create policy "Assigned runners can upload receipt files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'request-receipts'
  and not private.account_is_read_only((select auth.uid()))
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1
    from public.requests as request
    where request.id::text = (storage.foldername(name))[1]
      and request.runner_id = (select auth.uid())
      and request.status = 'IN_PROGRESS'
  )
);

drop policy if exists "Assigned runners can remove receipt files"
on storage.objects;
create policy "Assigned runners can remove receipt files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'request-receipts'
  and not private.account_is_read_only((select auth.uid()))
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1
    from public.requests as request
    where request.id::text = (storage.foldername(name))[1]
      and request.runner_id = (select auth.uid())
      and request.status = 'IN_PROGRESS'
  )
);

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
    'REQUEST_CANCELLED',
    'PRICE_CHANGE_REQUESTED',
    'PRICE_CHANGE_APPROVED',
    'PRICE_CHANGE_DECLINED',
    'HANDOFF_VERIFIED',
    'PAYMENT_CONFIRMED',
    'REQUEST_FAILED',
    'FAILURE_ACKNOWLEDGED',
    'DISPUTE_OPENED',
    'DISPUTE_WITHDRAWN',
    'DISPUTE_RESOLVED',
    'ACCOUNT_RESTRICTED',
    'RATING_RECEIVED',
    'SAFETY_REPORT_RESOLVED',
    'ACCOUNT_ACCESS_CHANGED'
  )
);

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
      'access_level', old.access_level,
      'restricted_until', old.restricted_until,
      'source_dispute_id', old.source_dispute_id,
      'source_report_id', old.source_report_id
    );
  elsif tg_op = 'UPDATE' then
    actor_id := new.created_by;
    target_id := new.account_id;
    audit_action := 'ACCOUNT_RESTRICTION_UPDATED';
    audit_details := jsonb_build_object(
      'previous_access_level', old.access_level,
      'access_level', new.access_level,
      'restricted_until', new.restricted_until,
      'source_dispute_id', new.source_dispute_id,
      'source_report_id', new.source_report_id
    );
  else
    actor_id := new.created_by;
    target_id := new.account_id;
    audit_action := 'ACCOUNT_RESTRICTED';
    audit_details := jsonb_build_object(
      'access_level', new.access_level,
      'restricted_until', new.restricted_until,
      'source_dispute_id', new.source_dispute_id,
      'source_report_id', new.source_report_id
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

create or replace function public.get_my_account_access()
returns table (
  access_level text,
  reason text,
  restricted_until timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null then
    raise exception 'Authentication is required';
  end if;

  return query
  select
    control.access_level,
    control.reason,
    control.restricted_until,
    control.created_at,
    control.updated_at
  from public.account_restrictions as control
  where control.account_id = caller_id
    and (
      control.access_level = 'BANNED'
      or control.restricted_until > now()
    );
end;
$$;

create or replace function public.admin_set_account_access(
  p_account_id uuid,
  p_access_level text,
  p_reason text,
  p_duration_days integer default null
)
returns public.account_restrictions
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_id uuid := (select auth.uid());
  target_profile public.profiles%rowtype;
  expires_at timestamptz;
  saved_control public.account_restrictions%rowtype;
begin
  if admin_id is null
    or (select private.current_profile_role()) is distinct from 'admin' then
    raise exception 'Only an Admin can manage account access';
  end if;

  select *
  into target_profile
  from public.profiles
  where id = p_account_id;

  if target_profile.id is null then
    raise exception 'The account was not found';
  end if;
  if target_profile.id = admin_id or target_profile.role = 'admin' then
    raise exception 'Admin accounts cannot be changed from this control';
  end if;

  if p_access_level is null
    or p_access_level not in ('RESTRICTED', 'SUSPENDED', 'BANNED') then
    raise exception 'Choose a valid account access level';
  end if;

  if char_length(trim(coalesce(p_reason, ''))) not between 10 and 1000 then
    raise exception 'Enter a factual reason with 10 to 1000 characters';
  end if;

  if p_access_level = 'BANNED' then
    if coalesce(p_duration_days, 0) <> 0 then
      raise exception 'A permanent ban does not use a duration';
    end if;
    expires_at := null;
  else
    if p_duration_days is null
      or p_duration_days < 1
      or p_duration_days > 365 then
      raise exception 'Temporary controls require 1 to 365 days';
    end if;
    expires_at := now() + make_interval(days => p_duration_days);
  end if;

  if p_access_level in ('SUSPENDED', 'BANNED')
    and exists (
      select 1
      from public.requests
      where (
        requestor_id = p_account_id
        or runner_id = p_account_id
      )
        and status in (
          'OPEN',
          'ACCEPTED',
          'IN_PROGRESS',
          'AWAITING_CONFIRMATION'
        )
    ) then
    raise exception 'Use a restriction first. Suspension or ban requires all unfinished requests to be resolved';
  end if;

  insert into public.account_restrictions (
    account_id,
    reason,
    source_dispute_id,
    source_report_id,
    restricted_until,
    access_level,
    created_by
  )
  values (
    p_account_id,
    trim(p_reason),
    null,
    null,
    expires_at,
    p_access_level,
    admin_id
  )
  on conflict (account_id) do update set
    reason = excluded.reason,
    restricted_until = excluded.restricted_until,
    access_level = excluded.access_level,
    created_by = excluded.created_by,
    updated_at = now()
  returning * into saved_control;

  insert into public.notifications (
    user_id,
    type,
    target_role,
    title,
    message
  )
  values (
    p_account_id,
    'ACCOUNT_ACCESS_CHANGED',
    target_profile.active_role,
    case p_access_level
      when 'RESTRICTED' then 'Marketplace activity restricted'
      when 'SUSPENDED' then 'Account suspended'
      else 'Account permanently banned'
    end,
    case p_access_level
      when 'BANNED' then
        'Your account is permanently read-only. Open your account for the recorded reason and safety guidance.'
      else
        format(
          'Your account access changed until %s. Open your account for the recorded reason.',
          expires_at
        )
    end
  );

  return saved_control;
end;
$$;

create or replace function public.admin_restore_account_access(
  p_account_id uuid
)
returns public.account_restrictions
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_id uuid := (select auth.uid());
  target_profile public.profiles%rowtype;
  deleted_control public.account_restrictions%rowtype;
begin
  if admin_id is null
    or (select private.current_profile_role()) is distinct from 'admin' then
    raise exception 'Only an Admin can restore account access';
  end if;

  select *
  into target_profile
  from public.profiles
  where id = p_account_id;

  if target_profile.id is null then
    raise exception 'The account was not found';
  end if;
  if target_profile.id = admin_id or target_profile.role = 'admin' then
    raise exception 'Admin accounts cannot be changed from this control';
  end if;

  delete from public.account_restrictions
  where account_id = p_account_id
  returning * into deleted_control;

  if deleted_control.account_id is null then
    raise exception 'No active account control was found';
  end if;

  insert into public.notifications (
    user_id,
    type,
    target_role,
    title,
    message
  )
  values (
    p_account_id,
    'ACCOUNT_ACCESS_CHANGED',
    target_profile.active_role,
    'Account access restored',
    'An Admin restored your marketplace access. Normal account controls now apply.'
  );

  return deleted_control;
end;
$$;

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
    raise exception 'Only an Admin can view the dashboard summary';
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
    (select count(*) from public.requests where status = 'OPEN'),
    (
      select count(*)
      from public.requests
      where status in ('ACCEPTED', 'IN_PROGRESS', 'AWAITING_CONFIRMATION')
    ),
    (select count(*) from public.requests where status = 'COMPLETED'),
    (select count(*) from public.requests where status = 'FAILED'),
    (
      select count(*)
      from public.request_disputes
      where status = 'OPEN'
    ),
    (
      select count(*)
      from public.account_restrictions
      where access_level = 'BANNED'
         or restricted_until > now()
    );
end;
$$;

drop function if exists public.admin_list_accounts(text, integer, integer);
create function public.admin_list_accounts(
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
  access_level text,
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
    control.reason,
    control.access_level,
    control.restricted_until
  from public.profiles as profile
  left join public.account_restrictions as control
    on control.account_id = profile.id
   and (
     control.access_level = 'BANNED'
     or control.restricted_until > now()
   )
  where search_value is null
     or profile.full_name ilike '%' || search_value || '%'
     or profile.email ilike '%' || search_value || '%'
     or profile.id::text = search_value
  order by profile.created_at desc, profile.id
  limit safe_limit
  offset safe_offset;
end;
$$;

revoke all on function private.normalize_account_access_control()
from public, anon, authenticated;
revoke all on function private.account_access_level(uuid)
from public, anon, authenticated;
revoke all on function private.account_is_restricted(uuid)
from public, anon, authenticated;
revoke all on function private.account_is_read_only(uuid)
from public, anon, authenticated;
grant execute on function private.account_is_read_only(uuid)
to authenticated;
revoke all on function private.enforce_account_read_only()
from public, anon, authenticated;
revoke all on function private.audit_admin_account_restriction()
from public, anon, authenticated;

revoke all on function public.get_my_account_access()
from public, anon;
revoke all on function public.admin_set_account_access(uuid, text, text, integer)
from public, anon;
revoke all on function public.admin_restore_account_access(uuid)
from public, anon;
revoke all on function public.admin_list_accounts(text, integer, integer)
from public, anon;

grant execute on function public.get_my_account_access()
to authenticated;
grant execute on function public.admin_set_account_access(uuid, text, text, integer)
to authenticated;
grant execute on function public.admin_restore_account_access(uuid)
to authenticated;
grant execute on function public.admin_list_accounts(text, integer, integer)
to authenticated;

comment on column public.account_restrictions.access_level is
'RESTRICTED blocks new marketplace activity; SUSPENDED and BANNED make marketplace data read-only. BANNED has no expiration.';

comment on function public.admin_set_account_access(uuid, text, text, integer) is
'Applies an audited account control. Suspension and ban are rejected while unfinished requests exist.';

comment on function public.admin_restore_account_access(uuid) is
'Deletes the active account control, records the existing restriction audit event, and notifies the account owner.';

commit;
