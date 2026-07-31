-- ButuanGo Milestone 4: handoff verification, settlement confirmation,
-- failed-delivery handling, disputes, and account restrictions.
-- Run after supabase/migrations/013_payment_evidence.sql.

begin;

alter table public.requests
add column if not exists failed_at timestamptz;

alter table public.requests
drop constraint if exists requests_status_check;
alter table public.requests
add constraint requests_status_check check (
  status in (
    'OPEN',
    'ACCEPTED',
    'IN_PROGRESS',
    'AWAITING_CONFIRMATION',
    'COMPLETED',
    'CANCELLED',
    'FAILED'
  )
);

alter table public.requests
drop constraint if exists requests_runner_matches_status;
alter table public.requests
add constraint requests_runner_matches_status check (
  (status in ('OPEN', 'CANCELLED') and runner_id is null)
  or
  (
    status in (
      'ACCEPTED',
      'IN_PROGRESS',
      'AWAITING_CONFIRMATION',
      'COMPLETED',
      'FAILED'
    )
    and runner_id is not null
  )
);

alter table public.requests
drop constraint if exists requests_lifecycle_timestamps;
alter table public.requests
add constraint requests_lifecycle_timestamps check (
  (status = 'OPEN'
    and accepted_at is null and started_at is null and submitted_at is null
    and completed_at is null and cancelled_at is null and failed_at is null)
  or
  (status = 'ACCEPTED'
    and accepted_at is not null and started_at is null and submitted_at is null
    and completed_at is null and cancelled_at is null and failed_at is null)
  or
  (status = 'IN_PROGRESS'
    and accepted_at is not null and started_at is not null and submitted_at is null
    and completed_at is null and cancelled_at is null and failed_at is null)
  or
  (status = 'AWAITING_CONFIRMATION'
    and accepted_at is not null and started_at is not null and submitted_at is not null
    and completed_at is null and cancelled_at is null and failed_at is null)
  or
  (status = 'COMPLETED'
    and accepted_at is not null and started_at is not null and submitted_at is not null
    and completed_at is not null and cancelled_at is null and failed_at is null)
  or
  (status = 'CANCELLED'
    and accepted_at is null and started_at is null and submitted_at is null
    and completed_at is null and cancelled_at is not null
    and cancellation_reason is not null and failed_at is null)
  or
  (status = 'FAILED'
    and accepted_at is not null and started_at is not null and submitted_at is null
    and completed_at is null and cancelled_at is null and failed_at is not null)
);

alter table public.request_updates
drop constraint if exists request_updates_from_status_check;
alter table public.request_updates
add constraint request_updates_from_status_check check (
  from_status is null
  or from_status in (
    'OPEN',
    'ACCEPTED',
    'IN_PROGRESS',
    'AWAITING_CONFIRMATION',
    'COMPLETED',
    'CANCELLED',
    'FAILED'
  )
);

alter table public.request_updates
drop constraint if exists request_updates_to_status_check;
alter table public.request_updates
add constraint request_updates_to_status_check check (
  to_status is null
  or to_status in (
    'OPEN',
    'ACCEPTED',
    'IN_PROGRESS',
    'AWAITING_CONFIRMATION',
    'COMPLETED',
    'CANCELLED',
    'FAILED'
  )
);

alter table public.notifications
add column if not exists target_role text;

alter table public.notifications
drop constraint if exists notifications_target_role_check;
alter table public.notifications
add constraint notifications_target_role_check check (
  target_role is null or target_role in ('requestor', 'runner', 'admin')
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
    'ACCOUNT_RESTRICTED'
  )
);

create table if not exists public.request_handoffs (
  request_id uuid primary key
    references public.requests(id) on delete cascade,
  handoff_code text not null check (handoff_code ~ '^[0-9]{6}$'),
  failed_attempts smallint not null default 0 check (
    failed_attempts between 0 and 5
  ),
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint request_handoffs_verification_shape check (
    (verified_at is null and verified_by is null)
    or
    (verified_at is not null and verified_by is not null)
  )
);

create table if not exists public.request_settlements (
  request_id uuid primary key
    references public.requests(id) on delete cascade,
  expected_amount numeric(12, 2) not null default 0 check (
    expected_amount >= 0 and expected_amount <= 9999999999.99
  ),
  runner_received_amount numeric(12, 2) check (
    runner_received_amount is null
    or (
      runner_received_amount >= 0
      and runner_received_amount <= 9999999999.99
    )
  ),
  runner_confirmed_at timestamptz,
  requestor_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint request_settlements_runner_confirmation_shape check (
    (
      runner_confirmed_at is null
      and runner_received_amount is null
      and requestor_confirmed_at is null
    )
    or
    (
      runner_confirmed_at is not null
      and runner_received_amount = expected_amount
    )
  ),
  constraint request_settlements_requestor_after_runner check (
    requestor_confirmed_at is null or runner_confirmed_at is not null
  )
);

create table if not exists public.request_failures (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique
    references public.requests(id) on delete cascade,
  reported_by uuid not null
    references public.profiles(id) on delete restrict,
  reason_code text not null check (
    reason_code in (
      'RECIPIENT_UNAVAILABLE',
      'WRONG_OR_INACCESSIBLE_ADDRESS',
      'PAYMENT_REFUSED',
      'ITEM_REJECTED',
      'UNSAFE_SITUATION',
      'OTHER'
    )
  ),
  description text not null check (
    char_length(trim(description)) between 10 and 1000
  ),
  acknowledged_at timestamptz,
  acknowledgment_note text check (
    acknowledgment_note is null
    or char_length(trim(acknowledgment_note)) between 2 and 500
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.request_disputes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null
    references public.requests(id) on delete cascade,
  opened_by uuid not null
    references public.profiles(id) on delete restrict,
  reported_user_id uuid not null
    references public.profiles(id) on delete restrict,
  category text not null check (
    category in (
      'ITEM_OR_SERVICE',
      'PAYMENT',
      'NO_SHOW',
      'SAFETY',
      'OTHER'
    )
  ),
  description text not null check (
    char_length(trim(description)) between 10 and 1500
  ),
  status text not null default 'OPEN' check (
    status in ('OPEN', 'WITHDRAWN', 'RESOLVED', 'DISMISSED')
  ),
  resolution_outcome text check (
    resolution_outcome is null
    or resolution_outcome in ('UPHELD', 'SETTLED', 'DISMISSED')
  ),
  resolution_note text check (
    resolution_note is null
    or char_length(trim(resolution_note)) between 5 and 1500
  ),
  resolved_by uuid references public.profiles(id) on delete restrict,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint request_disputes_parties_differ check (
    opened_by <> reported_user_id
  ),
  constraint request_disputes_resolution_shape check (
    (
      status = 'OPEN'
      and resolution_outcome is null
      and resolved_by is null
      and resolved_at is null
    )
    or
    (
      status = 'WITHDRAWN'
      and resolution_outcome is null
      and resolved_by is null
      and resolved_at is not null
    )
    or
    (
      status in ('RESOLVED', 'DISMISSED')
      and resolution_outcome is not null
      and resolved_by is not null
      and resolved_at is not null
    )
  )
);

create unique index if not exists request_disputes_one_open_idx
on public.request_disputes (request_id)
where status = 'OPEN';

create index if not exists request_disputes_reported_status_idx
on public.request_disputes (reported_user_id, status, created_at desc);

create table if not exists public.account_restrictions (
  account_id uuid primary key
    references public.profiles(id) on delete cascade,
  reason text not null check (
    char_length(trim(reason)) between 5 and 1000
  ),
  source_dispute_id uuid
    references public.request_disputes(id) on delete set null,
  restricted_until timestamptz not null,
  created_by uuid not null
    references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_restrictions_future_window check (
    restricted_until > created_at
  )
);

drop trigger if exists request_handoffs_set_updated_at
on public.request_handoffs;
create trigger request_handoffs_set_updated_at
before update on public.request_handoffs
for each row execute function public.set_updated_at();

drop trigger if exists request_settlements_set_updated_at
on public.request_settlements;
create trigger request_settlements_set_updated_at
before update on public.request_settlements
for each row execute function public.set_updated_at();

drop trigger if exists request_failures_set_updated_at
on public.request_failures;
create trigger request_failures_set_updated_at
before update on public.request_failures
for each row execute function public.set_updated_at();

drop trigger if exists request_disputes_set_updated_at
on public.request_disputes;
create trigger request_disputes_set_updated_at
before update on public.request_disputes
for each row execute function public.set_updated_at();

drop trigger if exists account_restrictions_set_updated_at
on public.account_restrictions;
create trigger account_restrictions_set_updated_at
before update on public.account_restrictions
for each row execute function public.set_updated_at();

alter table public.request_handoffs enable row level security;
alter table public.request_settlements enable row level security;
alter table public.request_failures enable row level security;
alter table public.request_disputes enable row level security;
alter table public.account_restrictions enable row level security;

-- Handoff codes are intentionally RPC-only so the assigned Runner can never
-- select the code. The state RPC conditionally reveals it to the Requestor.
revoke all on table public.request_handoffs from public, anon, authenticated;

drop policy if exists "Participants can read request settlements"
on public.request_settlements;
create policy "Participants can read request settlements"
on public.request_settlements for select to authenticated
using (
  exists (
    select 1
    from public.requests as request
    where request.id = request_settlements.request_id
      and (
        request.requestor_id = (select auth.uid())
        or request.runner_id = (select auth.uid())
      )
  )
);

drop policy if exists "Participants can read request failures"
on public.request_failures;
create policy "Participants can read request failures"
on public.request_failures for select to authenticated
using (
  exists (
    select 1
    from public.requests as request
    where request.id = request_failures.request_id
      and (
        request.requestor_id = (select auth.uid())
        or request.runner_id = (select auth.uid())
      )
  )
);

drop policy if exists "Participants and admins can read request disputes"
on public.request_disputes;
create policy "Participants and admins can read request disputes"
on public.request_disputes for select to authenticated
using (
  (select private.current_profile_role()) = 'admin'
  or exists (
    select 1
    from public.requests as request
    where request.id = request_disputes.request_id
      and (
        request.requestor_id = (select auth.uid())
        or request.runner_id = (select auth.uid())
      )
  )
);

drop policy if exists "Users and admins can read account restrictions"
on public.account_restrictions;
create policy "Users and admins can read account restrictions"
on public.account_restrictions for select to authenticated
using (
  account_id = (select auth.uid())
  or (select private.current_profile_role()) = 'admin'
);

revoke all on table public.request_settlements from public, anon, authenticated;
revoke all on table public.request_failures from public, anon, authenticated;
revoke all on table public.request_disputes from public, anon, authenticated;
revoke all on table public.account_restrictions from public, anon, authenticated;
grant select on table public.request_settlements to authenticated;
grant select on table public.request_failures to authenticated;
grant select on table public.request_disputes to authenticated;
grant select on table public.account_restrictions to authenticated;

create or replace function private.generate_handoff_code()
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  select lpad(
    (
      (
        ('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
          ::bit(32)::bigint
      ) % 1000000
    )::text,
    6,
    '0'
  );
$$;

create or replace function private.calculate_request_settlement(
  p_request_id uuid
)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select
    request.service_fee
    + case
        when terms.arrangement = 'RUNNER_ADVANCE' then coalesce(
          (
            select sum(receipt.purchase_amount)
            from public.request_receipts as receipt
            where receipt.request_id = request.id
          ),
          0
        )
        else 0
      end
  from public.requests as request
  join public.request_payment_terms as terms
    on terms.request_id = request.id
  where request.id = p_request_id;
$$;

create or replace function private.account_is_restricted(p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.account_restrictions
    where account_id = p_account_id
      and restricted_until > now()
  );
$$;

create or replace function private.enforce_request_account_restrictions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
    and private.account_is_restricted(new.requestor_id) then
    raise exception 'This account is temporarily restricted from creating requests';
  end if;

  if tg_op = 'UPDATE'
    and old.status = 'OPEN'
    and new.status = 'ACCEPTED'
    and private.account_is_restricted(new.runner_id) then
    raise exception 'This account is temporarily restricted from accepting requests';
  end if;

  return new;
end;
$$;

drop trigger if exists requests_enforce_account_restrictions
on public.requests;
create trigger requests_enforce_account_restrictions
before insert or update on public.requests
for each row execute function private.enforce_request_account_restrictions();

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
    or (old.status = 'IN_PROGRESS' and new.status in ('AWAITING_CONFIRMATION', 'FAILED'))
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
  if new.failed_at is distinct from old.failed_at
    and not (
      old.status = 'IN_PROGRESS'
      and new.status = 'FAILED'
      and new.failed_at is not null
    ) then
    raise exception 'failed_at can only be set when an in-progress delivery fails';
  end if;

  return new;
end;
$$;

create or replace function public.start_request_with_payment_terms(
  p_request_id uuid
)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment_terms public.request_payment_terms%rowtype;
  updated_request public.requests%rowtype;
begin
  select *
  into payment_terms
  from public.request_payment_terms
  where request_id = p_request_id;

  if payment_terms.request_id is null then
    raise exception 'This task has no payment arrangement';
  end if;

  if payment_terms.arrangement = 'RUNNER_ADVANCE'
    and (
      payment_terms.runner_consented_at is null
      or payment_terms.runner_consented_amount
        is distinct from payment_terms.maximum_advance
    ) then
    raise exception 'Confirm the cash advance before starting this task';
  end if;

  updated_request := public.start_request(p_request_id);

  insert into public.request_handoffs (request_id, handoff_code)
  values (updated_request.id, private.generate_handoff_code())
  on conflict (request_id) do nothing;

  insert into public.request_settlements (request_id, expected_amount)
  values (
    updated_request.id,
    private.calculate_request_settlement(updated_request.id)
  )
  on conflict (request_id) do nothing;

  return updated_request;
end;
$$;

-- Existing tasks that already passed completion submission are trusted legacy
-- handoffs. Existing IN_PROGRESS tasks must complete the new Phase 3 steps.
insert into public.request_handoffs (
  request_id,
  handoff_code,
  verified_at,
  verified_by
)
select
  request.id,
  private.generate_handoff_code(),
  case
    when request.status in ('AWAITING_CONFIRMATION', 'COMPLETED')
      then request.submitted_at
    else null
  end,
  case
    when request.status in ('AWAITING_CONFIRMATION', 'COMPLETED')
      then request.runner_id
    else null
  end
from public.requests as request
where request.status in ('IN_PROGRESS', 'AWAITING_CONFIRMATION', 'COMPLETED')
on conflict (request_id) do nothing;

insert into public.request_settlements (
  request_id,
  expected_amount,
  runner_received_amount,
  runner_confirmed_at,
  requestor_confirmed_at
)
select
  request.id,
  private.calculate_request_settlement(request.id),
  case
    when request.status in ('AWAITING_CONFIRMATION', 'COMPLETED')
      then private.calculate_request_settlement(request.id)
    else null
  end,
  case
    when request.status in ('AWAITING_CONFIRMATION', 'COMPLETED')
      then request.submitted_at
    else null
  end,
  case
    when request.status = 'COMPLETED' then request.completed_at
    else null
  end
from public.requests as request
where request.status in ('IN_PROGRESS', 'AWAITING_CONFIRMATION', 'COMPLETED')
on conflict (request_id) do nothing;

create or replace function private.refresh_request_settlement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_request_id uuid := case
    when tg_op = 'DELETE' then old.request_id
    else new.request_id
  end;
  recalculated_amount numeric(12, 2);
begin
  recalculated_amount := private.calculate_request_settlement(
    affected_request_id
  );

  insert into public.request_settlements (
    request_id,
    expected_amount
  )
  values (
    affected_request_id,
    recalculated_amount
  )
  on conflict (request_id) do update set
    expected_amount = excluded.expected_amount,
    runner_received_amount = null,
    runner_confirmed_at = null,
    requestor_confirmed_at = null;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists request_receipts_refresh_settlement
on public.request_receipts;
create trigger request_receipts_refresh_settlement
after insert or delete on public.request_receipts
for each row execute function private.refresh_request_settlement();

create or replace function private.enforce_handoff_evidence_freeze()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_request_id uuid := case
    when tg_op = 'DELETE' then old.request_id
    else new.request_id
  end;
begin
  if exists (
    select 1
    from public.request_handoffs
    where request_id = affected_request_id
      and verified_at is not null
  ) then
    raise exception 'Purchase evidence is locked after handoff verification';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists request_receipts_freeze_after_handoff
on public.request_receipts;
create trigger request_receipts_freeze_after_handoff
before insert or delete on public.request_receipts
for each row execute function private.enforce_handoff_evidence_freeze();

drop trigger if exists request_price_changes_freeze_after_handoff
on public.request_price_changes;
create trigger request_price_changes_freeze_after_handoff
before insert on public.request_price_changes
for each row execute function private.enforce_handoff_evidence_freeze();

create or replace function public.get_request_handoff_state(
  p_request_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request_record public.requests%rowtype;
  handoff_record public.request_handoffs%rowtype;
  caller_is_requestor boolean;
begin
  if caller_id is null then
    raise exception 'Authentication is required';
  end if;

  select *
  into request_record
  from public.requests
  where id = p_request_id;

  if request_record.id is null
    or (
      request_record.requestor_id is distinct from caller_id
      and request_record.runner_id is distinct from caller_id
    ) then
    raise exception 'You do not have access to this handoff';
  end if;

  select *
  into handoff_record
  from public.request_handoffs
  where request_id = p_request_id;

  if handoff_record.request_id is null then
    return null;
  end if;

  caller_is_requestor := request_record.requestor_id = caller_id;

  return jsonb_build_object(
    'request_id', handoff_record.request_id,
    'handoff_code', case
      when caller_is_requestor then handoff_record.handoff_code
      else null
    end,
    'failed_attempts', handoff_record.failed_attempts,
    'attempts_remaining', 5 - handoff_record.failed_attempts,
    'verified_at', handoff_record.verified_at,
    'created_at', handoff_record.created_at
  );
end;
$$;

create or replace function public.regenerate_request_handoff_code(
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  updated_handoff public.request_handoffs%rowtype;
begin
  if caller_id is null
    or (select private.current_profile_role()) is distinct from 'requestor' then
    raise exception 'Only the Requestor can regenerate the handoff code';
  end if;

  update public.request_handoffs as handoff
  set
    handoff_code = private.generate_handoff_code(),
    failed_attempts = 0
  from public.requests as request
  where handoff.request_id = p_request_id
    and request.id = handoff.request_id
    and request.requestor_id = caller_id
    and request.status = 'IN_PROGRESS'
    and handoff.verified_at is null
  returning handoff.* into updated_handoff;

  if updated_handoff.request_id is null then
    raise exception 'The handoff code can no longer be regenerated';
  end if;

  return jsonb_build_object(
    'request_id', updated_handoff.request_id,
    'handoff_code', updated_handoff.handoff_code,
    'failed_attempts', updated_handoff.failed_attempts,
    'attempts_remaining', 5,
    'verified_at', updated_handoff.verified_at,
    'created_at', updated_handoff.created_at
  );
end;
$$;

create or replace function public.verify_request_handoff(
  p_request_id uuid,
  p_handoff_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request_record public.requests%rowtype;
  handoff_record public.request_handoffs%rowtype;
  terms_record public.request_payment_terms%rowtype;
begin
  if caller_id is null
    or (select private.current_profile_role()) is distinct from 'runner' then
    raise exception 'Only the assigned Runner can verify a handoff';
  end if;

  select *
  into request_record
  from public.requests
  where id = p_request_id
  for update;

  if request_record.id is null
    or request_record.runner_id is distinct from caller_id
    or request_record.status <> 'IN_PROGRESS' then
    raise exception 'This task is not eligible for handoff verification';
  end if;

  select *
  into handoff_record
  from public.request_handoffs
  where request_id = p_request_id
  for update;

  if handoff_record.request_id is null then
    raise exception 'This task has no handoff code';
  end if;

  if handoff_record.verified_at is not null then
    return jsonb_build_object(
      'verified', true,
      'verified_at', handoff_record.verified_at,
      'attempts_remaining', 5 - handoff_record.failed_attempts
    );
  end if;

  select *
  into terms_record
  from public.request_payment_terms
  where request_id = p_request_id;

  if exists (
    select 1
    from public.request_price_changes
    where request_id = p_request_id and status = 'PENDING'
  ) then
    raise exception 'Resolve or withdraw the pending price change before handoff';
  end if;

  if terms_record.arrangement = 'RUNNER_ADVANCE'
    and (
      terms_record.runner_consented_at is null
      or terms_record.runner_consented_amount
        is distinct from terms_record.maximum_advance
    ) then
    raise exception 'Confirm the current cash-advance limit before handoff';
  end if;

  if terms_record.receipt_evidence_required
    and terms_record.arrangement in ('MERCHANT_PREPAID', 'RUNNER_ADVANCE')
    and not exists (
      select 1
      from public.request_receipts
      where request_id = p_request_id
    ) then
    raise exception 'Upload at least one purchase receipt before handoff';
  end if;

  if handoff_record.failed_attempts >= 5 then
    return jsonb_build_object(
      'verified', false,
      'locked', true,
      'attempts_remaining', 0
    );
  end if;

  if p_handoff_code is null
    or p_handoff_code !~ '^[0-9]{6}$'
    or p_handoff_code <> handoff_record.handoff_code then
    update public.request_handoffs
    set failed_attempts = least(failed_attempts + 1, 5)
    where request_id = p_request_id
    returning * into handoff_record;

    return jsonb_build_object(
      'verified', false,
      'locked', handoff_record.failed_attempts >= 5,
      'attempts_remaining', 5 - handoff_record.failed_attempts
    );
  end if;

  update public.request_handoffs
  set
    verified_at = now(),
    verified_by = caller_id
  where request_id = p_request_id
  returning * into handoff_record;

  insert into public.notifications (
    user_id,
    request_id,
    type,
    target_role,
    title,
    message
  )
  values (
    request_record.requestor_id,
    request_record.id,
    'HANDOFF_VERIFIED',
    'requestor',
    'Handoff verified',
    format('Your handoff code was verified for: %s', request_record.title)
  );

  return jsonb_build_object(
    'verified', true,
    'verified_at', handoff_record.verified_at,
    'attempts_remaining', 5 - handoff_record.failed_attempts
  );
end;
$$;

create or replace function public.confirm_request_settlement_received(
  p_request_id uuid,
  p_received_amount numeric
)
returns public.request_settlements
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request_record public.requests%rowtype;
  terms_record public.request_payment_terms%rowtype;
  settlement_record public.request_settlements%rowtype;
  updated_settlement public.request_settlements%rowtype;
begin
  if caller_id is null
    or (select private.current_profile_role()) is distinct from 'runner' then
    raise exception 'Only the assigned Runner can confirm direct payment';
  end if;

  select *
  into request_record
  from public.requests
  where id = p_request_id
  for update;

  if request_record.id is null
    or request_record.runner_id is distinct from caller_id
    or request_record.status <> 'IN_PROGRESS' then
    raise exception 'This task is not eligible for payment confirmation';
  end if;

  if not exists (
    select 1
    from public.request_handoffs
    where request_id = p_request_id and verified_at is not null
  ) then
    raise exception 'Verify the handoff code before confirming payment';
  end if;

  select *
  into terms_record
  from public.request_payment_terms
  where request_id = p_request_id;

  if exists (
    select 1
    from public.request_price_changes
    where request_id = p_request_id and status = 'PENDING'
  ) then
    raise exception 'Resolve or withdraw the pending price change before confirming payment';
  end if;

  if terms_record.arrangement = 'RUNNER_ADVANCE'
    and (
      terms_record.runner_consented_at is null
      or terms_record.runner_consented_amount
        is distinct from terms_record.maximum_advance
    ) then
    raise exception 'Confirm the current cash-advance limit before confirming payment';
  end if;

  if terms_record.receipt_evidence_required
    and terms_record.arrangement in ('MERCHANT_PREPAID', 'RUNNER_ADVANCE')
    and not exists (
      select 1
      from public.request_receipts
      where request_id = p_request_id
    ) then
    raise exception 'Upload at least one purchase receipt before confirming payment';
  end if;

  if exists (
    select 1
    from public.request_disputes
    where request_id = p_request_id and status = 'OPEN'
  ) then
    raise exception 'An open dispute must be resolved before payment confirmation';
  end if;

  select *
  into settlement_record
  from public.request_settlements
  where request_id = p_request_id
  for update;

  if settlement_record.request_id is null then
    raise exception 'This task has no settlement record';
  end if;

  if settlement_record.runner_confirmed_at is not null then
    return settlement_record;
  end if;

  if p_received_amount is null
    or p_received_amount is distinct from settlement_record.expected_amount then
    raise exception 'The confirmed payment must match the documented amount';
  end if;

  update public.request_settlements
  set
    runner_received_amount = expected_amount,
    runner_confirmed_at = now(),
    requestor_confirmed_at = null
  where request_id = p_request_id
  returning * into updated_settlement;

  insert into public.notifications (
    user_id,
    request_id,
    type,
    target_role,
    title,
    message
  )
  values (
    request_record.requestor_id,
    request_record.id,
    'PAYMENT_CONFIRMED',
    'requestor',
    'Runner confirmed payment',
    format(
      'The Runner confirmed receiving the documented direct payment for: %s',
      request_record.title
    )
  );

  return updated_settlement;
end;
$$;

create or replace function public.report_request_failure(
  p_request_id uuid,
  p_reason_code text,
  p_description text
)
returns public.request_failures
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request_record public.requests%rowtype;
  created_failure public.request_failures%rowtype;
begin
  if caller_id is null
    or (select private.current_profile_role()) is distinct from 'runner' then
    raise exception 'Only the assigned Runner can report a failed delivery';
  end if;

  if p_reason_code is null
    or p_reason_code not in (
      'RECIPIENT_UNAVAILABLE',
      'WRONG_OR_INACCESSIBLE_ADDRESS',
      'PAYMENT_REFUSED',
      'ITEM_REJECTED',
      'UNSAFE_SITUATION',
      'OTHER'
    ) then
    raise exception 'Choose a valid failed-delivery reason';
  end if;

  if p_description is null
    or char_length(trim(p_description)) not between 10 and 1000 then
    raise exception 'Describe what happened in 10 to 1000 characters';
  end if;

  select *
  into request_record
  from public.requests
  where id = p_request_id
  for update;

  if request_record.id is null
    or request_record.runner_id is distinct from caller_id
    or request_record.status <> 'IN_PROGRESS' then
    raise exception 'Only your in-progress task can be reported as failed';
  end if;

  if exists (
    select 1
    from public.request_handoffs
    where request_id = p_request_id and verified_at is not null
  ) then
    raise exception 'A verified handoff cannot be reported as failed';
  end if;

  if exists (
    select 1
    from public.request_settlements
    where request_id = p_request_id and runner_confirmed_at is not null
  ) then
    raise exception 'A paid handoff cannot be reported as failed';
  end if;

  insert into public.request_failures (
    request_id,
    reported_by,
    reason_code,
    description
  )
  values (
    p_request_id,
    caller_id,
    p_reason_code,
    trim(p_description)
  )
  returning * into created_failure;

  perform set_config(
    'butuango.transition_note',
    format('Failed delivery: %s', trim(p_description)),
    true
  );

  update public.requests
  set status = 'FAILED', failed_at = now()
  where id = p_request_id;

  insert into public.notifications (
    user_id,
    request_id,
    type,
    target_role,
    title,
    message
  )
  values (
    request_record.requestor_id,
    request_record.id,
    'REQUEST_FAILED',
    'requestor',
    'Delivery reported as failed',
    format('The Runner reported a failed handoff for: %s', request_record.title)
  );

  return created_failure;
end;
$$;

create or replace function public.acknowledge_request_failure(
  p_failure_id uuid,
  p_note text default null
)
returns public.request_failures
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  updated_failure public.request_failures%rowtype;
  request_record public.requests%rowtype;
begin
  if caller_id is null
    or (select private.current_profile_role()) is distinct from 'requestor' then
    raise exception 'Only the Requestor can acknowledge a failed delivery';
  end if;

  if p_note is not null
    and char_length(trim(p_note)) not between 2 and 500 then
    raise exception 'The acknowledgment note must contain 2 to 500 characters';
  end if;

  select request.*
  into request_record
  from public.request_failures as failure
  join public.requests as request on request.id = failure.request_id
  where failure.id = p_failure_id
    and request.requestor_id = caller_id
    and request.status = 'FAILED';

  if request_record.id is null then
    raise exception 'This failed delivery cannot be acknowledged';
  end if;

  select *
  into updated_failure
  from public.request_failures
  where id = p_failure_id;

  if updated_failure.acknowledged_at is not null then
    return updated_failure;
  end if;

  update public.request_failures
  set
    acknowledged_at = now(),
    acknowledgment_note = nullif(trim(p_note), '')
  where id = p_failure_id
  returning * into updated_failure;

  insert into public.notifications (
    user_id,
    request_id,
    type,
    target_role,
    title,
    message
  )
  values (
    request_record.runner_id,
    request_record.id,
    'FAILURE_ACKNOWLEDGED',
    'runner',
    'Failed delivery acknowledged',
    format('The Requestor reviewed the failed handoff for: %s', request_record.title)
  );

  return updated_failure;
end;
$$;

create or replace function public.open_request_dispute(
  p_request_id uuid,
  p_category text,
  p_description text
)
returns public.request_disputes
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  caller_role text := (select private.current_profile_role());
  request_record public.requests%rowtype;
  reported_id uuid;
  reported_role text;
  created_dispute public.request_disputes%rowtype;
begin
  if caller_id is null or caller_role not in ('requestor', 'runner') then
    raise exception 'Only a request participant can open a dispute';
  end if;

  if p_category is null
    or p_category not in (
      'ITEM_OR_SERVICE',
      'PAYMENT',
      'NO_SHOW',
      'SAFETY',
      'OTHER'
    ) then
    raise exception 'Choose a valid dispute category';
  end if;

  if p_description is null
    or char_length(trim(p_description)) not between 10 and 1500 then
    raise exception 'Describe the dispute in 10 to 1500 characters';
  end if;

  select *
  into request_record
  from public.requests
  where id = p_request_id
  for update;

  if request_record.id is null
    or request_record.runner_id is null
    or (
      request_record.requestor_id is distinct from caller_id
      and request_record.runner_id is distinct from caller_id
    ) then
    raise exception 'You are not a participant in this request';
  end if;

  if request_record.status not in (
    'IN_PROGRESS',
    'AWAITING_CONFIRMATION',
    'COMPLETED',
    'FAILED'
  ) then
    raise exception 'A dispute cannot be opened at this request stage';
  end if;

  if request_record.status = 'COMPLETED'
    and request_record.completed_at < now() - interval '7 days' then
    raise exception 'The seven-day dispute window has ended';
  end if;

  if request_record.requestor_id = caller_id then
    if caller_role <> 'requestor' then
      raise exception 'Switch to the Requestor workspace to dispute this request';
    end if;
    reported_id := request_record.runner_id;
    reported_role := 'runner';
  else
    if caller_role <> 'runner' then
      raise exception 'Switch to the Runner workspace to dispute this request';
    end if;
    reported_id := request_record.requestor_id;
    reported_role := 'requestor';
  end if;

  insert into public.request_disputes (
    request_id,
    opened_by,
    reported_user_id,
    category,
    description
  )
  values (
    p_request_id,
    caller_id,
    reported_id,
    p_category,
    trim(p_description)
  )
  returning * into created_dispute;

  insert into public.notifications (
    user_id,
    request_id,
    type,
    target_role,
    title,
    message
  )
  values (
    reported_id,
    request_record.id,
    'DISPUTE_OPENED',
    reported_role,
    'A dispute was opened',
    format('A participant opened a dispute for: %s', request_record.title)
  );

  return created_dispute;
end;
$$;

create or replace function public.withdraw_request_dispute(
  p_dispute_id uuid
)
returns public.request_disputes
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  updated_dispute public.request_disputes%rowtype;
  request_record public.requests%rowtype;
  reported_role text;
begin
  if caller_id is null then
    raise exception 'Authentication is required';
  end if;

  update public.request_disputes
  set status = 'WITHDRAWN', resolved_at = now()
  where id = p_dispute_id
    and opened_by = caller_id
    and status = 'OPEN'
  returning * into updated_dispute;

  if updated_dispute.id is null then
    raise exception 'This dispute can no longer be withdrawn';
  end if;

  select *
  into request_record
  from public.requests
  where id = updated_dispute.request_id;

  reported_role := case
    when request_record.requestor_id = updated_dispute.reported_user_id
      then 'requestor'
    else 'runner'
  end;

  insert into public.notifications (
    user_id,
    request_id,
    type,
    target_role,
    title,
    message
  )
  values (
    updated_dispute.reported_user_id,
    updated_dispute.request_id,
    'DISPUTE_WITHDRAWN',
    reported_role,
    'Dispute withdrawn',
    format('The open dispute was withdrawn for: %s', request_record.title)
  );

  return updated_dispute;
end;
$$;

create or replace function public.admin_resolve_request_dispute(
  p_dispute_id uuid,
  p_outcome text,
  p_resolution_note text,
  p_restrict_reported_days integer default 0
)
returns public.request_disputes
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  dispute_record public.request_disputes%rowtype;
  updated_dispute public.request_disputes%rowtype;
  request_record public.requests%rowtype;
  opener_role text;
  reported_role text;
  restricted_until_value timestamptz;
begin
  if caller_id is null
    or (select private.current_profile_role()) is distinct from 'admin' then
    raise exception 'Only an Admin can resolve disputes';
  end if;

  if p_outcome is null
    or p_outcome not in ('UPHELD', 'SETTLED', 'DISMISSED') then
    raise exception 'Choose a valid dispute outcome';
  end if;

  if p_resolution_note is null
    or char_length(trim(p_resolution_note)) not between 5 and 1500 then
    raise exception 'A resolution note between 5 and 1500 characters is required';
  end if;

  if p_restrict_reported_days is null
    or p_restrict_reported_days < 0
    or p_restrict_reported_days > 365 then
    raise exception 'Restriction days must be between 0 and 365';
  end if;

  if p_restrict_reported_days > 0 and p_outcome <> 'UPHELD' then
    raise exception 'Only an upheld dispute can restrict the reported account';
  end if;

  select *
  into dispute_record
  from public.request_disputes
  where id = p_dispute_id
  for update;

  if dispute_record.id is null or dispute_record.status <> 'OPEN' then
    raise exception 'This dispute is no longer open';
  end if;

  update public.request_disputes
  set
    status = case
      when p_outcome = 'DISMISSED' then 'DISMISSED'
      else 'RESOLVED'
    end,
    resolution_outcome = p_outcome,
    resolution_note = trim(p_resolution_note),
    resolved_by = caller_id,
    resolved_at = now()
  where id = p_dispute_id
  returning * into updated_dispute;

  if p_restrict_reported_days > 0 then
    restricted_until_value := now()
      + make_interval(days => p_restrict_reported_days);

    insert into public.account_restrictions (
      account_id,
      reason,
      source_dispute_id,
      restricted_until,
      created_by
    )
    values (
      dispute_record.reported_user_id,
      trim(p_resolution_note),
      dispute_record.id,
      restricted_until_value,
      caller_id
    )
    on conflict (account_id) do update set
      reason = excluded.reason,
      source_dispute_id = excluded.source_dispute_id,
      restricted_until = excluded.restricted_until,
      created_by = excluded.created_by,
      created_at = now();

  end if;

  select *
  into request_record
  from public.requests
  where id = dispute_record.request_id;

  opener_role := case
    when request_record.requestor_id = dispute_record.opened_by
      then 'requestor'
    else 'runner'
  end;
  reported_role := case
    when request_record.requestor_id = dispute_record.reported_user_id
      then 'requestor'
    else 'runner'
  end;

  if p_restrict_reported_days > 0 then
    insert into public.notifications (
      user_id,
      request_id,
      type,
      target_role,
      title,
      message
    )
    values (
      dispute_record.reported_user_id,
      dispute_record.request_id,
      'ACCOUNT_RESTRICTED',
      reported_role,
      'Account temporarily restricted',
      format(
        'Your account is restricted from new marketplace activity until %s.',
        restricted_until_value
      )
    );
  end if;

  insert into public.notifications (
    user_id,
    request_id,
    type,
    target_role,
    title,
    message
  )
  values
    (
      dispute_record.opened_by,
      dispute_record.request_id,
      'DISPUTE_RESOLVED',
      opener_role,
      'Dispute resolved',
      format('The dispute was resolved for: %s', request_record.title)
    ),
    (
      dispute_record.reported_user_id,
      dispute_record.request_id,
      'DISPUTE_RESOLVED',
      reported_role,
      'Dispute resolved',
      format('The dispute was resolved for: %s', request_record.title)
    );

  return updated_dispute;
end;
$$;

create or replace function public.admin_clear_account_restriction(
  p_account_id uuid
)
returns public.account_restrictions
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  deleted_restriction public.account_restrictions%rowtype;
begin
  if caller_id is null
    or (select private.current_profile_role()) is distinct from 'admin' then
    raise exception 'Only an Admin can clear account restrictions';
  end if;

  delete from public.account_restrictions
  where account_id = p_account_id
  returning * into deleted_restriction;

  if deleted_restriction.account_id is null then
    raise exception 'No account restriction was found';
  end if;

  return deleted_restriction;
end;
$$;

create or replace function public.submit_request_completion_with_handoff(
  p_request_id uuid
)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request_record public.requests%rowtype;
  settlement_record public.request_settlements%rowtype;
begin
  if caller_id is null
    or (select private.current_profile_role()) is distinct from 'runner' then
    raise exception 'Only the assigned Runner can submit task completion';
  end if;

  select *
  into request_record
  from public.requests
  where id = p_request_id
  for update;

  if request_record.id is null
    or request_record.runner_id is distinct from caller_id
    or request_record.status <> 'IN_PROGRESS' then
    raise exception 'The task was not found or cannot be submitted for confirmation';
  end if;

  if not exists (
    select 1
    from public.request_handoffs
    where request_id = p_request_id and verified_at is not null
  ) then
    raise exception 'Verify the handoff code before submitting completion';
  end if;

  select *
  into settlement_record
  from public.request_settlements
  where request_id = p_request_id;

  if settlement_record.request_id is null
    or settlement_record.runner_confirmed_at is null
    or settlement_record.runner_received_amount
      is distinct from settlement_record.expected_amount then
    raise exception 'Confirm receipt of the documented direct payment before submitting completion';
  end if;

  if exists (
    select 1
    from public.request_disputes
    where request_id = p_request_id and status = 'OPEN'
  ) then
    raise exception 'An open dispute must be resolved or withdrawn before completion';
  end if;

  return public.submit_request_completion_with_payment_evidence(p_request_id);
end;
$$;

create or replace function public.confirm_request_completion_with_settlement(
  p_request_id uuid,
  p_receipts_reviewed boolean,
  p_payment_confirmed boolean
)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request_record public.requests%rowtype;
  settlement_record public.request_settlements%rowtype;
  completed_request public.requests%rowtype;
begin
  if caller_id is null
    or (select private.current_profile_role()) is distinct from 'requestor' then
    raise exception 'Only the Requestor can confirm task completion';
  end if;

  select *
  into request_record
  from public.requests
  where id = p_request_id
  for update;

  if request_record.id is null
    or request_record.requestor_id is distinct from caller_id
    or request_record.status <> 'AWAITING_CONFIRMATION' then
    raise exception 'The task was not found or is not awaiting confirmation';
  end if;

  if p_payment_confirmed is distinct from true then
    raise exception 'Confirm that the selected payer settled directly with the Runner';
  end if;

  if exists (
    select 1
    from public.request_disputes
    where request_id = p_request_id and status = 'OPEN'
  ) then
    raise exception 'An open dispute must be resolved or withdrawn before completion';
  end if;

  select *
  into settlement_record
  from public.request_settlements
  where request_id = p_request_id
  for update;

  if settlement_record.request_id is null
    or settlement_record.runner_confirmed_at is null
    or settlement_record.runner_received_amount
      is distinct from settlement_record.expected_amount then
    raise exception 'The Runner has not confirmed the documented direct payment';
  end if;

  update public.request_settlements
  set requestor_confirmed_at = now()
  where request_id = p_request_id;

  completed_request := public.confirm_request_completion_with_payment_evidence(
    p_request_id,
    p_receipts_reviewed
  );

  return completed_request;
end;
$$;

-- Phase 3 wrappers replace the prior client-callable completion RPCs.
revoke all on function public.submit_request_completion_with_payment_evidence(
  uuid
) from public, anon, authenticated;
revoke all on function public.confirm_request_completion_with_payment_evidence(
  uuid, boolean
) from public, anon, authenticated;

revoke all on function private.generate_handoff_code()
from public, anon, authenticated;
revoke all on function private.calculate_request_settlement(uuid)
from public, anon, authenticated;
revoke all on function private.account_is_restricted(uuid)
from public, anon, authenticated;
revoke all on function private.enforce_request_account_restrictions()
from public, anon, authenticated;
revoke all on function private.refresh_request_settlement()
from public, anon, authenticated;
revoke all on function private.enforce_handoff_evidence_freeze()
from public, anon, authenticated;
revoke all on function private.validate_request_change()
from public, anon, authenticated;

revoke all on function public.get_request_handoff_state(uuid)
from public, anon;
revoke all on function public.regenerate_request_handoff_code(uuid)
from public, anon;
revoke all on function public.verify_request_handoff(uuid, text)
from public, anon;
revoke all on function public.confirm_request_settlement_received(uuid, numeric)
from public, anon;
revoke all on function public.report_request_failure(uuid, text, text)
from public, anon;
revoke all on function public.acknowledge_request_failure(uuid, text)
from public, anon;
revoke all on function public.open_request_dispute(uuid, text, text)
from public, anon;
revoke all on function public.withdraw_request_dispute(uuid)
from public, anon;
revoke all on function public.admin_resolve_request_dispute(
  uuid, text, text, integer
) from public, anon;
revoke all on function public.admin_clear_account_restriction(uuid)
from public, anon;
revoke all on function public.submit_request_completion_with_handoff(uuid)
from public, anon;
revoke all on function public.confirm_request_completion_with_settlement(
  uuid, boolean, boolean
) from public, anon;

grant execute on function public.get_request_handoff_state(uuid)
to authenticated;
grant execute on function public.regenerate_request_handoff_code(uuid)
to authenticated;
grant execute on function public.verify_request_handoff(uuid, text)
to authenticated;
grant execute on function public.confirm_request_settlement_received(
  uuid, numeric
) to authenticated;
grant execute on function public.report_request_failure(uuid, text, text)
to authenticated;
grant execute on function public.acknowledge_request_failure(uuid, text)
to authenticated;
grant execute on function public.open_request_dispute(uuid, text, text)
to authenticated;
grant execute on function public.withdraw_request_dispute(uuid)
to authenticated;
grant execute on function public.admin_resolve_request_dispute(
  uuid, text, text, integer
) to authenticated;
grant execute on function public.admin_clear_account_restriction(uuid)
to authenticated;
grant execute on function public.submit_request_completion_with_handoff(uuid)
to authenticated;
grant execute on function public.confirm_request_completion_with_settlement(
  uuid, boolean, boolean
) to authenticated;

comment on table public.request_handoffs is
'RPC-only six-digit handoff codes and verification state. Codes are revealed only to the owning Requestor.';

comment on table public.request_settlements is
'Participant-visible direct-settlement amount and confirmation timestamps. This is not a platform payment record.';

comment on table public.request_failures is
'Terminal failed-delivery or failed-handoff reports created by the assigned Runner before verification and payment.';

comment on table public.request_disputes is
'Participant disputes with withdrawal and Admin-only resolution workflow.';

comment on table public.account_restrictions is
'Admin-controlled temporary blocks on creating or accepting new marketplace requests.';

commit;
