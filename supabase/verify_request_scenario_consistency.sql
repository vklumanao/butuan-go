-- Read-only verification for
-- supabase/migrations/025_request_scenario_consistency.sql.

-- Expected: scenario_type is non-null; coarse destination coordinates and
-- requestor-presence confirmation exist with the documented types.
select
  table_name,
  column_name,
  is_nullable,
  data_type
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'requests' and column_name in (
      'scenario_type',
      'approximate_destination_latitude',
      'approximate_destination_longitude'
    ))
    or
    (table_name = 'request_locations' and column_name in (
      'pickup_contact_name',
      'pickup_contact_phone',
      'destination_contact_name',
      'destination_contact_phone',
      'contact_is_requestor'
    ))
    or
    (table_name = 'request_payment_terms'
      and column_name = 'requestor_present_at_handoff')
  )
order by table_name, column_name;

-- Expected: no existing request is missing a scenario after backfill.
select count(*) as requests_without_scenario
from public.requests
where scenario_type is null;

-- Expected: no partial destination coordinate pair exists.
select count(*) as incomplete_destination_coordinate_pairs
from public.requests
where (approximate_destination_latitude is null)
  <> (approximate_destination_longitude is null);

-- Expected: all three public RPCs are security-definer functions with an empty
-- search path. Authenticated can execute; anon cannot execute.
select
  procedure.proname,
  procedure.prosecdef as security_definer,
  procedure.proconfig as routine_config,
  has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
    as authenticated_can_execute,
  has_function_privilege('anon', procedure.oid, 'EXECUTE')
    as anon_can_execute
from pg_proc as procedure
join pg_namespace as namespace on namespace.oid = procedure.pronamespace
where namespace.nspname = 'public'
  and procedure.proname in (
    'create_request_with_scenario',
    'update_open_request_with_scenario',
    'save_request_scenario_location'
  )
order by procedure.proname;

-- Expected: authenticated cannot execute either private helper.
select
  procedure.proname,
  has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
    as authenticated_can_execute
from pg_proc as procedure
join pg_namespace as namespace on namespace.oid = procedure.pronamespace
where namespace.nspname = 'private'
  and procedure.proname in (
    'validate_request_scenario_inputs',
    'persist_request_scenario_details',
    'scrub_scenario_contacts_after_anonymization'
  )
order by procedure.proname;

-- Expected: one enabled trigger preserves account-anonymization cleanup for
-- the new private contact columns.
select
  trigger.tgname,
  trigger.tgenabled
from pg_trigger as trigger
join pg_class as relation on relation.oid = trigger.tgrelid
join pg_namespace as namespace on namespace.oid = relation.relnamespace
where namespace.nspname = 'public'
  and relation.relname = 'profiles'
  and trigger.tgname = 'profiles_scrub_scenario_contacts_after_anonymization'
  and not trigger.tgisinternal;

-- Manual API checks in a test environment:
-- 1. PICKUP_DELIVERY + NO_PURCHASE + two contacts/zones succeeds.
-- 2. PICKUP_DELIVERY + RUNNER_ADVANCE is rejected.
-- 3. PREPAID_DELIVERY + MERCHANT_PREPAID permits order value 0.
-- 4. BUY_DELIVERY + RUNNER_ADVANCE requires a positive maximum amount.
-- 5. Another handoff contact + REQUESTOR payer + absent Requestor is rejected.
-- 6. RECIPIENT payer details that differ from the handoff contact are rejected.
