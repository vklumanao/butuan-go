-- Run after supabase/migrations/015_google_only_auth.sql.

-- Expected: four rows with the intended types and nullability.
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in (
    'onboarding_completed_at',
    'terms_accepted_at',
    'terms_version',
    'signup_method'
  )
order by column_name;

-- Expected: one row with security_definer = true.
select
  routine_name,
  security_type = 'DEFINER' as security_definer
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'complete_account_onboarding';

-- Expected: authenticated has EXECUTE; PUBLIC and anon do not.
select grantee, routine_name, privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name = 'complete_account_onboarding'
order by grantee;

-- Expected: zero rows. Existing accounts remain usable after migration.
select id, email
from public.profiles
where onboarding_completed_at is null
  and created_at < now() - interval '5 minutes';

-- Expected: zero rows. Completed new Google onboarding records have a
-- versioned acceptance and contact number.
select id, email
from public.profiles
where signup_method = 'google'
  and onboarding_completed_at is not null
  and (
    terms_accepted_at is null
    or terms_version is null
    or phone_number is null
    or char_length(trim(phone_number)) < 7
  );

-- Expected: current_profile_role and the profile protection trigger remain
-- installed. Incomplete profiles receive a null role from the helper.
select
  routine_name,
  security_type
from information_schema.routines
where routine_schema = 'private'
  and routine_name = 'current_profile_role';

select
  trigger.tgname,
  trigger.tgenabled
from pg_trigger as trigger
join pg_class as relation on relation.oid = trigger.tgrelid
join pg_namespace as namespace on namespace.oid = relation.relnamespace
where namespace.nspname = 'public'
  and relation.relname = 'profiles'
  and trigger.tgname = 'profiles_protect_security_fields'
  and not trigger.tgisinternal;
