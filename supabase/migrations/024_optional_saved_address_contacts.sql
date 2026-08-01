-- ButuanGo: allow reusable locations without a fixed recipient or phone.
-- Run after supabase/migrations/023_in_app_feedback.sql.

begin;

alter table public.saved_addresses
  alter column recipient_name drop not null,
  alter column phone_number drop not null;

alter table public.saved_addresses
  drop constraint if exists saved_addresses_recipient_name_check,
  drop constraint if exists saved_addresses_phone_number_check;

alter table public.saved_addresses
  add constraint saved_addresses_recipient_name_check check (
    recipient_name is null
    or char_length(trim(recipient_name)) between 2 and 120
  ),
  add constraint saved_addresses_phone_number_check check (
    phone_number is null
    or char_length(trim(phone_number)) between 7 and 30
  );

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
      nullif(trim(p_recipient_name), ''),
      nullif(trim(p_phone_number), ''),
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
      recipient_name = nullif(trim(p_recipient_name), ''),
      phone_number = nullif(trim(p_phone_number), ''),
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

revoke all on function public.save_saved_address(uuid, text, text, text, text, text, text, boolean)
from public, anon;
grant execute on function public.save_saved_address(uuid, text, text, text, text, text, text, boolean)
to authenticated;

comment on column public.saved_addresses.recipient_name is
'Optional recipient copied into a request only when provided.';
comment on column public.saved_addresses.phone_number is
'Optional recipient phone copied into a request only when provided.';

commit;
