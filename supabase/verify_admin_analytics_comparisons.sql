-- Run after supabase/migrations/022_admin_analytics_comparisons.sql.

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
-- Expected: all checks are true; funnel stages=5; statuses=7.
-- with analytics as (
--   select public.admin_get_monthly_analytics(current_date) as payload
-- )
-- select
--   payload ?& array[
--     'period',
--     'summary',
--     'comparison',
--     'daily_activity',
--     'request_statuses',
--     'request_funnel'
--   ] as has_required_sections,
--   (payload -> 'comparison') ?& array['period', 'summary']
--     as has_comparison_sections,
--   jsonb_array_length(payload -> 'request_funnel') = 5
--     as has_five_funnel_stages,
--   jsonb_array_length(payload -> 'request_statuses') = 7
--     as has_seven_statuses
-- from analytics;

-- Expected: true. Future periods must be rejected by the backend.
-- This block catches the expected exception so verification can continue.
-- do $$
-- begin
--   perform public.admin_get_monthly_analytics(
--     (current_date + interval '2 months')::date
--   );
--   raise exception 'Future-month validation did not run';
-- exception
--   when others then
--     if sqlerrm <> 'Analytics are not available for a future month' then
--       raise;
--     end if;
-- end;
-- $$;

-- Optional Admin review of the full response.
-- select jsonb_pretty(public.admin_get_monthly_analytics(current_date));
