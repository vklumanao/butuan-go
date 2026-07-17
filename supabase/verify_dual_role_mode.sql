-- Read-only verification for supabase/migrations/009_dual_role_mode.sql.

select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in ('role', 'active_role')
order by ordinal_position;

select constraint_name, check_clause
from information_schema.check_constraints
where constraint_schema = 'public'
  and constraint_name = 'profiles_active_role_check';

select routine_schema, routine_name, routine_type, security_type
from information_schema.routines
where (routine_schema = 'public' and routine_name = 'switch_active_role')
   or (routine_schema = 'private' and routine_name = 'current_profile_role')
order by routine_schema, routine_name;

select role, active_role, count(*) as account_count
from public.profiles
group by role, active_role
order by role, active_role;

select count(*) as invalid_active_role_count
from public.profiles
where active_role is null
   or active_role not in ('requestor', 'runner', 'admin');
