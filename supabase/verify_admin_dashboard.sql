-- Run after supabase/migrations/017_admin_dashboard.sql.

-- Expected: admin_audit_events with RLS enabled.
select
  relation.relname as table_name,
  relation.relrowsecurity as rls_enabled
from pg_class as relation
join pg_namespace as schema on schema.oid = relation.relnamespace
where schema.nspname = 'public'
  and relation.relname = 'admin_audit_events';

-- Expected: five public Admin read RPCs and two private audit functions.
select routine_schema, routine_name
from information_schema.routines
where (
    routine_schema = 'public'
    and routine_name in (
      'admin_get_dashboard_summary',
      'admin_list_accounts',
      'admin_list_requests',
      'admin_list_disputes',
      'admin_list_audit_events'
    )
  )
  or (
    routine_schema = 'private'
    and routine_name in (
      'audit_admin_dispute_resolution',
      'audit_admin_account_restriction'
    )
  )
order by routine_schema, routine_name;

-- Expected: both audit triggers enabled.
select
  relation.relname as table_name,
  trigger.tgname as trigger_name,
  trigger.tgenabled as enabled
from pg_trigger as trigger
join pg_class as relation on relation.oid = trigger.tgrelid
join pg_namespace as schema on schema.oid = relation.relnamespace
where schema.nspname = 'public'
  and trigger.tgname in (
    'request_disputes_audit_admin_resolution',
    'account_restrictions_audit_admin_change'
  )
  and not trigger.tgisinternal
order by relation.relname;

-- Expected for anon/authenticated: no direct INSERT, UPDATE, or DELETE grants.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'admin_audit_events'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;

-- Run the following while signed in as a normal user from the API.
-- Expected: every call fails with the Admin-only message.
-- select * from public.admin_get_dashboard_summary();
