-- ButuanGo Milestone 2: one account with switchable Requestor and Runner workspaces.
-- Run after supabase/migrations/008_task_recovery.sql.

begin;

alter table public.profiles
add column if not exists active_role text;

update public.profiles
set active_role = role
where active_role is null;

alter table public.profiles
alter column active_role set default 'requestor';

alter table public.profiles
alter column active_role set not null;

alter table public.profiles
drop constraint if exists profiles_active_role_check;

alter table public.profiles
add constraint profiles_active_role_check
check (active_role in ('requestor', 'runner', 'admin'));

create index if not exists profiles_active_role_idx
on public.profiles(active_role);

create or replace function public.prevent_profile_security_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.role is distinct from old.role
    or new.email is distinct from old.email then
    raise exception 'Profile identity, email, and registration role cannot be changed by this operation';
  end if;

  if new.active_role is distinct from old.active_role
    and coalesce(current_setting('butuango.allow_role_switch', true), '') <> 'true' then
    raise exception 'Active role can only be changed through the secure role switch';
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
  requested_role text;
begin
  requested_role := new.raw_user_meta_data ->> 'role';
  if requested_role not in ('requestor', 'runner') then
    requested_role := 'requestor';
  end if;

  insert into public.profiles (
    id,
    full_name,
    email,
    phone_number,
    role,
    active_role
  )
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'New user'),
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'phone_number'), ''),
    requested_role,
    requested_role
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
  select active_role
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
  ) then
    raise exception 'This account cannot use public workspace switching';
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

revoke all on function public.switch_active_role(text) from public, anon;
grant execute on function public.switch_active_role(text) to authenticated;

revoke all on function private.current_profile_role() from public, anon, authenticated;
grant execute on function private.current_profile_role() to authenticated;

comment on column public.profiles.role is
'Original public-registration role. Retained for account history and not used as the current workspace authorization mode.';

comment on column public.profiles.active_role is
'Current Requestor or Runner workspace. Changes only through switch_active_role; admin is never publicly selectable.';

comment on function public.switch_active_role(text) is
'Securely switches a normal authenticated account between Requestor and Runner workspaces without changing request ownership or task assignments.';

commit;
