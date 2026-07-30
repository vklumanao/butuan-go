-- Read-only verification for
-- supabase/migrations/011_approximate_request_geography.sql.

select
  column_name,
  data_type,
  numeric_precision,
  numeric_scale,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'requests'
  and column_name in (
    'approximate_latitude',
    'approximate_longitude'
  )
order by ordinal_position;

select
  routine_name,
  routine_type,
  security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'set_request_approximate_location',
    'save_request_location_and_geography',
    'create_request_with_location_and_geography',
    'update_open_request_with_location_and_geography'
  )
order by routine_name;

select
  conname,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.requests'::regclass
  and conname = 'requests_approximate_coordinates_pair';

select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'requests'
  and indexname = 'requests_open_approximate_location_idx';

-- Any populated coordinates should have at most two decimal places and
-- should always be present as a pair.
select
  id,
  approximate_latitude,
  approximate_longitude
from public.requests
where
  (approximate_latitude is null) <> (approximate_longitude is null)
  or approximate_latitude <> round(approximate_latitude, 2)
  or approximate_longitude <> round(approximate_longitude, 2);
