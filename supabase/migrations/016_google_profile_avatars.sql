-- Keep ButuanGo profile avatars aligned with Google account metadata.
-- Run after supabase/migrations/015_google_only_auth.sql.

begin;

-- Backfill the Google photo for accounts that existed before avatar syncing.
with google_users as (
  select
    auth_user.id,
    coalesce(
      nullif(trim(auth_user.raw_user_meta_data ->> 'avatar_url'), ''),
      nullif(trim(auth_user.raw_user_meta_data ->> 'picture'), '')
    ) as avatar_url
  from auth.users as auth_user
  where coalesce(auth_user.raw_app_meta_data ->> 'provider', '') = 'google'
    or coalesce(auth_user.raw_app_meta_data -> 'providers', '[]'::jsonb)
      ? 'google'
)
update public.profiles as profile
set avatar_url = google_user.avatar_url
from google_users as google_user
where profile.id = google_user.id
  and google_user.avatar_url is not null
  and profile.avatar_url is distinct from google_user.avatar_url;

create or replace function public.sync_google_profile_avatar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  google_avatar_url text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'picture'), '')
  );
begin
  if coalesce(new.raw_app_meta_data ->> 'provider', '') = 'google'
    or coalesce(new.raw_app_meta_data -> 'providers', '[]'::jsonb)
      ? 'google' then
    update public.profiles
    set avatar_url = google_avatar_url
    where id = new.id
      and avatar_url is distinct from google_avatar_url;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_google_avatar_updated on auth.users;
create trigger on_auth_user_google_avatar_updated
after update of raw_user_meta_data, raw_app_meta_data on auth.users
for each row
when (
  old.raw_user_meta_data is distinct from new.raw_user_meta_data
  or old.raw_app_meta_data is distinct from new.raw_app_meta_data
)
execute function public.sync_google_profile_avatar();

revoke all on function public.sync_google_profile_avatar()
from public, anon, authenticated;

comment on function public.sync_google_profile_avatar() is
'Copies the current Google avatar metadata into the matching public profile.';

commit;
