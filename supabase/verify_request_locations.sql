-- Read-only verification for supabase/migrations/004_request_locations.sql.

select table_name, 'present' as status
from information_schema.tables
where table_schema = 'public' and table_name = 'request_locations';

select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relnamespace = 'public'::regnamespace and relname = 'request_locations';

select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public' and tablename = 'request_locations';

select routine_name, routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'save_request_location',
    'create_request_with_location',
    'update_open_request_with_location',
    'start_request'
  )
order by routine_name;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'request_locations'
order by grantee, privilege_type;
