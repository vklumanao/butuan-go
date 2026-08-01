-- Read-only verification for
-- supabase/migrations/024_optional_saved_address_contacts.sql.

-- Expected: recipient_name and phone_number are nullable.
select
  column_name,
  is_nullable,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'saved_addresses'
  and column_name in ('recipient_name', 'phone_number')
order by column_name;

-- Expected: both checks allow null or enforce the documented length range.
select
  constraint_name,
  check_clause
from information_schema.check_constraints
where constraint_schema = 'public'
  and constraint_name in (
    'saved_addresses_recipient_name_check',
    'saved_addresses_phone_number_check'
  )
order by constraint_name;

-- Expected: security_definer=true, an empty search path, authenticated=true,
-- and anon=false.
select
  procedure.prosecdef as security_definer,
  procedure.proconfig as routine_config,
  has_function_privilege(
    'authenticated',
    'public.save_saved_address(uuid,text,text,text,text,text,text,boolean)',
    'EXECUTE'
  ) as authenticated_can_execute,
  has_function_privilege(
    'anon',
    'public.save_saved_address(uuid,text,text,text,text,text,text,boolean)',
    'EXECUTE'
  ) as anon_can_execute
from pg_proc as procedure
join pg_namespace as namespace on namespace.oid = procedure.pronamespace
where namespace.nspname = 'public'
  and procedure.proname = 'save_saved_address';

-- Run through the API while signed in, then remove the row in a test
-- environment. Expected: both optional contact columns are null.
-- select public.save_saved_address(
--   null,
--   'Test place',
--   null,
--   null,
--   '123 Test Street, Butuan City',
--   null,
--   'Call at the gate',
--   false
-- );
