-- Read-only verification for supabase/migrations/008_task_recovery.sql.

select routine_name, routine_type, security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('cancel_open_request', 'release_accepted_request')
order by routine_name;

select routine_name, routine_type, security_type
from information_schema.routines
where routine_schema = 'private'
  and routine_name in (
    'validate_request_change',
    'log_request_change',
    'create_request_notification'
  )
order by routine_name;

select constraint_name, check_clause
from information_schema.check_constraints
where constraint_schema = 'public'
  and constraint_name = 'notifications_type_check';

select type, count(*) as notification_count
from public.notifications
group by type
order by type;

select trigger_name, event_manipulation, action_timing
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table = 'requests'
  and trigger_name in (
    'requests_validate_changes',
    'requests_log_changes',
    'requests_create_notification',
    'requests_enforce_runner_capacity'
  )
order by trigger_name, event_manipulation;

select status, count(*) as request_count
from public.requests
group by status
order by status;
