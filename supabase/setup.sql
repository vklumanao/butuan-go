-- ButuanGo milestone 1 database setup. Safe to rerun on a new Supabase project.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 100),
  email text not null,
  phone_number text,
  role text not null check (role in ('requestor', 'runner', 'admin')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.prevent_profile_security_changes()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id or new.role is distinct from old.role or new.email is distinct from old.email then
    raise exception 'Profile identity, email, and role cannot be changed by this operation';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_security_fields on public.profiles;
create trigger profiles_protect_security_fields before update on public.profiles
for each row execute function public.prevent_profile_security_changes();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = '' as $$
declare
  requested_role text;
begin
  requested_role := new.raw_user_meta_data ->> 'role';
  if requested_role not in ('requestor', 'runner') then
    requested_role := 'requestor';
  end if;

  insert into public.profiles (id, full_name, email, phone_number, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'New user'),
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'phone_number'), ''),
    requested_role
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile" on public.profiles
for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

revoke all on table public.profiles from anon;
grant select on table public.profiles to authenticated;
grant update (full_name, phone_number, avatar_url) on table public.profiles to authenticated;

-- Existing projects: next run supabase/migrations/002_request_workflow.sql.
