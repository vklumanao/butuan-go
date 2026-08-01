-- Run after supabase/migrations/023_in_app_feedback.sql.

-- Expected: RLS=true and no direct authenticated table privileges.
select
  namespace.nspname as table_schema,
  relation.relname as table_name,
  relation.relrowsecurity as row_security,
  has_table_privilege(
    'authenticated',
    'public.user_feedback',
    'SELECT'
  ) as authenticated_can_select,
  has_table_privilege(
    'authenticated',
    'public.user_feedback',
    'INSERT'
  ) as authenticated_can_insert,
  has_table_privilege(
    'authenticated',
    'public.user_feedback',
    'UPDATE'
  ) as authenticated_can_update,
  has_table_privilege(
    'authenticated',
    'public.user_feedback',
    'DELETE'
  ) as authenticated_can_delete
from pg_class as relation
join pg_namespace as namespace on namespace.oid = relation.relnamespace
where namespace.nspname = 'public'
  and relation.relname = 'user_feedback';

-- Expected: all three routines are security-definer with an empty search path.
select
  namespace.nspname as routine_schema,
  procedure.proname as routine_name,
  pg_get_function_identity_arguments(procedure.oid) as arguments,
  procedure.prosecdef as security_definer,
  procedure.proconfig as routine_config
from pg_proc as procedure
join pg_namespace as namespace on namespace.oid = procedure.pronamespace
where namespace.nspname = 'public'
  and procedure.proname in (
    'submit_user_feedback',
    'admin_list_user_feedback',
    'admin_update_user_feedback'
  )
order by procedure.proname;

-- Expected: authenticated=true and anon=false for each routine.
select
  has_function_privilege(
    'authenticated',
    'public.submit_user_feedback(text,text,text,text)',
    'EXECUTE'
  ) as authenticated_can_submit,
  has_function_privilege(
    'anon',
    'public.submit_user_feedback(text,text,text,text)',
    'EXECUTE'
  ) as anon_can_submit,
  has_function_privilege(
    'authenticated',
    'public.admin_list_user_feedback(text,text,integer,integer)',
    'EXECUTE'
  ) as authenticated_can_call_admin_list,
  has_function_privilege(
    'anon',
    'public.admin_list_user_feedback(text,text,integer,integer)',
    'EXECUTE'
  ) as anon_can_call_admin_list,
  has_function_privilege(
    'authenticated',
    'public.admin_update_user_feedback(uuid,text,text)',
    'EXECUTE'
  ) as authenticated_can_call_admin_update,
  has_function_privilege(
    'anon',
    'public.admin_update_user_feedback(uuid,text,text)',
    'EXECUTE'
  ) as anon_can_call_admin_update;

-- Expected: USER_FEEDBACK_UPDATED and user_feedback are allowed audit values.
select
  pg_get_constraintdef(action_constraint.oid) as action_constraint,
  pg_get_constraintdef(entity_constraint.oid) as entity_constraint
from pg_constraint as action_constraint
cross join pg_constraint as entity_constraint
where action_constraint.conname = 'admin_audit_events_action_check'
  and entity_constraint.conname = 'admin_audit_events_entity_type_check';

-- Run through the API while signed in as a normal Requestor or Runner.
-- Expected: returns one NEW row with the caller's account and workspace role.
-- select public.submit_user_feedback(
--   'CONFUSING_EXPERIENCE',
--   'I was unsure which action to choose on this page.',
--   '/requestor/requests/example',
--   'Request Details'
-- );

-- Expected for a non-Admin: both calls fail with an Admin-only message.
-- select * from public.admin_list_user_feedback('NEW', 'ALL', 50, 0);
-- select public.admin_update_user_feedback(
--   'REPLACE_WITH_FEEDBACK_ID'::uuid,
--   'REVIEWED',
--   'Reviewed during manual verification.'
-- );

-- Run through the API while signed in as the trusted Admin.
-- Expected: rows are visible and total_count matches the filtered queue.
-- select * from public.admin_list_user_feedback('ALL', 'ALL', 50, 0);

-- Optional cleanup for the manual test row. Run only in a test environment
-- with trusted SQL editor access, not through the browser application.
-- delete from public.user_feedback
-- where message = 'I was unsure which action to choose on this page.';
