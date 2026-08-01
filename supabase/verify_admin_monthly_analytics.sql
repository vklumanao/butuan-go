-- Run after supabase/migrations/021_admin_monthly_analytics.sql.

-- Expected: one security-definer JSONB RPC with an empty search path.
select
  namespace.nspname as routine_schema,
  procedure.proname as routine_name,
  pg_get_function_result(procedure.oid) as result_type,
  procedure.prosecdef as security_definer,
  procedure.proconfig as routine_config
from pg_proc as procedure
join pg_namespace as namespace on namespace.oid = procedure.pronamespace
where namespace.nspname = 'public'
  and procedure.proname = 'admin_get_monthly_analytics'
  and pg_get_function_identity_arguments(procedure.oid) = 'p_month date';

-- Expected: authenticated=true; anon=false.
select
  has_function_privilege(
    'authenticated',
    'public.admin_get_monthly_analytics(date)',
    'EXECUTE'
  ) as authenticated_can_execute,
  has_function_privilege(
    'anon',
    'public.admin_get_monthly_analytics(date)',
    'EXECUTE'
  ) as anon_can_execute;

-- Run through the API while signed in as a normal non-Admin user.
-- Expected: fails with "Only an Admin can view monthly analytics".
-- select public.admin_get_monthly_analytics(current_date);

-- Run through the API while signed in as the trusted Admin.
-- Expected: one JSON object containing period, summary, daily_activity, and
-- request_statuses. For the current month, daily_activity contains every
-- elapsed day through today; historical months contain every day in the month.
-- select jsonb_pretty(public.admin_get_monthly_analytics(current_date));

-- Optional structural checks for an Admin response.
-- with analytics as (
--   select public.admin_get_monthly_analytics(current_date) as payload
-- )
-- select
--   payload ?& array[
--     'period', 'summary', 'daily_activity', 'request_statuses'
--   ] as has_required_sections,
--   jsonb_array_length(payload -> 'daily_activity') as calendar_day_count,
--   jsonb_array_length(payload -> 'request_statuses') as status_count
-- from analytics;
