-- Read-only verification for supabase/migrations/005_request_participants.sql.

select routine_name, routine_type, security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'get_request_participants';

select routine_name, grantee, privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name = 'get_request_participants'
order by grantee;

select trigger_name, event_manipulation, action_timing
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table = 'requests'
  and trigger_name = 'requests_create_notification';

-- Functional authorization is best verified with real Requestor, assigned
-- Runner, and unrelated Runner sessions through the application.
