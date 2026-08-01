-- ButuanGo self-service account-deletion requests and audited anonymization.
-- Run after supabase/migrations/019_account_lifecycle.sql.

begin;

alter table public.profiles
add column if not exists anonymized_at timestamptz;

-- An anonymized identity keeps its protected database references but receives
-- no Requestor, Runner, or Admin authorization from application RPCs.
create or replace function private.current_profile_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when onboarding_completed_at is not null
      and anonymized_at is null then active_role
    else null
  end
  from public.profiles
  where id = (select auth.uid());
$$;

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'PENDING' check (
    status in ('PENDING', 'CANCELLED', 'COMPLETED')
  ),
  reason text check (
    reason is null or char_length(trim(reason)) between 2 and 500
  ),
  requested_at timestamptz not null default now(),
  scheduled_for timestamptz not null default (now() + interval '7 days'),
  cancelled_at timestamptz,
  completed_at timestamptz,
  processed_by uuid references public.profiles(id) on delete restrict,
  updated_at timestamptz not null default now(),
  constraint account_deletion_requests_schedule check (
    scheduled_for >= requested_at + interval '7 days'
  ),
  constraint account_deletion_requests_status_shape check (
    (
      status = 'PENDING'
      and cancelled_at is null
      and completed_at is null
      and processed_by is null
    )
    or
    (
      status = 'CANCELLED'
      and cancelled_at is not null
      and completed_at is null
      and processed_by is null
    )
    or
    (
      status = 'COMPLETED'
      and cancelled_at is null
      and completed_at is not null
      and processed_by is not null
    )
  )
);

create unique index if not exists account_deletion_requests_one_pending_idx
on public.account_deletion_requests (account_id)
where status = 'PENDING';

create index if not exists account_deletion_requests_queue_idx
on public.account_deletion_requests (status, scheduled_for, requested_at);

drop trigger if exists account_deletion_requests_set_updated_at
on public.account_deletion_requests;
create trigger account_deletion_requests_set_updated_at
before update on public.account_deletion_requests
for each row execute function public.set_updated_at();

alter table public.account_deletion_requests enable row level security;

drop policy if exists "Users can read their deletion requests"
on public.account_deletion_requests;
create policy "Users can read their deletion requests"
on public.account_deletion_requests for select to authenticated
using (account_id = (select auth.uid()));

revoke all on table public.account_deletion_requests
from public, anon, authenticated;
grant select on table public.account_deletion_requests to authenticated;

create or replace function private.account_deletion_blockers(
  p_account_id uuid
)
returns table (
  active_request_count bigint,
  open_dispute_count bigint,
  open_report_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      select count(*)
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
    ),
    (
      select count(*)
      from public.request_disputes
      where (
        opened_by = p_account_id
        or reported_user_id = p_account_id
      )
        and status = 'OPEN'
    ),
    (
      select count(*)
      from public.account_reports
      where (
        reporter_id = p_account_id
        or reported_user_id = p_account_id
      )
        and status = 'OPEN'
    );
$$;

-- A pending voluntary deletion blocks new marketplace commitments while still
-- allowing the user to complete existing responsibilities during the window.
create or replace function private.account_is_restricted(p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.account_access_level(p_account_id) is not null
    or exists (
      select 1
      from public.account_deletion_requests
      where account_id = p_account_id
        and status = 'PENDING'
    );
$$;

create or replace function public.get_my_account_deletion_request()
returns table (
  id uuid,
  status text,
  reason text,
  requested_at timestamptz,
  scheduled_for timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  active_request_count bigint,
  open_dispute_count bigint,
  open_report_count bigint,
  eligible_for_completion boolean
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
    deletion.id,
    deletion.status,
    deletion.reason,
    deletion.requested_at,
    deletion.scheduled_for,
    deletion.cancelled_at,
    deletion.completed_at,
    blockers.active_request_count,
    blockers.open_dispute_count,
    blockers.open_report_count,
    deletion.status = 'PENDING'
      and deletion.scheduled_for <= now()
      and blockers.active_request_count = 0
      and blockers.open_dispute_count = 0
      and blockers.open_report_count = 0
  from public.account_deletion_requests as deletion
  cross join lateral private.account_deletion_blockers(
    deletion.account_id
  ) as blockers
  where deletion.account_id = caller_id
  order by deletion.requested_at desc
  limit 1;
end;
$$;

create or replace function public.request_account_deletion(
  p_confirmation text,
  p_reason text default null
)
returns public.account_deletion_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  caller_profile public.profiles%rowtype;
  blockers record;
  created_request public.account_deletion_requests%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication is required';
  end if;

  select *
  into caller_profile
  from public.profiles
  where id = caller_id
  for update;

  if caller_profile.id is null then
    raise exception 'Your account profile was not found';
  end if;
  if caller_profile.role = 'admin' then
    raise exception 'Admin accounts cannot use self-service deletion';
  end if;
  if caller_profile.anonymized_at is not null then
    raise exception 'This account has already been anonymized';
  end if;
  if p_confirmation is distinct from 'DELETE MY ACCOUNT' then
    raise exception 'Type DELETE MY ACCOUNT to confirm';
  end if;
  if p_reason is not null
    and nullif(trim(p_reason), '') is not null
    and char_length(trim(p_reason)) not between 2 and 500 then
    raise exception 'The optional reason must contain 2 to 500 characters';
  end if;
  if exists (
    select 1
    from public.account_deletion_requests
    where account_id = caller_id
      and status = 'PENDING'
  ) then
    raise exception 'An account-deletion request is already pending';
  end if;

  select * into blockers
  from private.account_deletion_blockers(caller_id);

  if blockers.active_request_count > 0 then
    raise exception 'Finish or cancel all active requests before requesting account deletion';
  end if;
  if blockers.open_dispute_count > 0 then
    raise exception 'Resolve all open disputes before requesting account deletion';
  end if;
  if blockers.open_report_count > 0 then
    raise exception 'Open safety reports must be reviewed before requesting account deletion';
  end if;

  insert into public.account_deletion_requests (
    account_id,
    reason
  )
  values (
    caller_id,
    nullif(trim(p_reason), '')
  )
  returning * into created_request;

  return created_request;
end;
$$;

create or replace function public.cancel_account_deletion()
returns public.account_deletion_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  cancelled_request public.account_deletion_requests%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication is required';
  end if;

  update public.account_deletion_requests
  set
    status = 'CANCELLED',
    cancelled_at = now()
  where account_id = caller_id
    and status = 'PENDING'
    and scheduled_for > now()
  returning * into cancelled_request;

  if cancelled_request.id is null then
    raise exception 'No cancellable account-deletion request was found';
  end if;

  return cancelled_request;
end;
$$;

create or replace function public.admin_list_account_deletion_requests(
  p_status text default 'PENDING',
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  account_id uuid,
  full_name text,
  email text,
  role text,
  status text,
  reason text,
  requested_at timestamptz,
  scheduled_for timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  processed_by uuid,
  active_request_count bigint,
  open_dispute_count bigint,
  open_report_count bigint,
  eligible_for_completion boolean
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
    raise exception 'Only an Admin can review account-deletion requests';
  end if;
  if p_status is null
    or p_status not in ('PENDING', 'CANCELLED', 'COMPLETED', 'ALL') then
    raise exception 'Choose a valid account-deletion status';
  end if;

  return query
  select
    deletion.id,
    deletion.account_id,
    profile.full_name,
    profile.email,
    profile.role,
    deletion.status,
    deletion.reason,
    deletion.requested_at,
    deletion.scheduled_for,
    deletion.cancelled_at,
    deletion.completed_at,
    deletion.processed_by,
    blockers.active_request_count,
    blockers.open_dispute_count,
    blockers.open_report_count,
    deletion.status = 'PENDING'
      and deletion.scheduled_for <= now()
      and blockers.active_request_count = 0
      and blockers.open_dispute_count = 0
      and blockers.open_report_count = 0
  from public.account_deletion_requests as deletion
  join public.profiles as profile on profile.id = deletion.account_id
  cross join lateral private.account_deletion_blockers(
    deletion.account_id
  ) as blockers
  where p_status = 'ALL' or deletion.status = p_status
  order by
    case when deletion.status = 'PENDING' then 0 else 1 end,
    deletion.scheduled_for,
    deletion.requested_at desc
  limit safe_limit
  offset safe_offset;
end;
$$;

-- Permit only the controlled anonymization RPC to replace protected identity
-- fields. Normal profile updates remain restricted as before.
create or replace function public.prevent_profile_security_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  onboarding_allowed boolean :=
    coalesce(
      current_setting('butuango.allow_onboarding_completion', true),
      ''
    ) = 'true';
  role_switch_allowed boolean :=
    coalesce(current_setting('butuango.allow_role_switch', true), '') = 'true';
  anonymization_allowed boolean :=
    coalesce(
      current_setting('butuango.allow_account_anonymization', true),
      ''
    ) = 'true';
begin
  if anonymization_allowed then
    if new.id is distinct from old.id
      or new.role is distinct from old.role
      or new.active_role is distinct from old.active_role
      or new.signup_method is distinct from old.signup_method
      or new.onboarding_completed_at is distinct from old.onboarding_completed_at
      or new.terms_accepted_at is distinct from old.terms_accepted_at
      or new.terms_version is distinct from old.terms_version
      or new.created_at is distinct from old.created_at then
      raise exception 'Account anonymization cannot change protected history';
    end if;
    return new;
  end if;

  if old.anonymized_at is not null then
    raise exception 'An anonymized profile cannot be changed';
  end if;

  if new.id is distinct from old.id
    or new.email is distinct from old.email
    or new.signup_method is distinct from old.signup_method
    or new.anonymized_at is distinct from old.anonymized_at then
    raise exception 'Profile identity, email, signup method, and deletion state cannot be changed';
  end if;

  if new.role is distinct from old.role and not onboarding_allowed then
    raise exception 'Registration role can only be set during secure onboarding';
  end if;

  if new.active_role is distinct from old.active_role
    and not role_switch_allowed
    and not onboarding_allowed then
    raise exception 'Active role can only be changed through a secure workflow';
  end if;

  if (
    new.onboarding_completed_at is distinct from old.onboarding_completed_at
    or new.terms_accepted_at is distinct from old.terms_accepted_at
    or new.terms_version is distinct from old.terms_version
  ) and not onboarding_allowed then
    raise exception 'Onboarding and Terms records cannot be changed directly';
  end if;

  return new;
end;
$$;

create or replace function public.sync_google_profile_avatar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  google_avatar_url text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'picture'), '')
  );
begin
  if coalesce(new.raw_app_meta_data ->> 'provider', '') = 'google'
    or coalesce(new.raw_app_meta_data -> 'providers', '[]'::jsonb)
      ? 'google' then
    update public.profiles
    set avatar_url = google_avatar_url
    where id = new.id
      and anonymized_at is null
      and avatar_url is distinct from google_avatar_url;
  end if;

  return new;
end;
$$;

alter table public.admin_audit_events
drop constraint if exists admin_audit_events_action_check;
alter table public.admin_audit_events
add constraint admin_audit_events_action_check check (
  action in (
    'DISPUTE_RESOLVED',
    'ACCOUNT_RESTRICTED',
    'ACCOUNT_RESTRICTION_UPDATED',
    'ACCOUNT_RESTRICTION_CLEARED',
    'ACCOUNT_REPORT_RESOLVED',
    'ACCOUNT_ANONYMIZED'
  )
);

alter table public.admin_audit_events
drop constraint if exists admin_audit_events_entity_type_check;
alter table public.admin_audit_events
add constraint admin_audit_events_entity_type_check check (
  entity_type in (
    'request_dispute',
    'account_restriction',
    'account_report',
    'account_deletion_request'
  )
);

create or replace function public.admin_complete_account_anonymization(
  p_deletion_request_id uuid,
  p_confirmation text
)
returns public.account_deletion_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_id uuid := (select auth.uid());
  deletion_request public.account_deletion_requests%rowtype;
  target_profile public.profiles%rowtype;
  blockers record;
  completed_request public.account_deletion_requests%rowtype;
begin
  if admin_id is null
    or (select private.current_profile_role()) is distinct from 'admin' then
    raise exception 'Only an Admin can complete account anonymization';
  end if;
  if p_confirmation is distinct from 'ANONYMIZE' then
    raise exception 'Type ANONYMIZE to confirm';
  end if;

  select *
  into deletion_request
  from public.account_deletion_requests
  where id = p_deletion_request_id
  for update;

  if deletion_request.id is null then
    raise exception 'The account-deletion request was not found';
  end if;
  if deletion_request.status <> 'PENDING' then
    raise exception 'This account-deletion request is no longer pending';
  end if;
  if deletion_request.scheduled_for > now() then
    raise exception 'The seven-day cancellation window has not ended';
  end if;

  select *
  into target_profile
  from public.profiles
  where id = deletion_request.account_id
  for update;

  if target_profile.id is null or target_profile.role = 'admin' then
    raise exception 'The target account cannot be anonymized';
  end if;

  select * into blockers
  from private.account_deletion_blockers(deletion_request.account_id);

  if blockers.active_request_count > 0
    or blockers.open_dispute_count > 0
    or blockers.open_report_count > 0 then
    raise exception 'Resolve the listed account blockers before anonymization';
  end if;

  delete from public.saved_addresses
  where user_id = deletion_request.account_id;

  delete from public.account_blocks
  where blocker_id = deletion_request.account_id
     or blocked_user_id = deletion_request.account_id;

  delete from public.notifications
  where user_id = deletion_request.account_id;

  update public.request_ratings
  set comment = null
  where reviewer_id = deletion_request.account_id;

  update public.request_locations as location
  set
    pickup_address = case
      when location.pickup_address is null then null
      else 'Address removed'
    end,
    pickup_landmark = null,
    pickup_instructions = null,
    delivery_address = case
      when location.delivery_address is null then null
      else 'Address removed'
    end,
    delivery_landmark = null,
    delivery_instructions = null,
    contact_name = 'Deleted User',
    contact_phone = 'Removed'
  from public.requests as request
  where request.id = location.request_id
    and request.requestor_id = deletion_request.account_id;

  update public.request_payment_details as payment
  set
    payer_name = null,
    payer_phone = null
  from public.requests as request
  where request.id = payment.request_id
    and request.requestor_id = deletion_request.account_id;

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
    deletion_request.account_id,
    'Voluntary account deletion completed; application access is permanently disabled.',
    null,
    null,
    null,
    'BANNED',
    admin_id
  )
  on conflict (account_id) do update set
    reason = case
      when public.account_restrictions.access_level = 'BANNED'
        then public.account_restrictions.reason
      else excluded.reason
    end,
    source_dispute_id = case
      when public.account_restrictions.access_level = 'BANNED'
        then public.account_restrictions.source_dispute_id
      else null
    end,
    source_report_id = case
      when public.account_restrictions.access_level = 'BANNED'
        then public.account_restrictions.source_report_id
      else null
    end,
    restricted_until = null,
    access_level = 'BANNED',
    created_by = case
      when public.account_restrictions.access_level = 'BANNED'
        then public.account_restrictions.created_by
      else admin_id
    end,
    updated_at = now();

  perform set_config('butuango.allow_account_anonymization', 'true', true);

  update public.profiles
  set
    full_name = 'Deleted User',
    email = 'deleted+' || replace(id::text, '-', '') || '@butuango.invalid',
    phone_number = null,
    avatar_url = null,
    anonymized_at = now()
  where id = deletion_request.account_id;

  update public.account_deletion_requests
  set
    status = 'COMPLETED',
    reason = null,
    completed_at = now(),
    processed_by = admin_id
  where id = deletion_request.id
  returning * into completed_request;

  insert into public.admin_audit_events (
    admin_id,
    action,
    entity_type,
    entity_id,
    details
  )
  values (
    admin_id,
    'ACCOUNT_ANONYMIZED',
    'account_deletion_request',
    deletion_request.id,
    jsonb_build_object(
      'account_id', deletion_request.account_id,
      'requested_at', deletion_request.requested_at,
      'scheduled_for', deletion_request.scheduled_for
    )
  );

  return completed_request;
end;
$$;

create or replace function private.protect_anonymized_account_control()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid := case when tg_op = 'DELETE' then old.account_id else new.account_id end;
begin
  if exists (
    select 1
    from public.profiles
    where id = target_id
      and anonymized_at is not null
  ) then
    raise exception 'An anonymized account control cannot be changed or restored';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists account_restrictions_protect_anonymized
on public.account_restrictions;
create trigger account_restrictions_protect_anonymized
before update or delete on public.account_restrictions
for each row execute function private.protect_anonymized_account_control();

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
  anonymized_at timestamptz,
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
    profile.anonymized_at,
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

revoke all on function private.account_deletion_blockers(uuid)
from public, anon, authenticated;
revoke all on function private.protect_anonymized_account_control()
from public, anon, authenticated;
revoke all on function public.get_my_account_deletion_request()
from public, anon;
revoke all on function public.request_account_deletion(text, text)
from public, anon;
revoke all on function public.cancel_account_deletion()
from public, anon;
revoke all on function public.admin_list_account_deletion_requests(text, integer, integer)
from public, anon;
revoke all on function public.admin_complete_account_anonymization(uuid, text)
from public, anon;
revoke all on function public.admin_list_accounts(text, integer, integer)
from public, anon;

grant execute on function public.get_my_account_deletion_request()
to authenticated;
grant execute on function public.request_account_deletion(text, text)
to authenticated;
grant execute on function public.cancel_account_deletion()
to authenticated;
grant execute on function public.admin_list_account_deletion_requests(text, integer, integer)
to authenticated;
grant execute on function public.admin_complete_account_anonymization(uuid, text)
to authenticated;
grant execute on function public.admin_list_accounts(text, integer, integer)
to authenticated;

comment on table public.account_deletion_requests is
'Self-service account deletion requests with a seven-day cancellation period and Admin-completed pseudonymous anonymization.';

comment on column public.profiles.anonymized_at is
'When the ButuanGo application profile was replaced with a non-identifying transaction-history placeholder.';

comment on function public.admin_complete_account_anonymization(uuid, text) is
'After the cancellation window and blocker checks, removes reusable personal data, pseudonymizes the profile, permanently disables marketplace writes, and records the Admin action.';

commit;
