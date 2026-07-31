-- Run after supabase/migrations/019_account_lifecycle.sql.
-- Structural checks only; this script does not change account access.

select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'account_restrictions'
  and column_name in ('access_level', 'restricted_until')
order by column_name;

select
  routine_schema,
  routine_name,
  security_type
from information_schema.routines
where routine_schema in ('public', 'private')
  and routine_name in (
    'account_access_level',
    'account_is_read_only',
    'get_my_account_access',
    'admin_set_account_access',
    'admin_restore_account_access',
    'admin_list_accounts'
  )
order by routine_schema, routine_name;

select
  event_object_table,
  trigger_name,
  action_timing,
  event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name like '%account_read_only%'
order by event_object_table, trigger_name, event_manipulation;

select
  policyname,
  cmd,
  roles
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname in (
    'Assigned runners can upload receipt files',
    'Assigned runners can remove receipt files'
  )
order by policyname;

select
  has_function_privilege(
    'authenticated',
    'public.admin_set_account_access(uuid,text,text,integer)',
    'execute'
  ) as authenticated_can_call_admin_set,
  has_function_privilege(
    'anon',
    'public.admin_set_account_access(uuid,text,text,integer)',
    'execute'
  ) as anon_can_call_admin_set,
  has_function_privilege(
    'authenticated',
    'public.get_my_account_access()',
    'execute'
  ) as authenticated_can_read_own_access;
