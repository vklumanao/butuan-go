-- Read-only verification for
-- supabase/migrations/012_request_payment_terms.sql.

select
  table_name,
  row_security
from (
  select
    c.relname as table_name,
    c.relrowsecurity as row_security
  from pg_class as c
  join pg_namespace as n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in (
      'request_payment_terms',
      'request_payment_details'
    )
) as payment_tables
order by table_name;

select
  table_name,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'request_payment_terms',
    'request_payment_details'
  )
order by table_name, ordinal_position;

select
  policyname,
  tablename,
  cmd,
  roles,
  qual
from pg_policies
where schemaname = 'public'
  and tablename in (
    'request_payment_terms',
    'request_payment_details'
  )
order by tablename, policyname;

select
  routine_schema,
  routine_name,
  routine_type,
  security_type
from information_schema.routines
where routine_schema in ('public', 'private')
  and routine_name in (
    'validate_request_payment_terms',
    'save_request_payment_terms',
    'create_request_with_payment_terms',
    'update_open_request_with_payment_terms',
    'accept_request_with_payment_terms',
    'confirm_request_cash_advance',
    'start_request_with_payment_terms',
    'clear_released_request_payment_consent'
  )
order by routine_schema, routine_name;

-- Should return zero rows: every request must have one payment arrangement.
select request.id, request.status, request.expense_budget
from public.requests as request
left join public.request_payment_terms as terms
  on terms.request_id = request.id
where terms.request_id is null;

-- Should return zero rows: arrangement and expense budget must agree.
select
  request.id,
  request.expense_budget,
  terms.arrangement,
  terms.maximum_advance
from public.requests as request
join public.request_payment_terms as terms
  on terms.request_id = request.id
where
  (
    terms.arrangement = 'NO_PURCHASE'
    and request.expense_budget <> 0
  )
  or (
    terms.arrangement = 'MERCHANT_PREPAID'
    and (
      request.expense_budget <= 0
      or terms.maximum_advance <> 0
    )
  )
  or (
    terms.arrangement = 'RUNNER_ADVANCE'
    and (
      request.expense_budget <= 0
      or terms.maximum_advance <> request.expense_budget
    )
  );

-- Authenticated clients should have no direct write privileges.
select
  table_name,
  privilege_type
from information_schema.role_table_grants
where grantee = 'authenticated'
  and table_schema = 'public'
  and table_name in (
    'request_payment_terms',
    'request_payment_details'
  )
  and privilege_type <> 'SELECT';
