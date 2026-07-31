-- Run after supabase/migrations/013_payment_evidence.sql.
-- Every query should return the expected result described above it.

-- Expected: two rows, both with rowsecurity = true.
select relname, relrowsecurity
from pg_class
where oid in (
  'public.request_price_changes'::regclass,
  'public.request_receipts'::regclass
)
order by relname;

-- Expected: five policies: two participant reads and three Storage rules.
select schemaname, tablename, policyname, cmd
from pg_policies
where (
  schemaname = 'public'
  and tablename in ('request_price_changes', 'request_receipts')
) or (
  schemaname = 'storage'
  and tablename = 'objects'
  and policyname in (
    'Request participants can read receipt files',
    'Assigned runners can upload receipt files',
    'Assigned runners can remove receipt files'
  )
)
order by schemaname, tablename, policyname;

-- Expected: one private bucket with a 5 MB limit.
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'request-receipts';

-- Expected: one row with a boolean data type and default true.
select column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'request_payment_terms'
  and column_name = 'receipt_evidence_required';

-- Expected: eight rows, all security_definer = true.
select
  routine_name,
  security_type = 'DEFINER' as security_definer
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'request_price_change',
    'resolve_request_price_change',
    'withdraw_request_price_change',
    'confirm_request_cash_advance',
    'add_request_receipt',
    'delete_request_receipt',
    'submit_request_completion_with_payment_evidence',
    'confirm_request_completion_with_payment_evidence'
  )
order by routine_name;

-- Expected: zero rows. Direct writes must remain unavailable to authenticated.
select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'authenticated'
  and table_schema = 'public'
  and table_name in ('request_price_changes', 'request_receipts')
  and privilege_type in ('INSERT', 'UPDATE', 'DELETE');

-- Expected: zero rows. Old completion RPCs must not be client-executable.
select grantee, routine_name, privilege_type
from information_schema.role_routine_grants
where grantee in ('PUBLIC', 'anon', 'authenticated')
  and routine_schema = 'public'
  and routine_name in (
    'submit_request_completion',
    'confirm_request_completion'
  );

-- Expected: zero rows. There may only be one pending change per request.
select request_id, count(*)
from public.request_price_changes
where status = 'PENDING'
group by request_id
having count(*) > 1;

-- Expected: zero rows. A pending increase belongs only to an in-progress task.
select change.id, change.request_id, request.status
from public.request_price_changes as change
join public.requests as request on request.id = change.request_id
where change.status = 'PENDING'
  and request.status <> 'IN_PROGRESS';

-- Expected: zero rows. Runner-advance receipt totals stay within approval.
select
  receipt.request_id,
  sum(receipt.purchase_amount) as receipt_total,
  terms.maximum_advance
from public.request_receipts as receipt
join public.request_payment_terms as terms
  on terms.request_id = receipt.request_id
where terms.arrangement = 'RUNNER_ADVANCE'
group by receipt.request_id, terms.maximum_advance
having sum(receipt.purchase_amount) > terms.maximum_advance;

-- Expected: zero rows. Registered receipts must point to an existing private file.
select receipt.id, receipt.storage_path
from public.request_receipts as receipt
left join storage.objects as object
  on object.bucket_id = 'request-receipts'
  and object.name = receipt.storage_path
where object.id is null;
