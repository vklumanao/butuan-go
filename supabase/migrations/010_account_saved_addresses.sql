-- ButuanGo Milestone 2: account-level saved addresses in either workspace.
-- Run after supabase/migrations/009_dual_role_mode.sql.

begin;

drop policy if exists "Users can read their own saved addresses"
on public.saved_addresses;

create policy "Users can read their own saved addresses"
on public.saved_addresses for select to authenticated
using (user_id = (select auth.uid()));

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
  if caller_id is null then
    raise exception 'Authentication is required to manage saved addresses';
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
  if caller_id is null then
    raise exception 'Authentication is required to manage saved addresses';
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
  if caller_id is null then
    raise exception 'Authentication is required to manage saved addresses';
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
'Private reusable address templates owned by one account and manageable from either public workspace. Request locations copy snapshots and do not reference this table.';

commit;
