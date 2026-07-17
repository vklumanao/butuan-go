-- Read-only verification for supabase/migrations/010_account_saved_addresses.sql.

select tablename, policyname, roles, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename = 'saved_addresses'
order by policyname;

select routine_name, routine_type, security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'save_saved_address',
    'set_default_saved_address',
    'delete_saved_address'
  )
order by routine_name;

select user_id, count(*) as saved_address_count,
  count(*) filter (where is_default) as default_count
from public.saved_addresses
group by user_id
order by user_id;

select user_id, count(*) as duplicate_default_count
from public.saved_addresses
where is_default = true
group by user_id
having count(*) > 1;
