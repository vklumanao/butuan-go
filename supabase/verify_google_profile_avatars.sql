-- Run after supabase/migrations/016_google_profile_avatars.sql.

-- Expected: one row named sync_google_profile_avatar.
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'sync_google_profile_avatar';

-- Expected: one enabled trigger on auth.users.
select
  trigger.tgname as trigger_name,
  trigger.tgenabled as enabled
from pg_trigger as trigger
join pg_class as relation on relation.oid = trigger.tgrelid
join pg_namespace as schema on schema.oid = relation.relnamespace
where schema.nspname = 'auth'
  and relation.relname = 'users'
  and trigger.tgname = 'on_auth_user_google_avatar_updated'
  and not trigger.tgisinternal;

-- Review only: Google accounts whose source metadata has a photo but whose
-- public profile does not. Expected after the backfill: zero rows.
select profile.id, profile.email
from public.profiles as profile
join auth.users as auth_user on auth_user.id = profile.id
where (
    coalesce(auth_user.raw_app_meta_data ->> 'provider', '') = 'google'
    or coalesce(auth_user.raw_app_meta_data -> 'providers', '[]'::jsonb)
      ? 'google'
  )
  and coalesce(
    nullif(trim(auth_user.raw_user_meta_data ->> 'avatar_url'), ''),
    nullif(trim(auth_user.raw_user_meta_data ->> 'picture'), '')
  ) is not null
  and profile.avatar_url is null;
