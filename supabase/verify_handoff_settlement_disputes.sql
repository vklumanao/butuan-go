-- Run after supabase/migrations/014_handoff_settlement_disputes.sql.

-- Expected: five rows, all with rowsecurity = true.
select relname, relrowsecurity
from pg_class
where oid in (
  'public.request_handoffs'::regclass,
  'public.request_settlements'::regclass,
  'public.request_failures'::regclass,
  'public.request_disputes'::regclass,
  'public.account_restrictions'::regclass
)
order by relname;

-- Expected: four SELECT policies. request_handoffs intentionally has none.
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'request_handoffs',
    'request_settlements',
    'request_failures',
    'request_disputes',
    'account_restrictions'
  )
order by tablename, policyname;

-- Expected: zero rows. Direct client writes are denied.
select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'authenticated'
  and table_schema = 'public'
  and table_name in (
    'request_handoffs',
    'request_settlements',
    'request_failures',
    'request_disputes',
    'account_restrictions'
  )
  and privilege_type in ('INSERT', 'UPDATE', 'DELETE');

-- Expected: zero rows. The plaintext handoff code is never table-readable.
select grantee, privilege_type
from information_schema.role_table_grants
where grantee in ('PUBLIC', 'anon', 'authenticated')
  and table_schema = 'public'
  and table_name = 'request_handoffs';

-- Expected: four enabled triggers.
select
  relation.relname as table_name,
  trigger.tgname as trigger_name,
  trigger.tgenabled
from pg_trigger as trigger
join pg_class as relation on relation.oid = trigger.tgrelid
join pg_namespace as namespace on namespace.oid = relation.relnamespace
where namespace.nspname = 'public'
  and not trigger.tgisinternal
  and trigger.tgname in (
    'requests_enforce_account_restrictions',
    'request_receipts_refresh_settlement',
    'request_receipts_freeze_after_handoff',
    'request_price_changes_freeze_after_handoff'
  )
order by trigger.tgname;

-- Expected: twelve rows, all security_definer = true.
select
  routine_name,
  security_type = 'DEFINER' as security_definer
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'get_request_handoff_state',
    'regenerate_request_handoff_code',
    'verify_request_handoff',
    'confirm_request_settlement_received',
    'report_request_failure',
    'acknowledge_request_failure',
    'open_request_dispute',
    'withdraw_request_dispute',
    'admin_resolve_request_dispute',
    'admin_clear_account_restriction',
    'submit_request_completion_with_handoff',
    'confirm_request_completion_with_settlement'
  )
order by routine_name;

-- Expected: zero rows. Phase 2 completion wrappers are no longer client-callable.
select grantee, routine_name, privilege_type
from information_schema.role_routine_grants
where grantee in ('PUBLIC', 'anon', 'authenticated')
  and routine_schema = 'public'
  and routine_name in (
    'submit_request_completion_with_payment_evidence',
    'confirm_request_completion_with_payment_evidence'
  );

-- Expected: zero rows. Active Phase 3 tasks have a handoff and settlement.
select request.id, request.status
from public.requests as request
left join public.request_handoffs as handoff
  on handoff.request_id = request.id
left join public.request_settlements as settlement
  on settlement.request_id = request.id
where request.status in (
    'IN_PROGRESS',
    'AWAITING_CONFIRMATION',
    'COMPLETED'
  )
  and (
    handoff.request_id is null
    or settlement.request_id is null
  );

-- Expected: zero rows. Submitted tasks have verified handoff and Runner payment.
select request.id, request.status
from public.requests as request
join public.request_handoffs as handoff
  on handoff.request_id = request.id
join public.request_settlements as settlement
  on settlement.request_id = request.id
where request.status in ('AWAITING_CONFIRMATION', 'COMPLETED')
  and (
    handoff.verified_at is null
    or settlement.runner_confirmed_at is null
    or settlement.runner_received_amount is distinct from settlement.expected_amount
  );

-- Expected: zero rows. Only one open dispute exists per request.
select request_id, count(*)
from public.request_disputes
where status = 'OPEN'
group by request_id
having count(*) > 1;

-- Expected: zero rows. Failed requests have one matching failure report.
select request.id
from public.requests as request
left join public.request_failures as failure
  on failure.request_id = request.id
where request.status = 'FAILED'
  and failure.id is null;
