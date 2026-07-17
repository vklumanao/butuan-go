-- Read-only verification for supabase/migrations/007_saved_addresses.sql.

select table_name, 'present' as status
from information_schema.tables
where table_schema = 'public' and table_name = 'saved_addresses';

select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relnamespace = 'public'::regnamespace and relname = 'saved_addresses';

select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public' and tablename = 'saved_addresses';

select routine_name, routine_type, security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'save_saved_address',
    'set_default_saved_address',
    'delete_saved_address'
  )
order by routine_name;

select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'saved_addresses'
order by indexname;

select user_id, count(*) as default_count
from public.saved_addresses
where is_default = true
group by user_id
having count(*) > 1;
