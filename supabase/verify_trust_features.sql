-- Run after supabase/migrations/018_trust_features.sql.
-- This script performs structural checks only and does not create test data.

select
  to_regclass('public.request_ratings') as request_ratings,
  to_regclass('public.account_blocks') as account_blocks,
  to_regclass('public.account_reports') as account_reports;

select
  routine_name,
  security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'get_request_trust_context',
    'submit_request_rating',
    'set_account_block',
    'submit_account_report',
    'admin_list_account_reports',
    'admin_resolve_account_report'
  )
order by routine_name;

select
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'request_ratings',
    'account_blocks',
    'account_reports',
    'requests'
  )
order by tablename, policyname;

select
  event_object_table,
  trigger_name,
  action_timing,
  event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name in (
    'requests_enforce_match_block',
    'requests_enforce_creation_limits',
    'account_reports_set_updated_at',
    'account_reports_audit_admin_resolution'
  )
order by trigger_name;

select
  has_table_privilege('anon', 'public.request_ratings', 'insert')
    as anon_can_insert_rating,
  has_table_privilege('authenticated', 'public.request_ratings', 'insert')
    as authenticated_can_direct_insert_rating,
  has_table_privilege('authenticated', 'public.account_blocks', 'insert')
    as authenticated_can_direct_insert_block,
  has_table_privilege('authenticated', 'public.account_reports', 'insert')
    as authenticated_can_direct_insert_report;
