-- Read-only verification for supabase/migrations/003_notifications.sql.
-- Run in the Supabase SQL Editor after the migration.

select table_name, 'present' as status
from information_schema.tables
where table_schema = 'public'
  and table_name = 'notifications';

select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relnamespace = 'public'::regnamespace
  and relname = 'notifications';

select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'notifications'
order by policyname;

select routine_name, routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('mark_notification_read', 'mark_all_notifications_read')
order by routine_name;

select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
  and tablename = 'notifications';

select trigger_name, event_manipulation, action_timing
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table = 'requests'
  and trigger_name = 'requests_create_notification';
