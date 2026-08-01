-- Run after supabase/migrations/024_optional_saved_address_contacts.sql.

begin;

alter table public.requests
add column if not exists scenario_type text;

alter table public.requests
drop constraint if exists requests_scenario_type_check;

alter table public.requests
add constraint requests_scenario_type_check check (
  scenario_type in (
    'ON_SITE',
    'PICKUP_DELIVERY',
    'PREPAID_DELIVERY',
    'BUY_DELIVERY',
    'CUSTOM'
  )
);

alter table public.requests
add column if not exists approximate_destination_latitude numeric(4, 2),
add column if not exists approximate_destination_longitude numeric(5, 2);

alter table public.requests
drop constraint if exists requests_approximate_destination_pair_check;

alter table public.requests
add constraint requests_approximate_destination_pair_check check (
  (
    approximate_destination_latitude is null
    and approximate_destination_longitude is null
  )
  or
  (
    approximate_destination_latitude between -90 and 90
    and approximate_destination_longitude between -180 and 180
  )
);

create index if not exists requests_open_destination_geography_idx
on public.requests (
  approximate_destination_latitude,
  approximate_destination_longitude
)
where status = 'OPEN'
  and approximate_destination_latitude is not null
  and approximate_destination_longitude is not null;

alter table public.request_locations
add column if not exists pickup_contact_name text,
add column if not exists pickup_contact_phone text,
add column if not exists destination_contact_name text,
add column if not exists destination_contact_phone text,
add column if not exists contact_is_requestor boolean not null default true;

alter table public.request_locations
drop constraint if exists request_locations_pickup_contact_name_check,
drop constraint if exists request_locations_pickup_contact_phone_check,
drop constraint if exists request_locations_destination_contact_name_check,
drop constraint if exists request_locations_destination_contact_phone_check;

alter table public.request_locations
add constraint request_locations_pickup_contact_name_check check (
  pickup_contact_name is null
  or char_length(trim(pickup_contact_name)) between 2 and 120
),
add constraint request_locations_pickup_contact_phone_check check (
  pickup_contact_phone is null
  or char_length(trim(pickup_contact_phone)) between 7 and 30
),
add constraint request_locations_destination_contact_name_check check (
  destination_contact_name is null
  or char_length(trim(destination_contact_name)) between 2 and 120
),
add constraint request_locations_destination_contact_phone_check check (
  destination_contact_phone is null
  or char_length(trim(destination_contact_phone)) between 7 and 30
);

alter table public.request_payment_terms
add column if not exists requestor_present_at_handoff boolean not null default true;

update public.requests as request
set scenario_type = case
  when location.fulfillment_type = 'on_site' then 'ON_SITE'
  when location.fulfillment_type = 'delivery'
    and terms.arrangement = 'NO_PURCHASE' then 'PICKUP_DELIVERY'
  when location.fulfillment_type = 'delivery'
    and terms.arrangement = 'MERCHANT_PREPAID' then 'PREPAID_DELIVERY'
  when location.fulfillment_type = 'purchase_and_deliver'
    and terms.arrangement = 'RUNNER_ADVANCE' then 'BUY_DELIVERY'
  else 'CUSTOM'
end
from public.request_locations as location
join public.request_payment_terms as terms
  on terms.request_id = location.request_id
where request.id = location.request_id
  and request.scenario_type is null;

update public.requests
set scenario_type = 'CUSTOM'
where scenario_type is null;

alter table public.requests
alter column scenario_type set default 'CUSTOM',
alter column scenario_type set not null;

update public.request_locations as location
set
  pickup_contact_name = case
    when location.fulfillment_type = 'pickup_only' then location.contact_name
    else location.pickup_contact_name
  end,
  pickup_contact_phone = case
    when location.fulfillment_type = 'pickup_only' then location.contact_phone
    else location.pickup_contact_phone
  end,
  destination_contact_name = case
    when location.fulfillment_type in (
      'delivery', 'purchase_and_deliver', 'on_site'
    ) then location.contact_name
    else location.destination_contact_name
  end,
  destination_contact_phone = case
    when location.fulfillment_type in (
      'delivery', 'purchase_and_deliver', 'on_site'
    ) then location.contact_phone
    else location.destination_contact_phone
  end,
  contact_is_requestor = exists (
    select 1
    from public.requests as request
    join public.profiles as profile on profile.id = request.requestor_id
    where request.id = location.request_id
      and trim(profile.full_name) = trim(location.contact_name)
      and trim(coalesce(profile.phone_number, '')) = trim(location.contact_phone)
  );

update public.requests as request
set
  approximate_destination_latitude = request.approximate_latitude,
  approximate_destination_longitude = request.approximate_longitude
from public.request_locations as location
where location.request_id = request.id
  and location.fulfillment_type in ('delivery', 'purchase_and_deliver')
  and request.approximate_latitude is not null
  and request.approximate_destination_latitude is null;

-- A prepaid amount is order-value context, not money advanced by the Runner.
-- It may therefore be zero when the Requestor does not know the final value.
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

  if p_arrangement = 'RUNNER_ADVANCE'
    and coalesce(p_expense_budget, 0) <= 0 then
    raise exception 'A Runner advance requires a positive maximum amount';
  end if;

  if coalesce(p_expense_budget, 0) < 0 then
    raise exception 'The order value or expense amount cannot be negative';
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
      raise exception 'Enter the name of the task contact who will pay';
    end if;
    if p_payer_phone is null
      or char_length(trim(p_payer_phone)) not between 7 and 30 then
      raise exception 'Enter a valid phone number for the task contact who will pay';
    end if;
  end if;
end;
$$;

create or replace function private.validate_request_scenario_inputs(
  p_scenario_type text,
  p_fulfillment_type text,
  p_service_fee numeric,
  p_expense_budget numeric,
  p_payment_arrangement text,
  p_payer_type text,
  p_payer_name text,
  p_payer_phone text,
  p_merchant_reference text,
  p_pickup_contact_name text,
  p_pickup_contact_phone text,
  p_destination_contact_name text,
  p_destination_contact_phone text,
  p_contact_is_requestor boolean,
  p_requestor_present_at_handoff boolean,
  p_approximate_latitude numeric,
  p_approximate_longitude numeric,
  p_destination_approximate_latitude numeric,
  p_destination_approximate_longitude numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  needs_pickup boolean := p_fulfillment_type in (
    'pickup_only', 'delivery', 'purchase_and_deliver'
  );
  needs_destination boolean := p_fulfillment_type in (
    'delivery', 'purchase_and_deliver', 'on_site'
  );
  handoff_name text := case
    when p_fulfillment_type = 'pickup_only' then p_pickup_contact_name
    else p_destination_contact_name
  end;
  handoff_phone text := case
    when p_fulfillment_type = 'pickup_only' then p_pickup_contact_phone
    else p_destination_contact_phone
  end;
begin
  perform private.validate_request_payment_terms(
    p_expense_budget,
    p_payment_arrangement,
    p_payer_type,
    p_payer_name,
    p_payer_phone,
    p_merchant_reference
  );

  if p_scenario_type is null or p_scenario_type not in (
    'ON_SITE',
    'PICKUP_DELIVERY',
    'PREPAID_DELIVERY',
    'BUY_DELIVERY',
    'CUSTOM'
  ) then
    raise exception 'Choose a valid request scenario';
  end if;

  if p_service_fee is null or p_service_fee <= 0 then
    raise exception 'Enter a Runner service fee greater than zero';
  end if;

  if p_contact_is_requestor is null
    or p_requestor_present_at_handoff is null then
    raise exception 'Confirm the handoff contact and payer availability';
  end if;

  if p_scenario_type = 'ON_SITE' and p_fulfillment_type <> 'on_site' then
    raise exception 'An on-site scenario requires one task destination';
  end if;
  if p_scenario_type = 'PICKUP_DELIVERY'
    and (
      p_fulfillment_type <> 'delivery'
      or p_payment_arrangement <> 'NO_PURCHASE'
    ) then
    raise exception 'A ready pickup-and-delivery task cannot include a purchase expense';
  end if;
  if p_scenario_type = 'PREPAID_DELIVERY'
    and (
      p_fulfillment_type <> 'delivery'
      or p_payment_arrangement <> 'MERCHANT_PREPAID'
    ) then
    raise exception 'A prepaid collection requires merchant-prepaid payment setup';
  end if;
  if p_scenario_type = 'BUY_DELIVERY'
    and (
      p_fulfillment_type <> 'purchase_and_deliver'
      or p_payment_arrangement <> 'RUNNER_ADVANCE'
    ) then
    raise exception 'A buy-and-deliver task requires Runner advance';
  end if;
  if p_fulfillment_type = 'purchase_and_deliver'
    and p_payment_arrangement = 'NO_PURCHASE' then
    raise exception 'A buy-and-deliver task must include a purchase setup';
  end if;

  if needs_pickup and (
    p_pickup_contact_name is null
    or char_length(trim(p_pickup_contact_name)) not between 2 and 120
    or p_pickup_contact_phone is null
    or char_length(trim(p_pickup_contact_phone)) not between 7 and 30
  ) then
    raise exception 'Enter a valid pickup contact';
  end if;

  if needs_destination and (
    p_destination_contact_name is null
    or char_length(trim(p_destination_contact_name)) not between 2 and 120
    or p_destination_contact_phone is null
    or char_length(trim(p_destination_contact_phone)) not between 7 and 30
  ) then
    raise exception 'Enter a valid recipient or on-site contact';
  end if;

  if p_approximate_latitude is null
    or p_approximate_longitude is null
    or p_approximate_latitude not between -90 and 90
    or p_approximate_longitude not between -180 and 180 then
    raise exception 'Choose the required approximate pickup or task zone';
  end if;

  if needs_pickup and needs_destination and (
    p_destination_approximate_latitude is null
    or p_destination_approximate_longitude is null
    or p_destination_approximate_latitude not between -90 and 90
    or p_destination_approximate_longitude not between -180 and 180
  ) then
    raise exception 'Choose the required approximate delivery zone';
  end if;

  if p_payer_type = 'RECIPIENT' and (
    trim(p_payer_name) is distinct from trim(handoff_name)
    or trim(p_payer_phone) is distinct from trim(handoff_phone)
  ) then
    raise exception 'The selected task contact must be the payer at handoff';
  end if;

  if p_payer_type = 'REQUESTOR'
    and p_contact_is_requestor is distinct from true
    and p_requestor_present_at_handoff is distinct from true then
    raise exception 'Confirm that the Requestor will be present or select the task contact as payer';
  end if;
end;
$$;

create or replace function private.persist_request_scenario_details(
  p_request_id uuid,
  p_scenario_type text,
  p_pickup_contact_name text,
  p_pickup_contact_phone text,
  p_destination_contact_name text,
  p_destination_contact_phone text,
  p_contact_is_requestor boolean,
  p_requestor_present_at_handoff boolean,
  p_destination_approximate_latitude numeric,
  p_destination_approximate_longitude numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.requests
  set
    scenario_type = p_scenario_type,
    approximate_destination_latitude = case
      when p_destination_approximate_latitude is null then null
      else round(p_destination_approximate_latitude, 2)
    end,
    approximate_destination_longitude = case
      when p_destination_approximate_longitude is null then null
      else round(p_destination_approximate_longitude, 2)
    end
  where id = p_request_id;

  update public.request_locations
  set
    pickup_contact_name = nullif(trim(p_pickup_contact_name), ''),
    pickup_contact_phone = nullif(trim(p_pickup_contact_phone), ''),
    destination_contact_name = nullif(trim(p_destination_contact_name), ''),
    destination_contact_phone = nullif(trim(p_destination_contact_phone), ''),
    contact_is_requestor = p_contact_is_requestor
  where request_id = p_request_id;

  update public.request_payment_terms
  set requestor_present_at_handoff = p_requestor_present_at_handoff
  where request_id = p_request_id;
end;
$$;

create or replace function public.create_request_with_scenario(
  p_category_id bigint,
  p_title text,
  p_description text,
  p_area text,
  p_expense_budget numeric,
  p_service_fee numeric,
  p_due_at timestamptz,
  p_scenario_type text,
  p_fulfillment_type text,
  p_pickup_address text,
  p_pickup_landmark text,
  p_pickup_instructions text,
  p_delivery_address text,
  p_delivery_landmark text,
  p_delivery_instructions text,
  p_pickup_contact_name text,
  p_pickup_contact_phone text,
  p_destination_contact_name text,
  p_destination_contact_phone text,
  p_contact_is_requestor boolean,
  p_contact_name text,
  p_contact_phone text,
  p_approximate_latitude numeric,
  p_approximate_longitude numeric,
  p_destination_approximate_latitude numeric,
  p_destination_approximate_longitude numeric,
  p_payment_arrangement text,
  p_payer_type text,
  p_payer_name text,
  p_payer_phone text,
  p_merchant_reference text,
  p_requestor_present_at_handoff boolean
)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_request public.requests%rowtype;
begin
  perform private.validate_request_scenario_inputs(
    p_scenario_type,
    p_fulfillment_type,
    p_service_fee,
    p_expense_budget,
    p_payment_arrangement,
    p_payer_type,
    p_payer_name,
    p_payer_phone,
    p_merchant_reference,
    p_pickup_contact_name,
    p_pickup_contact_phone,
    p_destination_contact_name,
    p_destination_contact_phone,
    p_contact_is_requestor,
    p_requestor_present_at_handoff,
    p_approximate_latitude,
    p_approximate_longitude,
    p_destination_approximate_latitude,
    p_destination_approximate_longitude
  );

  created_request := public.create_request_with_payment_terms(
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
    p_approximate_longitude,
    p_payment_arrangement,
    p_payer_type,
    p_payer_name,
    p_payer_phone,
    p_merchant_reference
  );

  perform private.persist_request_scenario_details(
    created_request.id,
    p_scenario_type,
    p_pickup_contact_name,
    p_pickup_contact_phone,
    p_destination_contact_name,
    p_destination_contact_phone,
    p_contact_is_requestor,
    p_requestor_present_at_handoff,
    p_destination_approximate_latitude,
    p_destination_approximate_longitude
  );

  select * into created_request
  from public.requests
  where id = created_request.id;

  return created_request;
end;
$$;

create or replace function public.update_open_request_with_scenario(
  p_request_id uuid,
  p_category_id bigint,
  p_title text,
  p_description text,
  p_area text,
  p_expense_budget numeric,
  p_service_fee numeric,
  p_due_at timestamptz,
  p_scenario_type text,
  p_fulfillment_type text,
  p_pickup_address text,
  p_pickup_landmark text,
  p_pickup_instructions text,
  p_delivery_address text,
  p_delivery_landmark text,
  p_delivery_instructions text,
  p_pickup_contact_name text,
  p_pickup_contact_phone text,
  p_destination_contact_name text,
  p_destination_contact_phone text,
  p_contact_is_requestor boolean,
  p_contact_name text,
  p_contact_phone text,
  p_approximate_latitude numeric,
  p_approximate_longitude numeric,
  p_destination_approximate_latitude numeric,
  p_destination_approximate_longitude numeric,
  p_payment_arrangement text,
  p_payer_type text,
  p_payer_name text,
  p_payer_phone text,
  p_merchant_reference text,
  p_requestor_present_at_handoff boolean
)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_request public.requests%rowtype;
begin
  perform private.validate_request_scenario_inputs(
    p_scenario_type,
    p_fulfillment_type,
    p_service_fee,
    p_expense_budget,
    p_payment_arrangement,
    p_payer_type,
    p_payer_name,
    p_payer_phone,
    p_merchant_reference,
    p_pickup_contact_name,
    p_pickup_contact_phone,
    p_destination_contact_name,
    p_destination_contact_phone,
    p_contact_is_requestor,
    p_requestor_present_at_handoff,
    p_approximate_latitude,
    p_approximate_longitude,
    p_destination_approximate_latitude,
    p_destination_approximate_longitude
  );

  updated_request := public.update_open_request_with_payment_terms(
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
    p_approximate_longitude,
    p_payment_arrangement,
    p_payer_type,
    p_payer_name,
    p_payer_phone,
    p_merchant_reference
  );

  perform private.persist_request_scenario_details(
    updated_request.id,
    p_scenario_type,
    p_pickup_contact_name,
    p_pickup_contact_phone,
    p_destination_contact_name,
    p_destination_contact_phone,
    p_contact_is_requestor,
    p_requestor_present_at_handoff,
    p_destination_approximate_latitude,
    p_destination_approximate_longitude
  );

  select * into updated_request
  from public.requests
  where id = updated_request.id;

  return updated_request;
end;
$$;

create or replace function public.save_request_scenario_location(
  p_request_id uuid,
  p_scenario_type text,
  p_fulfillment_type text,
  p_pickup_address text,
  p_pickup_landmark text,
  p_pickup_instructions text,
  p_delivery_address text,
  p_delivery_landmark text,
  p_delivery_instructions text,
  p_pickup_contact_name text,
  p_pickup_contact_phone text,
  p_destination_contact_name text,
  p_destination_contact_phone text,
  p_contact_is_requestor boolean,
  p_requestor_present_at_handoff boolean,
  p_contact_name text,
  p_contact_phone text,
  p_approximate_latitude numeric,
  p_approximate_longitude numeric,
  p_destination_approximate_latitude numeric,
  p_destination_approximate_longitude numeric
)
returns public.request_locations
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_record public.requests%rowtype;
  terms_record public.request_payment_terms%rowtype;
  details_record public.request_payment_details%rowtype;
  saved_location public.request_locations%rowtype;
begin
  select * into request_record
  from public.requests
  where id = p_request_id;

  select * into terms_record
  from public.request_payment_terms
  where request_id = p_request_id;

  select * into details_record
  from public.request_payment_details
  where request_id = p_request_id;

  if request_record.scenario_type is distinct from p_scenario_type then
    raise exception 'The request scenario cannot be changed in the location editor';
  end if;

  perform private.validate_request_scenario_inputs(
    p_scenario_type,
    p_fulfillment_type,
    request_record.service_fee,
    request_record.expense_budget,
    terms_record.arrangement,
    terms_record.payer_type,
    details_record.payer_name,
    details_record.payer_phone,
    details_record.merchant_reference,
    p_pickup_contact_name,
    p_pickup_contact_phone,
    p_destination_contact_name,
    p_destination_contact_phone,
    p_contact_is_requestor,
    p_requestor_present_at_handoff,
    p_approximate_latitude,
    p_approximate_longitude,
    p_destination_approximate_latitude,
    p_destination_approximate_longitude
  );

  saved_location := public.save_request_location_and_geography(
    p_request_id,
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

  update public.requests
  set
    approximate_destination_latitude = case
      when p_destination_approximate_latitude is null then null
      else round(p_destination_approximate_latitude, 2)
    end,
    approximate_destination_longitude = case
      when p_destination_approximate_longitude is null then null
      else round(p_destination_approximate_longitude, 2)
    end
  where id = p_request_id;

  update public.request_locations
  set
    pickup_contact_name = nullif(trim(p_pickup_contact_name), ''),
    pickup_contact_phone = nullif(trim(p_pickup_contact_phone), ''),
    destination_contact_name = nullif(trim(p_destination_contact_name), ''),
    destination_contact_phone = nullif(trim(p_destination_contact_phone), ''),
    contact_is_requestor = p_contact_is_requestor
  where request_id = p_request_id
  returning * into saved_location;

  update public.request_payment_terms
  set requestor_present_at_handoff = p_requestor_present_at_handoff
  where request_id = p_request_id;

  return saved_location;
end;
$$;

create or replace function private.scrub_scenario_contacts_after_anonymization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.anonymized_at is null and new.anonymized_at is not null then
    update public.request_locations as location
    set
      pickup_contact_name = case
        when location.pickup_contact_name is null then null
        else 'Deleted User'
      end,
      pickup_contact_phone = case
        when location.pickup_contact_phone is null then null
        else 'Removed'
      end,
      destination_contact_name = case
        when location.destination_contact_name is null then null
        else 'Deleted User'
      end,
      destination_contact_phone = case
        when location.destination_contact_phone is null then null
        else 'Removed'
      end
    from public.requests as request
    where request.id = location.request_id
      and request.requestor_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_scrub_scenario_contacts_after_anonymization
on public.profiles;
create trigger profiles_scrub_scenario_contacts_after_anonymization
after update of anonymized_at on public.profiles
for each row
execute function private.scrub_scenario_contacts_after_anonymization();

do $permissions$
declare
  routine record;
begin
  for routine in
    select procedure.oid::regprocedure as signature, namespace.nspname as schema_name
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where (
      namespace.nspname = 'private'
      and procedure.proname in (
        'validate_request_scenario_inputs',
        'persist_request_scenario_details',
        'scrub_scenario_contacts_after_anonymization'
      )
    ) or (
      namespace.nspname = 'public'
      and procedure.proname in (
        'create_request_with_scenario',
        'update_open_request_with_scenario',
        'save_request_scenario_location'
      )
    )
  loop
    execute format(
      'revoke all on function %s from public, anon, authenticated',
      routine.signature
    );
    if routine.schema_name = 'public' then
      execute format(
        'grant execute on function %s to authenticated',
        routine.signature
      );
    end if;
  end loop;
end;
$permissions$;

comment on column public.requests.scenario_type is
'Scenario-first request intent used to keep fulfillment and payment rules consistent.';

comment on column public.requests.approximate_destination_latitude is
'Coarse destination latitude visible for pre-acceptance route estimation; never stores an exact address point.';

comment on column public.requests.approximate_destination_longitude is
'Coarse destination longitude visible for pre-acceptance route estimation; never stores an exact address point.';

comment on column public.request_payment_terms.requestor_present_at_handoff is
'Records the Requestor confirmation that they will attend an in-person handoff when another person is the task contact.';

commit;
