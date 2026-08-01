-- Run after supabase/migrations/020_account_deletion_requests.sql.

-- Expected: account_deletion_requests has RLS enabled and profiles includes
-- anonymized_at.
select
  relation.relname as table_name,
  relation.relrowsecurity as rls_enabled
from pg_class as relation
join pg_namespace as schema on schema.oid = relation.relnamespace
where schema.nspname = 'public'
  and relation.relname = 'account_deletion_requests';

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name = 'anonymized_at';

-- Expected: six public RPCs and two private helpers.
select routine_schema, routine_name, security_type
from information_schema.routines
where (
  routine_schema = 'public'
  and routine_name in (
    'get_my_account_deletion_request',
    'request_account_deletion',
    'cancel_account_deletion',
    'admin_list_account_deletion_requests',
    'admin_complete_account_anonymization',
    'admin_list_accounts'
  )
)
or (
  routine_schema = 'private'
  and routine_name in (
    'account_deletion_blockers',
    'protect_anonymized_account_control'
  )
)
order by routine_schema, routine_name;

-- Expected: browser roles have SELECT only. Writes happen through guarded RPCs.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'account_deletion_requests'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;

-- Expected: one partial unique index for pending requests and one queue index.
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'account_deletion_requests'
order by indexname;

-- Manual authenticated-user checks:
-- 1. An account with an OPEN request cannot request deletion.
-- 2. With no blockers, request_account_deletion('DELETE MY ACCOUNT', null)
--    creates one PENDING row scheduled at least seven days later.
-- 3. A second pending request is rejected, and creating/accepting a new
--    marketplace request is blocked.
-- 4. cancel_account_deletion() works only before scheduled_for.

-- Manual Admin checks after advancing only a fictional test row's
-- scheduled_for in SQL:
-- 1. A normal user cannot call either Admin RPC.
-- 2. A pending row with any blocker cannot be processed.
-- 3. A ready row requires the exact ANONYMIZE phrase.
-- 4. Completion sets profiles.anonymized_at, replaces identifying profile
--    fields, removes saved addresses/notifications, redacts owned request
--    location snapshots, records ACCOUNT_ANONYMIZED, and leaves requests intact.
-- 5. Restoring or changing the anonymized account restriction is rejected.

-- Expected after normal verification: zero rows. Never run the Admin
-- anonymization RPC against a real account as a test.
select id, account_id, status, scheduled_for
from public.account_deletion_requests
where status = 'PENDING'
  and scheduled_for <= now();
