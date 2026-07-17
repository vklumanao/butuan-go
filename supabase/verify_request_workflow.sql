-- Read-only verification for supabase/migrations/002_request_workflow.sql.
-- Run in the Supabase SQL Editor after the migration.

select
  table_name,
  case when table_name is not null then 'present' else 'missing' end as status
from information_schema.tables
where table_schema = 'public'
  and table_name in ('categories', 'requests', 'request_updates')
order by table_name;

select
  relname as table_name,
  relrowsecurity as rls_enabled
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('categories', 'requests', 'request_updates')
order by relname;

select
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('categories', 'requests', 'request_updates')
order by tablename, policyname;

select
  routine_name,
  routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'create_request',
    'update_open_request',
    'cancel_open_request',
    'accept_request',
    'start_request',
    'submit_request_completion',
    'confirm_request_completion'
  )
order by routine_name;

select slug, name, is_active, display_order
from public.categories
order by display_order, name;
