-- ButuanGo Google-only authentication and mandatory account onboarding.
-- Run after supabase/migrations/014_handoff_settlement_disputes.sql.

begin;

alter table public.profiles
add column if not exists onboarding_completed_at timestamptz;

alter table public.profiles
add column if not exists terms_accepted_at timestamptz;

alter table public.profiles
add column if not exists terms_version text;

alter table public.profiles
add column if not exists signup_method text;

-- Existing accounts already completed the former registration form. Preserve
-- their access without inventing a Terms acceptance timestamp that was not
-- previously stored.
update public.profiles
set
  onboarding_completed_at = coalesce(onboarding_completed_at, created_at),
  signup_method = coalesce(signup_method, 'legacy')
where onboarding_completed_at is null
   or signup_method is null;

alter table public.profiles
alter column signup_method set default 'google';

alter table public.profiles
alter column signup_method set not null;

alter table public.profiles
drop constraint if exists profiles_signup_method_check;

alter table public.profiles
add constraint profiles_signup_method_check check (
  signup_method in ('legacy', 'google')
);

alter table public.profiles
drop constraint if exists profiles_terms_acceptance_shape;

alter table public.profiles
add constraint profiles_terms_acceptance_shape check (
  (
    terms_accepted_at is null
    and terms_version is null
  )
  or
  (
    terms_accepted_at is not null
    and terms_version is not null
    and char_length(trim(terms_version)) between 1 and 40
  )
);

create or replace function public.prevent_profile_security_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  onboarding_allowed boolean :=
    coalesce(
      current_setting('butuango.allow_onboarding_completion', true),
      ''
    ) = 'true';
  role_switch_allowed boolean :=
    coalesce(current_setting('butuango.allow_role_switch', true), '') = 'true';
begin
  if new.id is distinct from old.id
    or new.email is distinct from old.email
    or new.signup_method is distinct from old.signup_method then
    raise exception 'Profile identity, email, and signup method cannot be changed';
  end if;

  if new.role is distinct from old.role and not onboarding_allowed then
    raise exception 'Registration role can only be set during secure onboarding';
  end if;

  if new.active_role is distinct from old.active_role
    and not role_switch_allowed
    and not onboarding_allowed then
    raise exception 'Active role can only be changed through a secure workflow';
  end if;

  if (
    new.onboarding_completed_at is distinct from old.onboarding_completed_at
    or new.terms_accepted_at is distinct from old.terms_accepted_at
    or new.terms_version is distinct from old.terms_version
  ) and not onboarding_allowed then
    raise exception 'Onboarding and Terms records cannot be changed directly';
  end if;

  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  provider_name text := coalesce(
    nullif(trim(new.raw_app_meta_data ->> 'provider'), ''),
    'email'
  );
  profile_name text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    'New user'
  );
begin
  insert into public.profiles (
    id,
    full_name,
    email,
    phone_number,
    role,
    active_role,
    avatar_url,
    signup_method,
    onboarding_completed_at,
    terms_accepted_at,
    terms_version
  )
  values (
    new.id,
    profile_name,
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'phone_number'), ''),
    'requestor',
    'requestor',
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'picture'), '')
    ),
    case when provider_name = 'google' then 'google' else 'legacy' end,
    null,
    null,
    null
  );

  return new;
end;
$$;

create or replace function private.current_profile_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when onboarding_completed_at is not null then active_role
    else null
  end
  from public.profiles
  where id = (select auth.uid());
$$;

create or replace function public.switch_active_role(p_role text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  updated_profile public.profiles%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication is required';
  end if;

  if p_role is null or p_role not in ('requestor', 'runner') then
    raise exception 'Active role must be requestor or runner';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = caller_id
      and role in ('requestor', 'runner')
      and onboarding_completed_at is not null
  ) then
    raise exception 'Complete account setup before switching workspaces';
  end if;

  perform set_config('butuango.allow_role_switch', 'true', true);

  update public.profiles
  set active_role = p_role
  where id = caller_id
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'The account profile was not found';
  end if;

  return updated_profile;
end;
$$;

create or replace function public.complete_account_onboarding(
  p_full_name text,
  p_phone_number text,
  p_starting_role text,
  p_terms_version text
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  current_terms_version constant text := '2026-07-31';
  existing_profile public.profiles%rowtype;
  updated_profile public.profiles%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication is required';
  end if;

  select *
  into existing_profile
  from public.profiles
  where id = caller_id
  for update;

  if existing_profile.id is null then
    raise exception 'Your account profile was not found';
  end if;

  if existing_profile.role = 'admin' then
    raise exception 'Admin accounts cannot use public onboarding';
  end if;

  if existing_profile.onboarding_completed_at is not null then
    return existing_profile;
  end if;

  if p_full_name is null
    or char_length(trim(p_full_name)) not between 2 and 100 then
    raise exception 'Enter a full name between 2 and 100 characters';
  end if;

  if p_phone_number is null
    or char_length(trim(p_phone_number)) not between 7 and 30 then
    raise exception 'Enter a valid phone number';
  end if;

  if p_starting_role is null
    or p_starting_role not in ('requestor', 'runner') then
    raise exception 'Choose Requestor or Runner as your starting workspace';
  end if;

  if p_terms_version is distinct from current_terms_version then
    raise exception 'Review and accept the current ButuanGo terms';
  end if;

  perform set_config(
    'butuango.allow_onboarding_completion',
    'true',
    true
  );

  update public.profiles
  set
    full_name = trim(p_full_name),
    phone_number = trim(p_phone_number),
    role = p_starting_role,
    active_role = p_starting_role,
    terms_accepted_at = now(),
    terms_version = current_terms_version,
    onboarding_completed_at = now()
  where id = caller_id
    and onboarding_completed_at is null
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'Account setup could not be completed';
  end if;

  return updated_profile;
end;
$$;

revoke all on function public.complete_account_onboarding(
  text,
  text,
  text,
  text
) from public, anon;

grant execute on function public.complete_account_onboarding(
  text,
  text,
  text,
  text
) to authenticated;

revoke all on function private.current_profile_role()
from public, anon, authenticated;

grant execute on function private.current_profile_role()
to authenticated;

comment on column public.profiles.onboarding_completed_at is
'When the account completed the required ButuanGo profile and workspace setup.';

comment on column public.profiles.terms_accepted_at is
'Timestamp of the current recorded Terms, Privacy, and Safety acknowledgement.';

comment on column public.profiles.terms_version is
'Version identifier for the recorded onboarding acceptance.';

comment on column public.profiles.signup_method is
'Google for new public accounts, or legacy for accounts that predate the Google-only flow.';

comment on function public.complete_account_onboarding(
  text,
  text,
  text,
  text
) is
'Completes the authenticated normal user profile once and activates a Requestor or Runner workspace.';

commit;
