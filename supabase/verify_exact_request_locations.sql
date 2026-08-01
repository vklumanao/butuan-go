-- Run after applying migration 026_exact_request_locations.sql.
-- Read-only structural and data consistency checks.

begin;

do $$
declare
  missing_columns text[];
begin
  select array_agg(required.column_name order by required.column_name)
  into missing_columns
  from (
    values
      ('exact_latitude'),
      ('exact_longitude'),
      ('destination_exact_latitude'),
      ('destination_exact_longitude')
  ) as required(column_name)
  where not exists (
    select 1
    from information_schema.columns as column_info
    where column_info.table_schema = 'public'
      and column_info.table_name = 'request_locations'
      and column_info.column_name = required.column_name
  );

  if missing_columns is not null then
    raise exception 'Missing exact location columns: %', missing_columns;
  end if;
end;
$$;

do $$
declare
  function_name text;
begin
  foreach function_name in array array[
    'create_request_with_exact_locations',
    'update_open_request_with_exact_locations',
    'save_request_exact_locations'
  ]
  loop
    if not exists (
      select 1
      from pg_proc as procedure
      join pg_namespace as namespace on namespace.oid = procedure.pronamespace
      where namespace.nspname = 'public'
        and procedure.proname = function_name
        and procedure.prosecdef
        and exists (
          select 1
          from unnest(procedure.proconfig) as setting
          where setting like 'search_path=%'
        )
    ) then
      raise exception 'Missing secured exact-location RPC: %', function_name;
    end if;

    if exists (
      select 1
      from pg_proc as procedure
      join pg_namespace as namespace on namespace.oid = procedure.pronamespace
      where namespace.nspname = 'public'
        and procedure.proname = function_name
        and (
          has_function_privilege('anon', procedure.oid, 'EXECUTE')
          or exists (
            select 1
            from aclexplode(
              coalesce(
                procedure.proacl,
                acldefault('f', procedure.proowner)
              )
            ) as privilege
            where privilege.grantee = 0
              and privilege.privilege_type = 'EXECUTE'
          )
        )
    ) then
      raise exception 'Anonymous or PUBLIC execution remains on %', function_name;
    end if;
  end loop;
end;
$$;

do $$
declare
  function_name text;
begin
  foreach function_name in array array[
    'set_request_approximate_location',
    'save_request_location',
    'save_request_location_and_geography',
    'create_request_with_payment_terms',
    'update_open_request_with_payment_terms',
    'create_request_with_scenario',
    'update_open_request_with_scenario',
    'save_request_scenario_location'
  ]
  loop
    if exists (
      select 1
      from pg_proc as procedure
      join pg_namespace as namespace on namespace.oid = procedure.pronamespace
      where namespace.nspname = 'public'
        and procedure.proname = function_name
        and has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
    ) then
      raise exception 'Legacy request writer remains callable: %', function_name;
    end if;
  end loop;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_class as table_info
    join pg_namespace as namespace on namespace.oid = table_info.relnamespace
    where namespace.nspname = 'public'
      and table_info.relname = 'request_locations'
      and table_info.relrowsecurity
  ) then
    raise exception 'RLS is not enabled on private request locations';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'request_locations'
      and policyname = 'Participants can read private request locations'
  ) then
    raise exception 'Participant-only request location policy is missing';
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from public.request_locations as location
    join public.requests as request on request.id = location.request_id
    where location.exact_latitude is not null
      and (
        request.approximate_latitude is distinct from round(location.exact_latitude, 2)
        or request.approximate_longitude is distinct from round(location.exact_longitude, 2)
      )
  ) then
    raise exception 'A primary public zone does not match its derived exact pin';
  end if;

  if exists (
    select 1
    from public.request_locations as location
    join public.requests as request on request.id = location.request_id
    where location.destination_exact_latitude is not null
      and (
        request.approximate_destination_latitude is distinct from
          round(location.destination_exact_latitude, 2)
        or request.approximate_destination_longitude is distinct from
          round(location.destination_exact_longitude, 2)
      )
  ) then
    raise exception 'A destination public zone does not match its derived exact pin';
  end if;
end;
$$;

select
  'manual:create_on_site' as check_name,
  'Create an on-site request with one exact pin; confirm one public zone and a private exact pin.' as expected_result
union all
select
  'manual:create_pickup_delivery',
  'Create a pickup-and-delivery request with two pins; confirm two public zones.'
union all
select
  'manual:runner_before_acceptance',
  'As an unassigned Runner, request_locations must return no row and only public zones must be visible.'
union all
select
  'manual:runner_after_acceptance',
  'After acceptance, the assigned Runner can open exact pins and addresses.'
union all
select
  'manual:location_edit',
  'Edit an OPEN request location and confirm both exact and derived public coordinates change.';

rollback;
