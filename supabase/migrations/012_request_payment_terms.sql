-- ButuanGo Milestone 4: explicit payment arrangements and Runner cash-advance consent.
-- Run after supabase/migrations/011_approximate_request_geography.sql.

begin;

create table if not exists public.request_payment_terms (
  request_id uuid primary key
    references public.requests(id) on delete cascade,
  arrangement text not null check (
    arrangement in ('NO_PURCHASE', 'MERCHANT_PREPAID', 'RUNNER_ADVANCE')
  ),
  payer_type text not null check (
    payer_type in ('REQUESTOR', 'RECIPIENT')
  ),
  maximum_advance numeric(12, 2) not null default 0 check (
    maximum_advance >= 0
    and maximum_advance <= 9999999999.99
  ),
  runner_consented_at timestamptz,
  runner_consented_amount numeric(12, 2) check (
    runner_consented_amount is null
    or (
      runner_consented_amount >= 0
      and runner_consented_amount <= 9999999999.99
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint request_payment_terms_arrangement_shape check (
    (
      arrangement in ('NO_PURCHASE', 'MERCHANT_PREPAID')
      and maximum_advance = 0
    )
    or (
      arrangement = 'RUNNER_ADVANCE'
      and maximum_advance > 0
    )
  ),
  constraint request_payment_terms_consent_pair check (
    (runner_consented_at is null and runner_consented_amount is null)
    or
    (
      arrangement = 'RUNNER_ADVANCE'
      and runner_consented_at is not null
      and runner_consented_amount = maximum_advance
    )
  )
);

create table if not exists public.request_payment_details (
  request_id uuid primary key
    references public.requests(id) on delete cascade,
  payer_name text check (
    payer_name is null
    or char_length(trim(payer_name)) between 2 and 120
  ),
  payer_phone text check (
    payer_phone is null
    or char_length(trim(payer_phone)) between 7 and 30
  ),
  merchant_reference text check (
    merchant_reference is null
    or char_length(trim(merchant_reference)) between 2 and 160
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists request_payment_terms_set_updated_at
on public.request_payment_terms;
create trigger request_payment_terms_set_updated_at
before update on public.request_payment_terms
for each row execute function public.set_updated_at();

drop trigger if exists request_payment_details_set_updated_at
on public.request_payment_details;
create trigger request_payment_details_set_updated_at
before update on public.request_payment_details
for each row execute function public.set_updated_at();

alter table public.request_payment_terms enable row level security;
alter table public.request_payment_details enable row level security;

drop policy if exists "Eligible users can read request payment terms"
on public.request_payment_terms;
create policy "Eligible users can read request payment terms"
on public.request_payment_terms for select to authenticated
using (
  exists (
    select 1
    from public.requests as request
    where request.id = request_payment_terms.request_id
      and (
        request.requestor_id = (select auth.uid())
        or request.runner_id = (select auth.uid())
        or (
          request.status = 'OPEN'
          and request.requestor_id <> (select auth.uid())
          and (select private.current_profile_role()) = 'runner'
        )
      )
  )
);

drop policy if exists "Participants can read private payment details"
on public.request_payment_details;
create policy "Participants can read private payment details"
on public.request_payment_details for select to authenticated
using (
  exists (
    select 1
    from public.requests as request
    where request.id = request_payment_details.request_id
      and (
        request.requestor_id = (select auth.uid())
        or (
          request.runner_id = (select auth.uid())
          and request.status in (
            'ACCEPTED',
            'IN_PROGRESS',
            'AWAITING_CONFIRMATION',
            'COMPLETED'
          )
        )
      )
  )
);

revoke all on table public.request_payment_terms from anon, authenticated;
revoke all on table public.request_payment_details from anon, authenticated;
grant select on table public.request_payment_terms to authenticated;
grant select on table public.request_payment_details to authenticated;

-- Backfill development and pre-migration requests. Existing non-zero expense
-- budgets used the previous implicit "Runner may cover the expense" policy.
insert into public.request_payment_terms (
  request_id,
  arrangement,
  payer_type,
  maximum_advance
)
select
  request.id,
  case
    when request.expense_budget > 0 then 'RUNNER_ADVANCE'
    else 'NO_PURCHASE'
  end,
  'REQUESTOR',
  case
    when request.expense_budget > 0 then request.expense_budget
    else 0
  end
from public.requests as request
on conflict (request_id) do nothing;

insert into public.request_payment_details (request_id)
select request.id
from public.requests as request
on conflict (request_id) do nothing;

create or replace function private.validate_request_payment_terms(
  p_expense_budget numeric,
  p_arrangement text,
  p_payer_type text,
  p_payer_name text,
  p_payer_phone text,
  p_merchant_reference text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_arrangement is null
    or p_arrangement not in (
      'NO_PURCHASE',
      'MERCHANT_PREPAID',
      'RUNNER_ADVANCE'
    ) then
    raise exception 'Choose a valid payment arrangement';
  end if;

  if p_payer_type is null
    or p_payer_type not in ('REQUESTOR', 'RECIPIENT') then
    raise exception 'Choose who will pay the Runner';
  end if;

  if p_arrangement = 'NO_PURCHASE' and p_expense_budget <> 0 then
    raise exception 'No-purchase requests must have a zero errand expense';
  end if;

  if p_arrangement in ('MERCHANT_PREPAID', 'RUNNER_ADVANCE')
    and coalesce(p_expense_budget, 0) <= 0 then
    raise exception 'This payment arrangement requires a positive expense budget';
  end if;

  if p_arrangement = 'MERCHANT_PREPAID'
    and (
      p_merchant_reference is null
      or char_length(trim(p_merchant_reference)) not between 2 and 160
    ) then
    raise exception 'Enter the prepaid merchant or order reference';
  end if;

  if p_payer_type = 'RECIPIENT' then
    if p_payer_name is null
      or char_length(trim(p_payer_name)) not between 2 and 120 then
      raise exception 'Enter the name of the person who will pay';
    end if;
    if p_payer_phone is null
      or char_length(trim(p_payer_phone)) not between 7 and 30 then
      raise exception 'Enter a valid phone number for the person who will pay';
    end if;
  end if;
end;
$$;

create or replace function private.save_request_payment_terms(
  p_request_id uuid,
  p_expense_budget numeric,
  p_arrangement text,
  p_payer_type text,
  p_payer_name text,
  p_payer_phone text,
  p_merchant_reference text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.validate_request_payment_terms(
    p_expense_budget,
    p_arrangement,
    p_payer_type,
    p_payer_name,
    p_payer_phone,
    p_merchant_reference
  );

  insert into public.request_payment_terms (
    request_id,
    arrangement,
    payer_type,
    maximum_advance,
    runner_consented_at,
    runner_consented_amount
  )
  values (
    p_request_id,
    p_arrangement,
    p_payer_type,
    case
      when p_arrangement = 'RUNNER_ADVANCE' then p_expense_budget
      else 0
    end,
    null,
    null
  )
  on conflict (request_id) do update set
    arrangement = excluded.arrangement,
    payer_type = excluded.payer_type,
    maximum_advance = excluded.maximum_advance,
    runner_consented_at = null,
    runner_consented_amount = null;

  insert into public.request_payment_details (
    request_id,
    payer_name,
    payer_phone,
    merchant_reference
  )
  values (
    p_request_id,
    case
      when p_payer_type = 'RECIPIENT' then trim(p_payer_name)
      else null
    end,
    case
      when p_payer_type = 'RECIPIENT' then trim(p_payer_phone)
      else null
    end,
    case
      when p_arrangement = 'MERCHANT_PREPAID'
        then trim(p_merchant_reference)
      else null
    end
  )
  on conflict (request_id) do update set
    payer_name = excluded.payer_name,
    payer_phone = excluded.payer_phone,
    merchant_reference = excluded.merchant_reference;
end;
$$;

create or replace function public.create_request_with_payment_terms(
  p_category_id bigint,
  p_title text,
  p_description text,
  p_area text,
  p_expense_budget numeric,
  p_service_fee numeric,
  p_due_at timestamptz,
  p_fulfillment_type text,
  p_pickup_address text,
  p_pickup_landmark text,
  p_pickup_instructions text,
  p_delivery_address text,
  p_delivery_landmark text,
  p_delivery_instructions text,
  p_contact_name text,
  p_contact_phone text,
  p_approximate_latitude numeric,
  p_approximate_longitude numeric,
  p_payment_arrangement text,
  p_payer_type text,
  p_payer_name text,
  p_payer_phone text,
  p_merchant_reference text
)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_request public.requests%rowtype;
begin
  perform private.validate_request_payment_terms(
    p_expense_budget,
    p_payment_arrangement,
    p_payer_type,
    p_payer_name,
    p_payer_phone,
    p_merchant_reference
  );

  created_request := public.create_request_with_location_and_geography(
    p_category_id,
    p_title,
    p_description,
    p_area,
    p_expense_budget,
    p_service_fee,
    p_due_at,
    p_fulfillment_type,
    p_pickup_address,
    p_pickup_landmark,
    p_pickup_instructions,
    p_delivery_address,
    p_delivery_landmark,
    p_delivery_instructions,
    p_contact_name,
    p_contact_phone,
    p_approximate_latitude,
    p_approximate_longitude
  );

  perform private.save_request_payment_terms(
    created_request.id,
    p_expense_budget,
    p_payment_arrangement,
    p_payer_type,
    p_payer_name,
    p_payer_phone,
    p_merchant_reference
  );

  return created_request;
end;
$$;

create or replace function public.update_open_request_with_payment_terms(
  p_request_id uuid,
  p_category_id bigint,
  p_title text,
  p_description text,
  p_area text,
  p_expense_budget numeric,
  p_service_fee numeric,
  p_due_at timestamptz,
  p_fulfillment_type text,
  p_pickup_address text,
  p_pickup_landmark text,
  p_pickup_instructions text,
  p_delivery_address text,
  p_delivery_landmark text,
  p_delivery_instructions text,
  p_contact_name text,
  p_contact_phone text,
  p_approximate_latitude numeric,
  p_approximate_longitude numeric,
  p_payment_arrangement text,
  p_payer_type text,
  p_payer_name text,
  p_payer_phone text,
  p_merchant_reference text
)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_request public.requests%rowtype;
begin
  perform private.validate_request_payment_terms(
    p_expense_budget,
    p_payment_arrangement,
    p_payer_type,
    p_payer_name,
    p_payer_phone,
    p_merchant_reference
  );

  updated_request := public.update_open_request_with_location_and_geography(
    p_request_id,
    p_category_id,
    p_title,
    p_description,
    p_area,
    p_expense_budget,
    p_service_fee,
    p_due_at,
    p_fulfillment_type,
    p_pickup_address,
    p_pickup_landmark,
    p_pickup_instructions,
    p_delivery_address,
    p_delivery_landmark,
    p_delivery_instructions,
    p_contact_name,
    p_contact_phone,
    p_approximate_latitude,
    p_approximate_longitude
  );

  perform private.save_request_payment_terms(
    updated_request.id,
    p_expense_budget,
    p_payment_arrangement,
    p_payer_type,
    p_payer_name,
    p_payer_phone,
    p_merchant_reference
  );

  return updated_request;
end;
$$;

create or replace function public.accept_request_with_payment_terms(
  p_request_id uuid,
  p_cash_advance_consent boolean
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
  where request_id = p_request_id
  for update;

  if payment_terms.request_id is null then
    raise exception 'This request has no payment arrangement';
  end if;

  if payment_terms.arrangement = 'RUNNER_ADVANCE'
    and p_cash_advance_consent is distinct from true then
    raise exception 'Confirm the maximum cash advance before accepting this request';
  end if;

  updated_request := public.accept_request(p_request_id);

  if payment_terms.arrangement = 'RUNNER_ADVANCE' then
    update public.request_payment_terms
    set
      runner_consented_at = now(),
      runner_consented_amount = maximum_advance
    where request_id = p_request_id;
  end if;

  return updated_request;
end;
$$;

create or replace function public.confirm_request_cash_advance(
  p_request_id uuid
)
returns public.request_payment_terms
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  updated_terms public.request_payment_terms%rowtype;
begin
  if caller_id is null
    or (select private.current_profile_role()) is distinct from 'runner' then
    raise exception 'Only an authenticated Runner can confirm a cash advance';
  end if;

  update public.request_payment_terms as terms
  set
    runner_consented_at = now(),
    runner_consented_amount = terms.maximum_advance
  from public.requests as request
  where terms.request_id = p_request_id
    and request.id = terms.request_id
    and request.runner_id = caller_id
    and request.status = 'ACCEPTED'
    and terms.arrangement = 'RUNNER_ADVANCE'
  returning terms.* into updated_terms;

  if updated_terms.request_id is null then
    raise exception 'This cash advance cannot be confirmed';
  end if;

  return updated_terms;
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

  return public.start_request(p_request_id);
end;
$$;

create or replace function private.clear_released_request_payment_consent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'ACCEPTED'
    and (
      new.status in ('OPEN', 'CANCELLED')
      or new.runner_id is distinct from old.runner_id
    ) then
    update public.request_payment_terms
    set
      runner_consented_at = null,
      runner_consented_amount = null
    where request_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists requests_clear_payment_consent on public.requests;
create trigger requests_clear_payment_consent
after update of status, runner_id on public.requests
for each row execute function private.clear_released_request_payment_consent();

-- Prevent authenticated clients from bypassing the new atomic payment flow.
revoke execute on function public.create_request_with_location(
  bigint, text, text, text, numeric, numeric, timestamptz,
  text, text, text, text, text, text, text, text, text
) from authenticated;
revoke execute on function public.update_open_request_with_location(
  uuid, bigint, text, text, text, numeric, numeric, timestamptz,
  text, text, text, text, text, text, text, text, text
) from authenticated;
revoke execute on function public.create_request_with_location_and_geography(
  bigint, text, text, text, numeric, numeric, timestamptz,
  text, text, text, text, text, text, text, text, text, numeric, numeric
) from authenticated;
revoke execute on function public.update_open_request_with_location_and_geography(
  uuid, bigint, text, text, text, numeric, numeric, timestamptz,
  text, text, text, text, text, text, text, text, text, numeric, numeric
) from authenticated;
revoke execute on function public.accept_request(uuid) from authenticated;
revoke execute on function public.start_request(uuid) from authenticated;

revoke all on function private.validate_request_payment_terms(
  numeric, text, text, text, text, text
) from public, anon, authenticated;
revoke all on function private.save_request_payment_terms(
  uuid, numeric, text, text, text, text, text
) from public, anon, authenticated;
revoke all on function private.clear_released_request_payment_consent()
from public, anon, authenticated;

revoke all on function public.create_request_with_payment_terms(
  bigint, text, text, text, numeric, numeric, timestamptz,
  text, text, text, text, text, text, text, text, text, numeric, numeric,
  text, text, text, text, text
) from public, anon;
revoke all on function public.update_open_request_with_payment_terms(
  uuid, bigint, text, text, text, numeric, numeric, timestamptz,
  text, text, text, text, text, text, text, text, text, numeric, numeric,
  text, text, text, text, text
) from public, anon;
revoke all on function public.accept_request_with_payment_terms(uuid, boolean)
from public, anon;
revoke all on function public.confirm_request_cash_advance(uuid)
from public, anon;
revoke all on function public.start_request_with_payment_terms(uuid)
from public, anon;

grant execute on function public.create_request_with_payment_terms(
  bigint, text, text, text, numeric, numeric, timestamptz,
  text, text, text, text, text, text, text, text, text, numeric, numeric,
  text, text, text, text, text
) to authenticated;
grant execute on function public.update_open_request_with_payment_terms(
  uuid, bigint, text, text, text, numeric, numeric, timestamptz,
  text, text, text, text, text, text, text, text, text, numeric, numeric,
  text, text, text, text, text
) to authenticated;
grant execute on function public.accept_request_with_payment_terms(uuid, boolean)
to authenticated;
grant execute on function public.confirm_request_cash_advance(uuid)
to authenticated;
grant execute on function public.start_request_with_payment_terms(uuid)
to authenticated;

comment on table public.request_payment_terms is
'Public-to-eligible-users payment arrangement, payer type, maximum Runner exposure, and recorded cash-advance consent.';

comment on table public.request_payment_details is
'Private payer identity and prepaid merchant reference, visible only to the Requestor and assigned Runner.';

comment on function public.accept_request_with_payment_terms(uuid, boolean) is
'Atomically accepts an OPEN request and records explicit Runner consent when a cash advance is required.';

comment on function public.start_request_with_payment_terms(uuid) is
'Starts an assigned task only after its payment arrangement and any required cash-advance consent are valid.';

commit;
