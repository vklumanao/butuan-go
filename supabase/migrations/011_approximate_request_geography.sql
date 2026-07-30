-- ButuanGo Milestone 3: privacy-preserving request geography.
-- Run after supabase/migrations/010_account_saved_addresses.sql.

begin;

alter table public.requests
add column if not exists approximate_latitude numeric(4, 2),
add column if not exists approximate_longitude numeric(5, 2);

alter table public.requests
drop constraint if exists requests_approximate_coordinates_pair;

alter table public.requests
add constraint requests_approximate_coordinates_pair check (
  (
    approximate_latitude is null
    and approximate_longitude is null
  )
  or
  (
    approximate_latitude between -90 and 90
    and approximate_longitude between -180 and 180
  )
);

create index if not exists requests_open_approximate_location_idx
on public.requests (approximate_latitude, approximate_longitude)
where status = 'OPEN'
  and approximate_latitude is not null
  and approximate_longitude is not null;

create or replace function public.set_request_approximate_location(
  p_request_id uuid,
  p_latitude numeric,
  p_longitude numeric
)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request_status text;
  updated_request public.requests%rowtype;
begin
  if caller_id is null
    or (select private.current_profile_role()) is distinct from 'requestor' then
    raise exception 'Only an authenticated Requestor can set a request location';
  end if;

  select status
  into request_status
  from public.requests
  where id = p_request_id
    and requestor_id = caller_id;

  if request_status is null then
    raise exception 'The request was not found';
  end if;

  if request_status not in ('OPEN', 'ACCEPTED') then
    raise exception 'The approximate location can no longer be changed after work has started';
  end if;

  if (p_latitude is null) <> (p_longitude is null) then
    raise exception 'Latitude and longitude must be provided together';
  end if;

  if p_latitude is not null
    and (
      p_latitude not between -90 and 90
      or p_longitude not between -180 and 180
    ) then
    raise exception 'The coordinates are outside the valid geographic range';
  end if;

  update public.requests
  set
    -- Two decimal places is approximately neighborhood-level precision.
    -- The precise device coordinates are never persisted.
    approximate_latitude = case
      when p_latitude is null then null
      else round(p_latitude, 2)
    end,
    approximate_longitude = case
      when p_longitude is null then null
      else round(p_longitude, 2)
    end
  where id = p_request_id
    and requestor_id = caller_id
  returning * into updated_request;

  return updated_request;
end;
$$;

create or replace function public.save_request_location_and_geography(
  p_request_id uuid,
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
  p_approximate_longitude numeric
)
returns public.request_locations
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_location public.request_locations%rowtype;
begin
  saved_location := public.save_request_location(
    p_request_id,
    p_fulfillment_type,
    p_pickup_address,
    p_pickup_landmark,
    p_pickup_instructions,
    p_delivery_address,
    p_delivery_landmark,
    p_delivery_instructions,
    p_contact_name,
    p_contact_phone
  );

  perform public.set_request_approximate_location(
    p_request_id,
    p_approximate_latitude,
    p_approximate_longitude
  );

  return saved_location;
end;
$$;

create or replace function public.create_request_with_location_and_geography(
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
  p_approximate_longitude numeric
)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_request public.requests%rowtype;
begin
  created_request := public.create_request_with_location(
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
    p_contact_phone
  );

  perform public.set_request_approximate_location(
    created_request.id,
    p_approximate_latitude,
    p_approximate_longitude
  );

  return created_request;
end;
$$;

create or replace function public.update_open_request_with_location_and_geography(
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
  p_approximate_longitude numeric
)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_request public.requests%rowtype;
begin
  updated_request := public.update_open_request_with_location(
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
    p_contact_phone
  );

  perform public.set_request_approximate_location(
    updated_request.id,
    p_approximate_latitude,
    p_approximate_longitude
  );

  return updated_request;
end;
$$;

revoke all on function public.set_request_approximate_location(uuid, numeric, numeric)
from public, anon;
revoke all on function public.save_request_location_and_geography(
  uuid, text, text, text, text, text, text, text, text, text, numeric, numeric
) from public, anon;
revoke all on function public.create_request_with_location_and_geography(
  bigint, text, text, text, numeric, numeric, timestamptz,
  text, text, text, text, text, text, text, text, text, numeric, numeric
) from public, anon;
revoke all on function public.update_open_request_with_location_and_geography(
  uuid, bigint, text, text, text, numeric, numeric, timestamptz,
  text, text, text, text, text, text, text, text, text, numeric, numeric
) from public, anon;

grant execute on function public.set_request_approximate_location(uuid, numeric, numeric)
to authenticated;
grant execute on function public.save_request_location_and_geography(
  uuid, text, text, text, text, text, text, text, text, text, numeric, numeric
) to authenticated;
grant execute on function public.create_request_with_location_and_geography(
  bigint, text, text, text, numeric, numeric, timestamptz,
  text, text, text, text, text, text, text, text, text, numeric, numeric
) to authenticated;
grant execute on function public.update_open_request_with_location_and_geography(
  uuid, bigint, text, text, text, numeric, numeric, timestamptz,
  text, text, text, text, text, text, text, text, text, numeric, numeric
) to authenticated;

comment on column public.requests.approximate_latitude is
'Public neighborhood-level latitude rounded server-side to two decimal places. Not an exact address.';

comment on column public.requests.approximate_longitude is
'Public neighborhood-level longitude rounded server-side to two decimal places. Not an exact address.';

comment on function public.set_request_approximate_location(uuid, numeric, numeric) is
'Accepts a Requestor location, persists only a two-decimal approximation, and permits clearing with two null values.';

commit;
