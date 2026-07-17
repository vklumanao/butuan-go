-- Read-only verification for supabase/migrations/006_runner_capacity.sql.

select trigger_name, event_manipulation, action_timing
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table = 'requests'
  and trigger_name = 'requests_enforce_runner_capacity';

select routine_schema, routine_name, routine_type, security_type
from information_schema.routines
where routine_schema in ('private', 'public')
  and routine_name in ('enforce_runner_capacity', 'accept_request')
order by routine_schema, routine_name;

select runner_id, count(*) as execution_active_tasks
from public.requests
where runner_id is not null
  and status in ('ACCEPTED', 'IN_PROGRESS')
group by runner_id
having count(*) > 1;

-- The final query should normally return zero rows. If old test data already
-- contains duplicates, those tasks can progress normally, but that Runner
-- cannot accept another request until only zero execution-active tasks remain.
