-- MANUAL ONE-TIME ADMIN PROVISIONING TEMPLATE.
-- 1. The target must sign in with Google once so auth.users/profile exists.
-- 2. Replace the email below with the exact trusted Google account email.
-- 3. Run in Supabase SQL Editor, then review the final SELECT.
-- Never expose this operation through the public application.

begin;

do $$
declare
  target_email constant text := 'vklumanao@gmail.com';
  target_user_id uuid;
begin
  if target_email = 'REPLACE_WITH_TRUSTED_GOOGLE_EMAIL' then
    raise exception 'Replace target_email before running Admin provisioning';
  end if;

  select auth_user.id
  into target_user_id
  from auth.users as auth_user
  where lower(auth_user.email) = lower(target_email);

  if target_user_id is null then
    raise exception 'The Google account must sign in to ButuanGo once before provisioning';
  end if;

  perform set_config(
    'butuango.allow_onboarding_completion',
    'true',
    true
  );

  update public.profiles
  set
    role = 'admin',
    active_role = 'admin',
    onboarding_completed_at = coalesce(onboarding_completed_at, now())
  where id = target_user_id;

  if not found then
    raise exception 'The matching ButuanGo profile was not found';
  end if;
end;
$$;

commit;

select
  id,
  full_name,
  email,
  role,
  active_role,
  onboarding_completed_at
from public.profiles
where role = 'admin'
order by created_at;
