-- ButuanGo: choose each exact location once and derive public discovery zones.
-- Run after supabase/migrations/025_request_scenario_consistency.sql.

begin;

alter table public.request_locations
add column if not exists exact_latitude numeric(9, 6),
add column if not exists exact_longitude numeric(10, 6),
add column if not exists destination_exact_latitude numeric(9, 6),
add column if not exists destination_exact_longitude numeric(10, 6);

alter table public.request_locations
drop constraint if exists request_locations_exact_primary_pair_check,
drop constraint if exists request_locations_exact_destination_pair_check;

alter table public.request_locations
add constraint request_locations_exact_primary_pair_check check (
  (exact_latitude is null and exact_longitude is null)
  or
  (
    exact_latitude is not null
    and exact_longitude is not null
    and
    exact_latitude between -90 and 90
    and exact_longitude between -180 and 180
  )
),
add constraint request_locations_exact_destination_pair_check check (
  (destination_exact_latitude is null and destination_exact_longitude is null)
  or
  (
    destination_exact_latitude is not null
    and destination_exact_longitude is not null
    and
    destination_exact_latitude between -90 and 90
    and destination_exact_longitude between -180 and 180
  )
);

create or replace function private.validate_exact_request_locations(
  p_fulfillment_type text,
  p_exact_latitude numeric,
  p_exact_longitude numeric,
  p_destination_exact_latitude numeric,
  p_destination_exact_longitude numeric
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
begin
  if p_exact_latitude is null
    or p_exact_longitude is null
    or p_exact_latitude not between -90 and 90
    or p_exact_longitude not between -180 and 180 then
    raise exception 'Choose the exact pickup or task point';
  end if;

  if needs_pickup and needs_destination and (
    p_destination_exact_latitude is null
    or p_destination_exact_longitude is null
    or p_destination_exact_latitude not between -90 and 90
    or p_destination_exact_longitude not between -180 and 180
  ) then
    raise exception 'Choose the exact delivery point';
  end if;
end;
$$;

create or replace function private.persist_exact_request_locations(
  p_request_id uuid,
  p_fulfillment_type text,
  p_exact_latitude numeric,
  p_exact_longitude numeric,
  p_destination_exact_latitude numeric,
  p_destination_exact_longitude numeric
)
returns public.request_locations
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_location public.request_locations%rowtype;
  has_separate_destination boolean := p_fulfillment_type in (
    'delivery', 'purchase_and_deliver'
  );
begin
  update public.request_locations
  set
    exact_latitude = round(p_exact_latitude, 6),
    exact_longitude = round(p_exact_longitude, 6),
    destination_exact_latitude = case
      when has_separate_destination then round(p_destination_exact_latitude, 6)
      else null
    end,
    destination_exact_longitude = case
      when has_separate_destination then round(p_destination_exact_longitude, 6)
      else null
    end
  where request_id = p_request_id
  returning * into saved_location;

  if saved_location.request_id is null then
    raise exception 'Private request location was not found';
  end if;

  return saved_location;
end;
$$;

create or replace function public.create_request_with_exact_locations(
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
  p_exact_latitude numeric,
  p_exact_longitude numeric,
  p_destination_exact_latitude numeric,
  p_destination_exact_longitude numeric,
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
  perform private.validate_exact_request_locations(
    p_fulfillment_type,
    p_exact_latitude,
    p_exact_longitude,
    p_destination_exact_latitude,
    p_destination_exact_longitude
  );

  created_request := public.create_request_with_scenario(
    p_category_id,
    p_title,
    p_description,
    p_area,
    p_expense_budget,
    p_service_fee,
    p_due_at,
    p_scenario_type,
    p_fulfillment_type,
    p_pickup_address,
    p_pickup_landmark,
    p_pickup_instructions,
    p_delivery_address,
    p_delivery_landmark,
    p_delivery_instructions,
    p_pickup_contact_name,
    p_pickup_contact_phone,
    p_destination_contact_name,
    p_destination_contact_phone,
    p_contact_is_requestor,
    p_contact_name,
    p_contact_phone,
    round(p_exact_latitude, 2),
    round(p_exact_longitude, 2),
    case
      when p_fulfillment_type in ('delivery', 'purchase_and_deliver')
        then round(p_destination_exact_latitude, 2)
      else null
    end,
    case
      when p_fulfillment_type in ('delivery', 'purchase_and_deliver')
        then round(p_destination_exact_longitude, 2)
      else null
    end,
    p_payment_arrangement,
    p_payer_type,
    p_payer_name,
    p_payer_phone,
    p_merchant_reference,
    p_requestor_present_at_handoff
  );

  perform private.persist_exact_request_locations(
    created_request.id,
    p_fulfillment_type,
    p_exact_latitude,
    p_exact_longitude,
    p_destination_exact_latitude,
    p_destination_exact_longitude
  );

  return created_request;
end;
$$;

create or replace function public.update_open_request_with_exact_locations(
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
  p_exact_latitude numeric,
  p_exact_longitude numeric,
  p_destination_exact_latitude numeric,
  p_destination_exact_longitude numeric,
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
  perform private.validate_exact_request_locations(
    p_fulfillment_type,
    p_exact_latitude,
    p_exact_longitude,
    p_destination_exact_latitude,
    p_destination_exact_longitude
  );

  updated_request := public.update_open_request_with_scenario(
    p_request_id,
    p_category_id,
    p_title,
    p_description,
    p_area,
    p_expense_budget,
    p_service_fee,
    p_due_at,
    p_scenario_type,
    p_fulfillment_type,
    p_pickup_address,
    p_pickup_landmark,
    p_pickup_instructions,
    p_delivery_address,
    p_delivery_landmark,
    p_delivery_instructions,
    p_pickup_contact_name,
    p_pickup_contact_phone,
    p_destination_contact_name,
    p_destination_contact_phone,
    p_contact_is_requestor,
    p_contact_name,
    p_contact_phone,
    round(p_exact_latitude, 2),
    round(p_exact_longitude, 2),
    case
      when p_fulfillment_type in ('delivery', 'purchase_and_deliver')
        then round(p_destination_exact_latitude, 2)
      else null
    end,
    case
      when p_fulfillment_type in ('delivery', 'purchase_and_deliver')
        then round(p_destination_exact_longitude, 2)
      else null
    end,
    p_payment_arrangement,
    p_payer_type,
    p_payer_name,
    p_payer_phone,
    p_merchant_reference,
    p_requestor_present_at_handoff
  );

  perform private.persist_exact_request_locations(
    updated_request.id,
    p_fulfillment_type,
    p_exact_latitude,
    p_exact_longitude,
    p_destination_exact_latitude,
    p_destination_exact_longitude
  );

  return updated_request;
end;
$$;

create or replace function public.save_request_exact_locations(
  p_request_id uuid,
  p_area text,
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
  p_exact_latitude numeric,
  p_exact_longitude numeric,
  p_destination_exact_latitude numeric,
  p_destination_exact_longitude numeric
)
returns public.request_locations
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_location public.request_locations%rowtype;
begin
  if p_area is null or char_length(trim(p_area)) not between 2 and 160 then
    raise exception 'Choose the primary map location so its general area can be identified';
  end if;

  perform private.validate_exact_request_locations(
    p_fulfillment_type,
    p_exact_latitude,
    p_exact_longitude,
    p_destination_exact_latitude,
    p_destination_exact_longitude
  );

  saved_location := public.save_request_scenario_location(
    p_request_id,
    p_scenario_type,
    p_fulfillment_type,
    p_pickup_address,
    p_pickup_landmark,
    p_pickup_instructions,
    p_delivery_address,
    p_delivery_landmark,
    p_delivery_instructions,
    p_pickup_contact_name,
    p_pickup_contact_phone,
    p_destination_contact_name,
    p_destination_contact_phone,
    p_contact_is_requestor,
    p_requestor_present_at_handoff,
    p_contact_name,
    p_contact_phone,
    round(p_exact_latitude, 2),
    round(p_exact_longitude, 2),
    case
      when p_fulfillment_type in ('delivery', 'purchase_and_deliver')
        then round(p_destination_exact_latitude, 2)
      else null
    end,
    case
      when p_fulfillment_type in ('delivery', 'purchase_and_deliver')
        then round(p_destination_exact_longitude, 2)
      else null
    end
  );

  saved_location := private.persist_exact_request_locations(
    p_request_id,
    p_fulfillment_type,
    p_exact_latitude,
    p_exact_longitude,
    p_destination_exact_latitude,
    p_destination_exact_longitude
  );

  update public.requests
  set area = trim(p_area)
  where id = p_request_id
    and status = 'OPEN';

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
      end,
      exact_latitude = null,
      exact_longitude = null,
      destination_exact_latitude = null,
      destination_exact_longitude = null
    from public.requests as request
    where request.id = location.request_id
      and request.requestor_id = new.id;
  end if;
  return new;
end;
$$;

-- Retire browser-callable request writers that could bypass exact-pin storage
-- or overwrite the server-derived public geography. The new wrappers can
-- still call these routines as their owning database role.
do $legacy_permissions$
declare
  routine record;
begin
  for routine in
    select procedure.oid::regprocedure as signature
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname in (
        'set_request_approximate_location',
        'save_request_location',
        'save_request_location_and_geography',
        'create_request_with_payment_terms',
        'update_open_request_with_payment_terms',
        'create_request_with_scenario',
        'update_open_request_with_scenario',
        'save_request_scenario_location'
      )
  loop
    execute format(
      'revoke all on function %s from public, anon, authenticated',
      routine.signature
    );
  end loop;
end;
$legacy_permissions$;

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
        'validate_exact_request_locations',
        'persist_exact_request_locations',
        'scrub_scenario_contacts_after_anonymization'
      )
    ) or (
      namespace.nspname = 'public'
      and procedure.proname in (
        'create_request_with_exact_locations',
        'update_open_request_with_exact_locations',
        'save_request_exact_locations'
      )
    )
  loop
    execute format(
      'revoke all on function %s from public, anon, authenticated',
      routine.signature
    );
    if routine.schema_name = 'public' then
      execute format('grant execute on function %s to authenticated', routine.signature);
    end if;
  end loop;
end;
$permissions$;

comment on column public.request_locations.exact_latitude is
'Participant-only exact latitude for the primary pickup or task point.';
comment on column public.request_locations.exact_longitude is
'Participant-only exact longitude for the primary pickup or task point.';
comment on column public.request_locations.destination_exact_latitude is
'Participant-only exact latitude for a separate delivery destination.';
comment on column public.request_locations.destination_exact_longitude is
'Participant-only exact longitude for a separate delivery destination.';

commit;
