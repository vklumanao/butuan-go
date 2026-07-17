-- ButuanGo Milestone 2: core request domain and secure status workflow.
-- Run after supabase/setup.sql. Safe to rerun while the schema is unchanged.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table if not exists public.categories (
  id bigint generated always as identity primary key,
  name text not null check (char_length(trim(name)) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  is_active boolean not null default true,
  display_order smallint not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists categories_name_lower_idx
on public.categories (lower(name));

insert into public.categories (name, slug, description, display_order)
values
  ('Shopping and Groceries', 'shopping-groceries', 'Groceries, office supplies, and other store purchases.', 10),
  ('Food Pickup', 'food-pickup', 'Pickup of prepared food from local establishments.', 20),
  ('Small Delivery', 'small-delivery', 'Delivery of a small lawful package or item.', 30),
  ('Laundry Pickup', 'laundry-pickup', 'Pickup or return of laundry from a local shop.', 40),
  ('Printing and Documents', 'printing-documents', 'Printing, photocopying, binding, and document pickup. Government transactions are excluded.', 50),
  ('Other Everyday Errand', 'other-errand', 'Other lawful, low-risk everyday errands supported by the platform.', 60)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  display_order = excluded.display_order;

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  requestor_id uuid not null references public.profiles(id) on delete restrict,
  runner_id uuid references public.profiles(id) on delete restrict,
  category_id bigint not null references public.categories(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 5 and 120),
  description text not null check (char_length(trim(description)) between 10 and 2000),
  area text not null check (char_length(trim(area)) between 2 and 160),
  expense_budget numeric(12, 2) not null default 0 check (expense_budget >= 0),
  service_fee numeric(12, 2) not null check (service_fee >= 0),
  due_at timestamptz,
  status text not null default 'OPEN'
    check (status in ('OPEN', 'ACCEPTED', 'IN_PROGRESS', 'AWAITING_CONFIRMATION', 'COMPLETED', 'CANCELLED')),
  cancellation_reason text check (
    cancellation_reason is null
    or char_length(trim(cancellation_reason)) between 5 and 500
  ),
  accepted_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint requests_due_at_future check (due_at is null or due_at > created_at),
  constraint requests_runner_matches_status check (
    (status in ('OPEN', 'CANCELLED') and runner_id is null)
    or
    (status in ('ACCEPTED', 'IN_PROGRESS', 'AWAITING_CONFIRMATION', 'COMPLETED') and runner_id is not null)
  ),
  constraint requests_lifecycle_timestamps check (
    (status = 'OPEN'
      and accepted_at is null and started_at is null and submitted_at is null
      and completed_at is null and cancelled_at is null)
    or
    (status = 'ACCEPTED'
      and accepted_at is not null and started_at is null and submitted_at is null
      and completed_at is null and cancelled_at is null)
    or
    (status = 'IN_PROGRESS'
      and accepted_at is not null and started_at is not null and submitted_at is null
      and completed_at is null and cancelled_at is null)
    or
    (status = 'AWAITING_CONFIRMATION'
      and accepted_at is not null and started_at is not null and submitted_at is not null
      and completed_at is null and cancelled_at is null)
    or
    (status = 'COMPLETED'
      and accepted_at is not null and started_at is not null and submitted_at is not null
      and completed_at is not null and cancelled_at is null)
    or
    (status = 'CANCELLED'
      and accepted_at is null and started_at is null and submitted_at is null
      and completed_at is null and cancelled_at is not null
      and cancellation_reason is not null)
  )
);

create index if not exists requests_status_created_at_idx
on public.requests (status, created_at desc);

create index if not exists requests_open_category_due_idx
on public.requests (category_id, due_at, created_at desc)
where status = 'OPEN';

create index if not exists requests_requestor_created_at_idx
on public.requests (requestor_id, created_at desc);

create index if not exists requests_runner_status_idx
on public.requests (runner_id, status, updated_at desc)
where runner_id is not null;

create table if not exists public.request_updates (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.requests(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in ('CREATED', 'UPDATED', 'STATUS_CHANGED')),
  from_status text check (
    from_status is null
    or from_status in ('OPEN', 'ACCEPTED', 'IN_PROGRESS', 'AWAITING_CONFIRMATION', 'COMPLETED', 'CANCELLED')
  ),
  to_status text check (
    to_status is null
    or to_status in ('OPEN', 'ACCEPTED', 'IN_PROGRESS', 'AWAITING_CONFIRMATION', 'COMPLETED', 'CANCELLED')
  ),
  note text check (note is null or char_length(trim(note)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists request_updates_request_created_at_idx
on public.request_updates (request_id, created_at, id);

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists requests_set_updated_at on public.requests;
create trigger requests_set_updated_at
before update on public.requests
for each row execute function public.set_updated_at();

drop policy if exists "Participants and runners can read eligible requests" on public.requests;
drop function if exists public.current_profile_role();

create or replace function private.current_profile_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

revoke all on function private.current_profile_role() from public, anon, authenticated;
grant execute on function private.current_profile_role() to authenticated;

create or replace function private.validate_request_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.requestor_id is distinct from old.requestor_id
    or new.created_at is distinct from old.created_at then
    raise exception 'Request identity and ownership cannot be changed';
  end if;

  if (
    new.category_id is distinct from old.category_id
    or new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.area is distinct from old.area
    or new.expense_budget is distinct from old.expense_budget
    or new.service_fee is distinct from old.service_fee
    or new.due_at is distinct from old.due_at
  ) and not (old.status = 'OPEN' and new.status = 'OPEN') then
    raise exception 'Request details can only be edited while the request remains OPEN';
  end if;

  if new.runner_id is distinct from old.runner_id and not (
    old.status = 'OPEN'
    and new.status = 'ACCEPTED'
    and old.runner_id is null
    and new.runner_id is not null
  ) then
    raise exception 'Runner assignment can only happen when an OPEN request is accepted';
  end if;

  if new.status is distinct from old.status and not (
    (old.status = 'OPEN' and new.status in ('ACCEPTED', 'CANCELLED'))
    or (old.status = 'ACCEPTED' and new.status = 'IN_PROGRESS')
    or (old.status = 'IN_PROGRESS' and new.status = 'AWAITING_CONFIRMATION')
    or (old.status = 'AWAITING_CONFIRMATION' and new.status = 'COMPLETED')
  ) then
    raise exception 'Invalid request status transition from % to %', old.status, new.status;
  end if;

  if new.accepted_at is distinct from old.accepted_at
    and not (old.status = 'OPEN' and new.status = 'ACCEPTED') then
    raise exception 'accepted_at can only be set when a request is accepted';
  end if;
  if new.started_at is distinct from old.started_at
    and not (old.status = 'ACCEPTED' and new.status = 'IN_PROGRESS') then
    raise exception 'started_at can only be set when a task starts';
  end if;
  if new.submitted_at is distinct from old.submitted_at
    and not (old.status = 'IN_PROGRESS' and new.status = 'AWAITING_CONFIRMATION') then
    raise exception 'submitted_at can only be set when completion is submitted';
  end if;
  if new.completed_at is distinct from old.completed_at
    and not (old.status = 'AWAITING_CONFIRMATION' and new.status = 'COMPLETED') then
    raise exception 'completed_at can only be set when completion is confirmed';
  end if;
  if (
    new.cancelled_at is distinct from old.cancelled_at
    or new.cancellation_reason is distinct from old.cancellation_reason
  ) and not (old.status = 'OPEN' and new.status = 'CANCELLED') then
    raise exception 'Cancellation details can only be set when an OPEN request is cancelled';
  end if;

  return new;
end;
$$;

drop trigger if exists requests_validate_changes on public.requests;
create trigger requests_validate_changes
before update on public.requests
for each row execute function private.validate_request_change();

create or replace function private.log_request_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.request_updates (request_id, actor_id, event_type, to_status)
    values (new.id, (select auth.uid()), 'CREATED', new.status);
  elsif new.status is distinct from old.status then
    insert into public.request_updates (
      request_id, actor_id, event_type, from_status, to_status, note
    )
    values (
      new.id,
      (select auth.uid()),
      'STATUS_CHANGED',
      old.status,
      new.status,
      case when new.status = 'CANCELLED' then new.cancellation_reason else null end
    );
  elsif new.category_id is distinct from old.category_id
    or new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.area is distinct from old.area
    or new.expense_budget is distinct from old.expense_budget
    or new.service_fee is distinct from old.service_fee
    or new.due_at is distinct from old.due_at then
    insert into public.request_updates (request_id, actor_id, event_type, to_status)
    values (new.id, (select auth.uid()), 'UPDATED', new.status);
  end if;
  return new;
end;
$$;

drop trigger if exists requests_log_changes on public.requests;
create trigger requests_log_changes
after insert or update on public.requests
for each row execute function private.log_request_change();

revoke all on function private.validate_request_change() from public, anon, authenticated;
revoke all on function private.log_request_change() from public, anon, authenticated;

alter table public.categories enable row level security;
alter table public.requests enable row level security;
alter table public.request_updates enable row level security;

drop policy if exists "Authenticated users can read active categories" on public.categories;
create policy "Authenticated users can read active categories"
on public.categories for select to authenticated
using (is_active = true);

drop policy if exists "Participants and runners can read eligible requests" on public.requests;
create policy "Participants and runners can read eligible requests"
on public.requests for select to authenticated
using (
  requestor_id = (select auth.uid())
  or runner_id = (select auth.uid())
  or (
    status = 'OPEN'
    and (select private.current_profile_role()) = 'runner'
  )
);

drop policy if exists "Participants can read request updates" on public.request_updates;
create policy "Participants can read request updates"
on public.request_updates for select to authenticated
using (
  exists (
    select 1
    from public.requests as request
    where request.id = request_updates.request_id
      and (
        request.requestor_id = (select auth.uid())
        or request.runner_id = (select auth.uid())
      )
  )
);

revoke all on table public.categories from anon, authenticated;
revoke all on table public.requests from anon, authenticated;
revoke all on table public.request_updates from anon, authenticated;

grant select on table public.categories to authenticated;
grant select on table public.requests to authenticated;
grant select on table public.request_updates to authenticated;

create or replace function public.create_request(
  p_category_id bigint,
  p_title text,
  p_description text,
  p_area text,
  p_expense_budget numeric,
  p_service_fee numeric,
  p_due_at timestamptz default null
)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  created_request public.requests%rowtype;
begin
  if caller_id is null or (select private.current_profile_role()) is distinct from 'requestor' then
    raise exception 'Only an authenticated Requestor can create a request';
  end if;
  if not exists (
    select 1 from public.categories where id = p_category_id and is_active = true
  ) then
    raise exception 'The selected category is not available';
  end if;
  if p_due_at is not null and p_due_at <= now() then
    raise exception 'The due date must be in the future';
  end if;

  insert into public.requests (
    requestor_id, category_id, title, description, area,
    expense_budget, service_fee, due_at
  )
  values (
    caller_id,
    p_category_id,
    trim(p_title),
    trim(p_description),
    trim(p_area),
    p_expense_budget,
    p_service_fee,
    p_due_at
  )
  returning * into created_request;

  return created_request;
end;
$$;

create or replace function public.update_open_request(
  p_request_id uuid,
  p_category_id bigint,
  p_title text,
  p_description text,
  p_area text,
  p_expense_budget numeric,
  p_service_fee numeric,
  p_due_at timestamptz default null
)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  updated_request public.requests%rowtype;
begin
  if caller_id is null or (select private.current_profile_role()) is distinct from 'requestor' then
    raise exception 'Only an authenticated Requestor can edit a request';
  end if;
  if not exists (
    select 1 from public.categories where id = p_category_id and is_active = true
  ) then
    raise exception 'The selected category is not available';
  end if;
  if p_due_at is not null and p_due_at <= now() then
    raise exception 'The due date must be in the future';
  end if;

  update public.requests
  set
    category_id = p_category_id,
    title = trim(p_title),
    description = trim(p_description),
    area = trim(p_area),
    expense_budget = p_expense_budget,
    service_fee = p_service_fee,
    due_at = p_due_at
  where id = p_request_id
    and requestor_id = caller_id
    and status = 'OPEN'
  returning * into updated_request;

  if updated_request.id is null then
    raise exception 'The request was not found or can no longer be edited';
  end if;
  return updated_request;
end;
$$;

create or replace function public.cancel_open_request(
  p_request_id uuid,
  p_reason text
)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  updated_request public.requests%rowtype;
begin
  if caller_id is null or (select private.current_profile_role()) is distinct from 'requestor' then
    raise exception 'Only an authenticated Requestor can cancel a request';
  end if;
  if p_reason is null or char_length(trim(p_reason)) not between 5 and 500 then
    raise exception 'A cancellation reason between 5 and 500 characters is required';
  end if;

  update public.requests
  set
    status = 'CANCELLED',
    cancellation_reason = trim(p_reason),
    cancelled_at = now()
  where id = p_request_id
    and requestor_id = caller_id
    and status = 'OPEN'
  returning * into updated_request;

  if updated_request.id is null then
    raise exception 'The request was not found or can no longer be cancelled';
  end if;
  return updated_request;
end;
$$;

create or replace function public.accept_request(p_request_id uuid)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  updated_request public.requests%rowtype;
begin
  if caller_id is null or (select private.current_profile_role()) is distinct from 'runner' then
    raise exception 'Only an authenticated Runner can accept a request';
  end if;

  update public.requests
  set runner_id = caller_id, status = 'ACCEPTED', accepted_at = now()
  where id = p_request_id
    and status = 'OPEN'
    and runner_id is null
    and requestor_id <> caller_id
  returning * into updated_request;

  if updated_request.id is null then
    raise exception 'This request is no longer available';
  end if;
  return updated_request;
end;
$$;

create or replace function public.start_request(p_request_id uuid)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  updated_request public.requests%rowtype;
begin
  if caller_id is null or (select private.current_profile_role()) is distinct from 'runner' then
    raise exception 'Only an authenticated Runner can start a task';
  end if;

  update public.requests
  set status = 'IN_PROGRESS', started_at = now()
  where id = p_request_id and runner_id = caller_id and status = 'ACCEPTED'
  returning * into updated_request;

  if updated_request.id is null then
    raise exception 'The task was not found or cannot be started';
  end if;
  return updated_request;
end;
$$;

create or replace function public.submit_request_completion(p_request_id uuid)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  updated_request public.requests%rowtype;
begin
  if caller_id is null or (select private.current_profile_role()) is distinct from 'runner' then
    raise exception 'Only an authenticated Runner can submit task completion';
  end if;

  update public.requests
  set status = 'AWAITING_CONFIRMATION', submitted_at = now()
  where id = p_request_id and runner_id = caller_id and status = 'IN_PROGRESS'
  returning * into updated_request;

  if updated_request.id is null then
    raise exception 'The task was not found or cannot be submitted for confirmation';
  end if;
  return updated_request;
end;
$$;

create or replace function public.confirm_request_completion(p_request_id uuid)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  updated_request public.requests%rowtype;
begin
  if caller_id is null or (select private.current_profile_role()) is distinct from 'requestor' then
    raise exception 'Only the Requestor can confirm task completion';
  end if;

  update public.requests
  set status = 'COMPLETED', completed_at = now()
  where id = p_request_id
    and requestor_id = caller_id
    and status = 'AWAITING_CONFIRMATION'
  returning * into updated_request;

  if updated_request.id is null then
    raise exception 'The task was not found or is not awaiting confirmation';
  end if;
  return updated_request;
end;
$$;

revoke all on function public.create_request(bigint, text, text, text, numeric, numeric, timestamptz) from public, anon;
revoke all on function public.update_open_request(uuid, bigint, text, text, text, numeric, numeric, timestamptz) from public, anon;
revoke all on function public.cancel_open_request(uuid, text) from public, anon;
revoke all on function public.accept_request(uuid) from public, anon;
revoke all on function public.start_request(uuid) from public, anon;
revoke all on function public.submit_request_completion(uuid) from public, anon;
revoke all on function public.confirm_request_completion(uuid) from public, anon;

grant execute on function public.create_request(bigint, text, text, text, numeric, numeric, timestamptz) to authenticated;
grant execute on function public.update_open_request(uuid, bigint, text, text, text, numeric, numeric, timestamptz) to authenticated;
grant execute on function public.cancel_open_request(uuid, text) to authenticated;
grant execute on function public.accept_request(uuid) to authenticated;
grant execute on function public.start_request(uuid) to authenticated;
grant execute on function public.submit_request_completion(uuid) to authenticated;
grant execute on function public.confirm_request_completion(uuid) to authenticated;

comment on table public.requests is
'Core ButuanGo errands. Exact private addresses, payment credentials, government identifiers, chat, and GPS data are intentionally excluded.';

comment on column public.requests.area is
'General service area visible to eligible Runners; do not store sensitive exact-address instructions here.';

commit;
