-- ButuanGo Milestone 2: private pickup and delivery details.
-- Run after supabase/migrations/003_notifications.sql.

begin;

alter table public.notifications
drop constraint if exists notifications_type_check;

alter table public.notifications
add constraint notifications_type_check check (
  type in (
    'REQUEST_ACCEPTED',
    'REQUEST_STARTED',
    'COMPLETION_SUBMITTED',
    'REQUEST_COMPLETED',
    'LOCATION_UPDATED'
  )
);

create table if not exists public.request_locations (
  request_id uuid primary key references public.requests(id) on delete cascade,
  fulfillment_type text not null check (
    fulfillment_type in ('pickup_only', 'delivery', 'purchase_and_deliver', 'on_site')
  ),
  pickup_address text check (
    pickup_address is null
    or char_length(trim(pickup_address)) between 5 and 300
  ),
  pickup_landmark text check (
    pickup_landmark is null
    or char_length(trim(pickup_landmark)) between 2 and 200
  ),
  pickup_instructions text check (
    pickup_instructions is null
    or char_length(trim(pickup_instructions)) between 2 and 500
  ),
  delivery_address text check (
    delivery_address is null
    or char_length(trim(delivery_address)) between 5 and 300
  ),
  delivery_landmark text check (
    delivery_landmark is null
    or char_length(trim(delivery_landmark)) between 2 and 200
  ),
  delivery_instructions text check (
    delivery_instructions is null
    or char_length(trim(delivery_instructions)) between 2 and 500
  ),
  contact_name text not null check (char_length(trim(contact_name)) between 2 and 120),
  contact_phone text not null check (char_length(trim(contact_phone)) between 7 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint request_locations_required_addresses check (
    (fulfillment_type = 'pickup_only' and pickup_address is not null)
    or
    (fulfillment_type in ('delivery', 'purchase_and_deliver')
      and pickup_address is not null and delivery_address is not null)
    or
    (fulfillment_type = 'on_site' and delivery_address is not null)
  )
);

drop trigger if exists request_locations_set_updated_at on public.request_locations;
create trigger request_locations_set_updated_at
before update on public.request_locations
for each row execute function public.set_updated_at();

alter table public.request_locations enable row level security;

drop policy if exists "Participants can read private request locations" on public.request_locations;
create policy "Participants can read private request locations"
on public.request_locations for select to authenticated
using (
  exists (
    select 1
    from public.requests as request
    where request.id = request_locations.request_id
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

revoke all on table public.request_locations from anon, authenticated;
grant select on table public.request_locations to authenticated;

create or replace function public.save_request_location(
  p_request_id uuid,
  p_fulfillment_type text,
  p_pickup_address text default null,
  p_pickup_landmark text default null,
  p_pickup_instructions text default null,
  p_delivery_address text default null,
  p_delivery_landmark text default null,
  p_delivery_instructions text default null,
  p_contact_name text default null,
  p_contact_phone text default null
)
returns public.request_locations
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request_status text;
  request_runner_id uuid;
  request_title text;
  saved_location public.request_locations%rowtype;
begin
  if caller_id is null or (select private.current_profile_role()) is distinct from 'requestor' then
    raise exception 'Only an authenticated Requestor can save private location details';
  end if;

  select status, runner_id, title
  into request_status, request_runner_id, request_title
  from public.requests
  where id = p_request_id and requestor_id = caller_id;

  if request_status is null then
    raise exception 'The request was not found';
  end if;
  if request_status not in ('OPEN', 'ACCEPTED') then
    raise exception 'Location details can no longer be changed after work has started';
  end if;
  if p_fulfillment_type is null
    or p_fulfillment_type not in ('pickup_only', 'delivery', 'purchase_and_deliver', 'on_site') then
    raise exception 'Choose a valid fulfillment type';
  end if;
  if p_contact_name is null or char_length(trim(p_contact_name)) not between 2 and 120 then
    raise exception 'A contact name between 2 and 120 characters is required';
  end if;
  if p_contact_phone is null or char_length(trim(p_contact_phone)) not between 7 and 30 then
    raise exception 'A contact phone number between 7 and 30 characters is required';
  end if;
  if p_fulfillment_type in ('pickup_only', 'delivery', 'purchase_and_deliver')
    and (p_pickup_address is null or char_length(trim(p_pickup_address)) not between 5 and 300) then
    raise exception 'A valid pickup address is required';
  end if;
  if p_fulfillment_type in ('delivery', 'purchase_and_deliver', 'on_site')
    and (p_delivery_address is null or char_length(trim(p_delivery_address)) not between 5 and 300) then
    raise exception 'A valid delivery or destination address is required';
  end if;

  insert into public.request_locations (
    request_id,
    fulfillment_type,
    pickup_address,
    pickup_landmark,
    pickup_instructions,
    delivery_address,
    delivery_landmark,
    delivery_instructions,
    contact_name,
    contact_phone
  )
  values (
    p_request_id,
    p_fulfillment_type,
    case when p_fulfillment_type = 'on_site' then null else nullif(trim(p_pickup_address), '') end,
    case when p_fulfillment_type = 'on_site' then null else nullif(trim(p_pickup_landmark), '') end,
    case when p_fulfillment_type = 'on_site' then null else nullif(trim(p_pickup_instructions), '') end,
    case when p_fulfillment_type = 'pickup_only' then null else nullif(trim(p_delivery_address), '') end,
    case when p_fulfillment_type = 'pickup_only' then null else nullif(trim(p_delivery_landmark), '') end,
    case when p_fulfillment_type = 'pickup_only' then null else nullif(trim(p_delivery_instructions), '') end,
    trim(p_contact_name),
    trim(p_contact_phone)
  )
  on conflict (request_id) do update
  set
    fulfillment_type = excluded.fulfillment_type,
    pickup_address = excluded.pickup_address,
    pickup_landmark = excluded.pickup_landmark,
    pickup_instructions = excluded.pickup_instructions,
    delivery_address = excluded.delivery_address,
    delivery_landmark = excluded.delivery_landmark,
    delivery_instructions = excluded.delivery_instructions,
    contact_name = excluded.contact_name,
    contact_phone = excluded.contact_phone
  returning * into saved_location;

  if request_status = 'ACCEPTED' and request_runner_id is not null then
    insert into public.notifications (user_id, request_id, type, title, message)
    values (
      request_runner_id,
      p_request_id,
      'LOCATION_UPDATED',
      'Location details updated',
      format('The Requestor updated the private location details for: %s', request_title)
    );
  end if;

  return saved_location;
end;
$$;

create or replace function public.create_request_with_location(
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
  p_contact_phone text
)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_request public.requests%rowtype;
begin
  created_request := public.create_request(
    p_category_id,
    p_title,
    p_description,
    p_area,
    p_expense_budget,
    p_service_fee,
    p_due_at
  );

  perform public.save_request_location(
    created_request.id,
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

  return created_request;
end;
$$;

create or replace function public.update_open_request_with_location(
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
  p_contact_phone text
)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_request public.requests%rowtype;
begin
  updated_request := public.update_open_request(
    p_request_id,
    p_category_id,
    p_title,
    p_description,
    p_area,
    p_expense_budget,
    p_service_fee,
    p_due_at
  );

  perform public.save_request_location(
    updated_request.id,
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

  return updated_request;
end;
$$;

create or replace function public.start_request(p_request_id uuid)
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
    raise exception 'Only an authenticated Runner can start a task';
  end if;
  if not exists (
    select 1 from public.request_locations where request_id = p_request_id
  ) then
    raise exception 'This task cannot be started because its private location details are incomplete';
  end if;

  update public.requests
  set status = 'IN_PROGRESS', started_at = now()
  where id = p_request_id and runner_id = caller_id and status = 'ACCEPTED'
  returning * into updated_request;

  if updated_request.id is null then
    raise exception 'The task was not found or cannot be started';
  end if;
  return updated_request;
end;
$$;

revoke execute on function public.create_request(bigint, text, text, text, numeric, numeric, timestamptz) from authenticated;
revoke execute on function public.update_open_request(uuid, bigint, text, text, text, numeric, numeric, timestamptz) from authenticated;

revoke all on function public.save_request_location(uuid, text, text, text, text, text, text, text, text, text) from public, anon;
revoke all on function public.create_request_with_location(bigint, text, text, text, numeric, numeric, timestamptz, text, text, text, text, text, text, text, text, text) from public, anon;
revoke all on function public.update_open_request_with_location(uuid, bigint, text, text, text, numeric, numeric, timestamptz, text, text, text, text, text, text, text, text, text) from public, anon;

grant execute on function public.save_request_location(uuid, text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.create_request_with_location(bigint, text, text, text, numeric, numeric, timestamptz, text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.update_open_request_with_location(uuid, bigint, text, text, text, numeric, numeric, timestamptz, text, text, text, text, text, text, text, text, text) to authenticated;

comment on table public.request_locations is
'Exact private pickup and delivery details. Visible only to the Requestor and assigned Runner through RLS.';

commit;
