-- ButuanGo Milestone 2: private reusable saved-address book.
-- Run after supabase/migrations/006_runner_capacity.sql.

begin;

create table if not exists public.saved_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null check (char_length(trim(label)) between 2 and 50),
  recipient_name text not null check (char_length(trim(recipient_name)) between 2 and 120),
  phone_number text not null check (char_length(trim(phone_number)) between 7 and 30),
  full_address text not null check (char_length(trim(full_address)) between 5 and 300),
  landmark text check (
    landmark is null or char_length(trim(landmark)) between 2 and 200
  ),
  instructions text check (
    instructions is null or char_length(trim(instructions)) between 2 and 500
  ),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_addresses_user_updated_idx
on public.saved_addresses (user_id, updated_at desc);

create unique index if not exists saved_addresses_one_default_per_user_idx
on public.saved_addresses (user_id)
where is_default = true;

drop trigger if exists saved_addresses_set_updated_at on public.saved_addresses;
create trigger saved_addresses_set_updated_at
before update on public.saved_addresses
for each row execute function public.set_updated_at();

alter table public.saved_addresses enable row level security;

drop policy if exists "Users can read their own saved addresses" on public.saved_addresses;
create policy "Users can read their own saved addresses"
on public.saved_addresses for select to authenticated
using (
  user_id = (select auth.uid())
  and (select private.current_profile_role()) = 'requestor'
);

revoke all on table public.saved_addresses from anon, authenticated;
grant select on table public.saved_addresses to authenticated;

create or replace function public.save_saved_address(
  p_address_id uuid,
  p_label text,
  p_recipient_name text,
  p_phone_number text,
  p_full_address text,
  p_landmark text default null,
  p_instructions text default null,
  p_is_default boolean default false
)
returns public.saved_addresses
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  existing_address public.saved_addresses%rowtype;
  saved_address public.saved_addresses%rowtype;
  should_be_default boolean;
begin
  if caller_id is null or (select private.current_profile_role()) is distinct from 'requestor' then
    raise exception 'Only an authenticated Requestor can manage saved addresses';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(caller_id::text, 7));

  if p_address_id is not null then
    select * into existing_address
    from public.saved_addresses
    where id = p_address_id and user_id = caller_id;

    if existing_address.id is null then
      raise exception 'The saved address was not found';
    end if;
  end if;

  should_be_default := coalesce(p_is_default, false)
    or coalesce(existing_address.is_default, false)
    or not exists (
      select 1 from public.saved_addresses where user_id = caller_id
    );

  if should_be_default then
    update public.saved_addresses
    set is_default = false
    where user_id = caller_id and is_default = true;
  end if;

  if p_address_id is null then
    insert into public.saved_addresses (
      user_id, label, recipient_name, phone_number, full_address,
      landmark, instructions, is_default
    )
    values (
      caller_id,
      trim(p_label),
      trim(p_recipient_name),
      trim(p_phone_number),
      trim(p_full_address),
      nullif(trim(p_landmark), ''),
      nullif(trim(p_instructions), ''),
      should_be_default
    )
    returning * into saved_address;
  else
    update public.saved_addresses
    set
      label = trim(p_label),
      recipient_name = trim(p_recipient_name),
      phone_number = trim(p_phone_number),
      full_address = trim(p_full_address),
      landmark = nullif(trim(p_landmark), ''),
      instructions = nullif(trim(p_instructions), ''),
      is_default = should_be_default
    where id = p_address_id and user_id = caller_id
    returning * into saved_address;
  end if;

  return saved_address;
end;
$$;

create or replace function public.set_default_saved_address(p_address_id uuid)
returns public.saved_addresses
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  saved_address public.saved_addresses%rowtype;
begin
  if caller_id is null or (select private.current_profile_role()) is distinct from 'requestor' then
    raise exception 'Only an authenticated Requestor can manage saved addresses';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(caller_id::text, 7));

  if not exists (
    select 1 from public.saved_addresses
    where id = p_address_id and user_id = caller_id
  ) then
    raise exception 'The saved address was not found';
  end if;

  update public.saved_addresses
  set is_default = false
  where user_id = caller_id and is_default = true;

  update public.saved_addresses
  set is_default = true
  where id = p_address_id and user_id = caller_id
  returning * into saved_address;

  return saved_address;
end;
$$;

create or replace function public.delete_saved_address(p_address_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  deleted_was_default boolean;
begin
  if caller_id is null or (select private.current_profile_role()) is distinct from 'requestor' then
    raise exception 'Only an authenticated Requestor can manage saved addresses';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(caller_id::text, 7));

  delete from public.saved_addresses
  where id = p_address_id and user_id = caller_id
  returning is_default into deleted_was_default;

  if deleted_was_default is null then
    raise exception 'The saved address was not found';
  end if;

  if deleted_was_default then
    update public.saved_addresses
    set is_default = true
    where id = (
      select id
      from public.saved_addresses
      where user_id = caller_id
      order by updated_at desc, created_at desc
      limit 1
    );
  end if;

  return true;
end;
$$;

revoke all on function public.save_saved_address(uuid, text, text, text, text, text, text, boolean) from public, anon;
revoke all on function public.set_default_saved_address(uuid) from public, anon;
revoke all on function public.delete_saved_address(uuid) from public, anon;

grant execute on function public.save_saved_address(uuid, text, text, text, text, text, text, boolean) to authenticated;
grant execute on function public.set_default_saved_address(uuid) to authenticated;
grant execute on function public.delete_saved_address(uuid) to authenticated;

comment on table public.saved_addresses is
'Private reusable address templates owned by one user. Request locations copy these values as snapshots and do not reference this table.';

commit;
