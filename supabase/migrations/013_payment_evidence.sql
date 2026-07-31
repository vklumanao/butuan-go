-- ButuanGo Milestone 4: price-change approval and private receipt evidence.
-- Run after supabase/migrations/012_request_payment_terms.sql.

begin;

alter table public.request_payment_terms
add column if not exists receipt_evidence_required boolean not null default true;

alter table public.notifications
drop constraint if exists notifications_type_check;

alter table public.notifications
add constraint notifications_type_check check (
  type in (
    'REQUEST_ACCEPTED',
    'REQUEST_STARTED',
    'COMPLETION_SUBMITTED',
    'REQUEST_COMPLETED',
    'LOCATION_UPDATED',
    'RUNNER_RELEASED',
    'REQUEST_CANCELLED',
    'PRICE_CHANGE_REQUESTED',
    'PRICE_CHANGE_APPROVED',
    'PRICE_CHANGE_DECLINED'
  )
);

create table if not exists public.request_price_changes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null
    references public.requests(id) on delete cascade,
  runner_id uuid not null
    references public.profiles(id) on delete restrict,
  previous_maximum numeric(12, 2) not null check (
    previous_maximum > 0
    and previous_maximum <= 9999999999.99
  ),
  proposed_maximum numeric(12, 2) not null check (
    proposed_maximum > previous_maximum
    and proposed_maximum <= 9999999999.99
  ),
  reason text not null check (
    char_length(trim(reason)) between 5 and 500
  ),
  status text not null default 'PENDING' check (
    status in ('PENDING', 'APPROVED', 'DECLINED', 'WITHDRAWN')
  ),
  response_note text check (
    response_note is null
    or char_length(trim(response_note)) between 2 and 500
  ),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint request_price_changes_resolution_shape check (
    (status = 'PENDING' and resolved_at is null)
    or
    (status <> 'PENDING' and resolved_at is not null)
  )
);

create unique index if not exists request_price_changes_one_pending_idx
on public.request_price_changes (request_id)
where status = 'PENDING';

create index if not exists request_price_changes_request_created_idx
on public.request_price_changes (request_id, created_at desc);

create table if not exists public.request_receipts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null
    references public.requests(id) on delete cascade,
  uploaded_by uuid not null
    references public.profiles(id) on delete restrict,
  storage_path text not null unique check (
    char_length(storage_path) between 10 and 500
  ),
  file_name text not null check (
    char_length(trim(file_name)) between 1 and 180
  ),
  mime_type text not null check (
    mime_type in (
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    )
  ),
  file_size bigint not null check (
    file_size > 0 and file_size <= 5242880
  ),
  purchase_amount numeric(12, 2) not null check (
    purchase_amount > 0
    and purchase_amount <= 9999999999.99
  ),
  note text check (
    note is null
    or char_length(trim(note)) between 2 and 300
  ),
  created_at timestamptz not null default now()
);

create index if not exists request_receipts_request_created_idx
on public.request_receipts (request_id, created_at, id);

-- Do not strand purchase tasks that were already submitted before Phase 2.
-- All OPEN, ACCEPTED, and IN_PROGRESS tasks adopt the new evidence rule.
update public.request_payment_terms as terms
set receipt_evidence_required = false
from public.requests as request
where request.id = terms.request_id
  and request.status in ('AWAITING_CONFIRMATION', 'COMPLETED')
  and not exists (
    select 1
    from public.request_receipts as receipt
    where receipt.request_id = request.id
  );

drop trigger if exists request_price_changes_set_updated_at
on public.request_price_changes;
create trigger request_price_changes_set_updated_at
before update on public.request_price_changes
for each row execute function public.set_updated_at();

alter table public.request_price_changes enable row level security;
alter table public.request_receipts enable row level security;

drop policy if exists "Participants can read request price changes"
on public.request_price_changes;
create policy "Participants can read request price changes"
on public.request_price_changes for select to authenticated
using (
  exists (
    select 1
    from public.requests as request
    where request.id = request_price_changes.request_id
      and (
        request.requestor_id = (select auth.uid())
        or request.runner_id = (select auth.uid())
      )
  )
);

drop policy if exists "Participants can read private request receipts"
on public.request_receipts;
create policy "Participants can read private request receipts"
on public.request_receipts for select to authenticated
using (
  exists (
    select 1
    from public.requests as request
    where request.id = request_receipts.request_id
      and (
        request.requestor_id = (select auth.uid())
        or request.runner_id = (select auth.uid())
      )
  )
);

revoke all on table public.request_price_changes from anon, authenticated;
revoke all on table public.request_receipts from anon, authenticated;
grant select on table public.request_price_changes to authenticated;
grant select on table public.request_receipts to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'request-receipts',
  'request-receipts',
  false,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Request participants can read receipt files"
on storage.objects;
create policy "Request participants can read receipt files"
on storage.objects for select to authenticated
using (
  bucket_id = 'request-receipts'
  and exists (
    select 1
    from public.requests as request
    where request.id::text = (storage.foldername(name))[1]
      and (
        request.requestor_id = (select auth.uid())
        or request.runner_id = (select auth.uid())
      )
  )
);

drop policy if exists "Assigned runners can upload receipt files"
on storage.objects;
create policy "Assigned runners can upload receipt files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'request-receipts'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1
    from public.requests as request
    where request.id::text = (storage.foldername(name))[1]
      and request.runner_id = (select auth.uid())
      and request.status = 'IN_PROGRESS'
  )
);

drop policy if exists "Assigned runners can remove receipt files"
on storage.objects;
create policy "Assigned runners can remove receipt files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'request-receipts'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1
    from public.requests as request
    where request.id::text = (storage.foldername(name))[1]
      and request.runner_id = (select auth.uid())
      and request.status = 'IN_PROGRESS'
  )
);

create or replace function public.request_price_change(
  p_request_id uuid,
  p_proposed_maximum numeric,
  p_reason text
)
returns public.request_price_changes
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request_record public.requests%rowtype;
  terms_record public.request_payment_terms%rowtype;
  created_change public.request_price_changes%rowtype;
begin
  if caller_id is null
    or (select private.current_profile_role()) is distinct from 'runner' then
    raise exception 'Only the assigned Runner can request a price change';
  end if;

  if p_reason is null
    or char_length(trim(p_reason)) not between 5 and 500 then
    raise exception 'Explain the price change in 5 to 500 characters';
  end if;

  select *
  into request_record
  from public.requests
  where id = p_request_id
  for update;

  if request_record.id is null
    or request_record.runner_id is distinct from caller_id
    or request_record.status <> 'IN_PROGRESS' then
    raise exception 'A price change can only be requested for your in-progress task';
  end if;

  select *
  into terms_record
  from public.request_payment_terms
  where request_id = p_request_id
  for update;

  if terms_record.arrangement is distinct from 'RUNNER_ADVANCE' then
    raise exception 'Only a Runner cash advance can use price-change approval';
  end if;

  if terms_record.runner_consented_at is null
    or terms_record.runner_consented_amount
      is distinct from terms_record.maximum_advance then
    raise exception 'Confirm the current cash-advance limit before requesting another increase';
  end if;

  if p_proposed_maximum is null
    or p_proposed_maximum <= terms_record.maximum_advance
    or p_proposed_maximum > 9999999999.99 then
    raise exception 'The new maximum must be higher than the current cash-advance limit';
  end if;

  if exists (
    select 1
    from public.request_price_changes
    where request_id = p_request_id and status = 'PENDING'
  ) then
    raise exception 'This task already has a pending price-change request';
  end if;

  insert into public.request_price_changes (
    request_id,
    runner_id,
    previous_maximum,
    proposed_maximum,
    reason
  )
  values (
    p_request_id,
    caller_id,
    terms_record.maximum_advance,
    p_proposed_maximum,
    trim(p_reason)
  )
  returning * into created_change;

  insert into public.notifications (
    user_id,
    request_id,
    type,
    title,
    message
  )
  values (
    request_record.requestor_id,
    request_record.id,
    'PRICE_CHANGE_REQUESTED',
    'Price approval needed',
    format(
      'Your Runner requested a new purchase limit for: %s',
      request_record.title
    )
  );

  return created_change;
end;
$$;

create or replace function public.resolve_request_price_change(
  p_price_change_id uuid,
  p_approve boolean,
  p_response_note text default null
)
returns public.request_price_changes
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  change_record public.request_price_changes%rowtype;
  request_record public.requests%rowtype;
  updated_change public.request_price_changes%rowtype;
begin
  if caller_id is null
    or (select private.current_profile_role()) is distinct from 'requestor' then
    raise exception 'Only the Requestor can decide a price change';
  end if;

  if p_approve is null then
    raise exception 'Choose whether to approve or decline the price change';
  end if;

  if p_response_note is not null
    and char_length(trim(p_response_note)) not between 2 and 500 then
    raise exception 'The response note must contain 2 to 500 characters';
  end if;

  select *
  into change_record
  from public.request_price_changes
  where id = p_price_change_id
  for update;

  if change_record.id is null or change_record.status <> 'PENDING' then
    raise exception 'This price-change request is no longer pending';
  end if;

  select *
  into request_record
  from public.requests
  where id = change_record.request_id
  for update;

  if request_record.requestor_id is distinct from caller_id
    or request_record.status <> 'IN_PROGRESS'
    or request_record.runner_id is distinct from change_record.runner_id then
    raise exception 'This price change can no longer be decided';
  end if;

  if p_approve then
    update public.request_payment_terms
    set
      maximum_advance = change_record.proposed_maximum,
      runner_consented_at = null,
      runner_consented_amount = null
    where request_id = change_record.request_id
      and arrangement = 'RUNNER_ADVANCE'
      and maximum_advance = change_record.previous_maximum;

    if not found then
      raise exception 'The cash-advance limit changed; refresh and review again';
    end if;
  end if;

  update public.request_price_changes
  set
    status = case when p_approve then 'APPROVED' else 'DECLINED' end,
    response_note = nullif(trim(p_response_note), ''),
    resolved_at = now()
  where id = p_price_change_id
  returning * into updated_change;

  insert into public.notifications (
    user_id,
    request_id,
    type,
    title,
    message
  )
  values (
    change_record.runner_id,
    change_record.request_id,
    case
      when p_approve then 'PRICE_CHANGE_APPROVED'
      else 'PRICE_CHANGE_DECLINED'
    end,
    case
      when p_approve then 'Price change approved'
      else 'Price change declined'
    end,
    case
      when p_approve then
        format(
          'The Requestor approved the new purchase limit for: %s',
          request_record.title
        )
      else
        format(
          'The Requestor declined the requested purchase limit for: %s',
          request_record.title
        )
    end
  );

  return updated_change;
end;
$$;

create or replace function public.withdraw_request_price_change(
  p_price_change_id uuid
)
returns public.request_price_changes
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  updated_change public.request_price_changes%rowtype;
begin
  if caller_id is null
    or (select private.current_profile_role()) is distinct from 'runner' then
    raise exception 'Only the assigned Runner can withdraw a price change';
  end if;

  update public.request_price_changes as change
  set status = 'WITHDRAWN', resolved_at = now()
  from public.requests as request
  where change.id = p_price_change_id
    and request.id = change.request_id
    and change.runner_id = caller_id
    and change.status = 'PENDING'
    and request.runner_id = caller_id
    and request.status = 'IN_PROGRESS'
  returning change.* into updated_change;

  if updated_change.id is null then
    raise exception 'This price-change request can no longer be withdrawn';
  end if;

  return updated_change;
end;
$$;

create or replace function public.confirm_request_cash_advance(
  p_request_id uuid
)
returns public.request_payment_terms
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  updated_terms public.request_payment_terms%rowtype;
begin
  if caller_id is null
    or (select private.current_profile_role()) is distinct from 'runner' then
    raise exception 'Only an authenticated Runner can confirm a cash advance';
  end if;

  if exists (
    select 1
    from public.request_price_changes
    where request_id = p_request_id and status = 'PENDING'
  ) then
    raise exception 'Wait for the Requestor to decide the pending price change';
  end if;

  update public.request_payment_terms as terms
  set
    runner_consented_at = now(),
    runner_consented_amount = terms.maximum_advance
  from public.requests as request
  where terms.request_id = p_request_id
    and request.id = terms.request_id
    and request.runner_id = caller_id
    and request.status in ('ACCEPTED', 'IN_PROGRESS')
    and terms.arrangement = 'RUNNER_ADVANCE'
  returning terms.* into updated_terms;

  if updated_terms.request_id is null then
    raise exception 'This cash advance cannot be confirmed';
  end if;

  return updated_terms;
end;
$$;

create or replace function public.add_request_receipt(
  p_request_id uuid,
  p_storage_path text,
  p_file_name text,
  p_mime_type text,
  p_file_size bigint,
  p_purchase_amount numeric,
  p_note text default null
)
returns public.request_receipts
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request_record public.requests%rowtype;
  terms_record public.request_payment_terms%rowtype;
  created_receipt public.request_receipts%rowtype;
  existing_total numeric(12, 2);
  spending_limit numeric(12, 2);
begin
  if caller_id is null
    or (select private.current_profile_role()) is distinct from 'runner' then
    raise exception 'Only the assigned Runner can upload a receipt';
  end if;

  if p_file_name is null
    or char_length(trim(p_file_name)) not between 1 and 180 then
    raise exception 'The receipt file name is invalid';
  end if;

  if p_mime_type is null
    or p_mime_type not in (
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    ) then
    raise exception 'Upload a JPG, PNG, WebP, or PDF receipt';
  end if;

  if p_file_size is null or p_file_size <= 0 or p_file_size > 5242880 then
    raise exception 'The receipt file must be 5 MB or smaller';
  end if;

  if p_purchase_amount is null
    or p_purchase_amount <= 0
    or p_purchase_amount > 9999999999.99 then
    raise exception 'Enter the amount shown on this receipt';
  end if;

  if p_note is not null
    and char_length(trim(p_note)) not between 2 and 300 then
    raise exception 'The receipt note must contain 2 to 300 characters';
  end if;

  select *
  into request_record
  from public.requests
  where id = p_request_id
  for update;

  if request_record.id is null
    or request_record.runner_id is distinct from caller_id
    or request_record.status <> 'IN_PROGRESS' then
    raise exception 'Receipts can only be uploaded for your in-progress task';
  end if;

  select *
  into terms_record
  from public.request_payment_terms
  where request_id = p_request_id;

  if terms_record.arrangement not in ('MERCHANT_PREPAID', 'RUNNER_ADVANCE') then
    raise exception 'This task does not require purchase receipt evidence';
  end if;

  if exists (
    select 1
    from public.request_price_changes
    where request_id = p_request_id and status = 'PENDING'
  ) then
    raise exception 'Wait for the pending price-change decision before uploading a receipt';
  end if;

  if terms_record.arrangement = 'RUNNER_ADVANCE'
    and (
      terms_record.runner_consented_at is null
      or terms_record.runner_consented_amount
        is distinct from terms_record.maximum_advance
    ) then
    raise exception 'Confirm the current cash-advance limit before uploading a receipt';
  end if;

  if p_storage_path is null
    or char_length(p_storage_path) not between 10 and 500
    or p_storage_path not like (
      p_request_id::text || '/' || caller_id::text || '/%'
    ) then
    raise exception 'The receipt storage path is invalid';
  end if;

  if not exists (
    select 1
    from storage.objects
    where bucket_id = 'request-receipts'
      and name = p_storage_path
  ) then
    raise exception 'The uploaded receipt file was not found';
  end if;

  if (
    select count(*)
    from public.request_receipts
    where request_id = p_request_id
  ) >= 8 then
    raise exception 'A task can have up to 8 receipt files';
  end if;

  select coalesce(sum(purchase_amount), 0)
  into existing_total
  from public.request_receipts
  where request_id = p_request_id;

  spending_limit := terms_record.maximum_advance;

  if terms_record.arrangement = 'RUNNER_ADVANCE'
    and existing_total + p_purchase_amount > spending_limit then
    raise exception 'Receipt total exceeds the approved purchase limit';
  end if;

  insert into public.request_receipts (
    request_id,
    uploaded_by,
    storage_path,
    file_name,
    mime_type,
    file_size,
    purchase_amount,
    note
  )
  values (
    p_request_id,
    caller_id,
    p_storage_path,
    trim(p_file_name),
    p_mime_type,
    p_file_size,
    p_purchase_amount,
    nullif(trim(p_note), '')
  )
  returning * into created_receipt;

  return created_receipt;
end;
$$;

create or replace function public.delete_request_receipt(
  p_receipt_id uuid
)
returns public.request_receipts
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  deleted_receipt public.request_receipts%rowtype;
begin
  if caller_id is null
    or (select private.current_profile_role()) is distinct from 'runner' then
    raise exception 'Only the assigned Runner can remove a receipt';
  end if;

  delete from public.request_receipts as receipt
  using public.requests as request
  where receipt.id = p_receipt_id
    and request.id = receipt.request_id
    and receipt.uploaded_by = caller_id
    and request.runner_id = caller_id
    and request.status = 'IN_PROGRESS'
  returning receipt.* into deleted_receipt;

  if deleted_receipt.id is null then
    raise exception 'This receipt can no longer be removed';
  end if;

  return deleted_receipt;
end;
$$;

create or replace function public.submit_request_completion_with_payment_evidence(
  p_request_id uuid
)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request_record public.requests%rowtype;
  terms_record public.request_payment_terms%rowtype;
  receipt_total numeric(12, 2);
begin
  if caller_id is null
    or (select private.current_profile_role()) is distinct from 'runner' then
    raise exception 'Only the assigned Runner can submit task completion';
  end if;

  select *
  into request_record
  from public.requests
  where id = p_request_id
  for update;

  if request_record.id is null
    or request_record.runner_id is distinct from caller_id
    or request_record.status <> 'IN_PROGRESS' then
    raise exception 'The task was not found or cannot be submitted for confirmation';
  end if;

  select *
  into terms_record
  from public.request_payment_terms
  where request_id = p_request_id;

  if terms_record.request_id is null then
    raise exception 'This task has no payment arrangement';
  end if;

  if exists (
    select 1
    from public.request_price_changes
    where request_id = p_request_id and status = 'PENDING'
  ) then
    raise exception 'Resolve or withdraw the pending price change before submitting completion';
  end if;

  if terms_record.arrangement = 'RUNNER_ADVANCE'
    and (
      terms_record.runner_consented_at is null
      or terms_record.runner_consented_amount
        is distinct from terms_record.maximum_advance
    ) then
    raise exception 'Confirm the current cash-advance limit before submitting completion';
  end if;

  if terms_record.receipt_evidence_required
    and terms_record.arrangement in ('MERCHANT_PREPAID', 'RUNNER_ADVANCE') then
    select coalesce(sum(purchase_amount), 0)
    into receipt_total
    from public.request_receipts
    where request_id = p_request_id;

    if receipt_total <= 0 then
      raise exception 'Upload at least one purchase receipt before submitting completion';
    end if;

    if terms_record.arrangement = 'RUNNER_ADVANCE'
      and receipt_total > terms_record.maximum_advance then
      raise exception 'Receipt total exceeds the approved cash-advance limit';
    end if;

  end if;

  return public.submit_request_completion(p_request_id);
end;
$$;

create or replace function public.confirm_request_completion_with_payment_evidence(
  p_request_id uuid,
  p_receipts_reviewed boolean
)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request_record public.requests%rowtype;
  terms_record public.request_payment_terms%rowtype;
begin
  if caller_id is null
    or (select private.current_profile_role()) is distinct from 'requestor' then
    raise exception 'Only the Requestor can confirm task completion';
  end if;

  select *
  into request_record
  from public.requests
  where id = p_request_id
  for update;

  if request_record.id is null
    or request_record.requestor_id is distinct from caller_id
    or request_record.status <> 'AWAITING_CONFIRMATION' then
    raise exception 'The task was not found or is not awaiting confirmation';
  end if;

  select *
  into terms_record
  from public.request_payment_terms
  where request_id = p_request_id;

  if terms_record.receipt_evidence_required
    and terms_record.arrangement in ('MERCHANT_PREPAID', 'RUNNER_ADVANCE') then
    if not exists (
      select 1
      from public.request_receipts
      where request_id = p_request_id
    ) then
      raise exception 'The Runner has not uploaded purchase receipt evidence';
    end if;

    if p_receipts_reviewed is distinct from true then
      raise exception 'Review the purchase receipts before confirming completion';
    end if;
  end if;

  return public.confirm_request_completion(p_request_id);
end;
$$;

-- Prevent authenticated clients from bypassing the Phase 2 evidence checks.
revoke all on function public.submit_request_completion(uuid)
from public, anon, authenticated;
revoke all on function public.confirm_request_completion(uuid)
from public, anon, authenticated;

revoke all on function public.request_price_change(uuid, numeric, text)
from public, anon;
revoke all on function public.resolve_request_price_change(
  uuid, boolean, text
) from public, anon;
revoke all on function public.withdraw_request_price_change(uuid)
from public, anon;
revoke all on function public.add_request_receipt(
  uuid, text, text, text, bigint, numeric, text
) from public, anon;
revoke all on function public.delete_request_receipt(uuid)
from public, anon;
revoke all on function public.submit_request_completion_with_payment_evidence(
  uuid
) from public, anon;
revoke all on function public.confirm_request_completion_with_payment_evidence(
  uuid, boolean
) from public, anon;

grant execute on function public.request_price_change(uuid, numeric, text)
to authenticated;
grant execute on function public.resolve_request_price_change(
  uuid, boolean, text
) to authenticated;
grant execute on function public.withdraw_request_price_change(uuid)
to authenticated;
grant execute on function public.add_request_receipt(
  uuid, text, text, text, bigint, numeric, text
) to authenticated;
grant execute on function public.delete_request_receipt(uuid)
to authenticated;
grant execute on function public.submit_request_completion_with_payment_evidence(
  uuid
) to authenticated;
grant execute on function public.confirm_request_completion_with_payment_evidence(
  uuid, boolean
) to authenticated;

comment on table public.request_price_changes is
'Participant-only requests for a higher Runner cash-advance limit and the Requestor decision.';

comment on table public.request_receipts is
'Private purchase receipt metadata. Files are stored in the private request-receipts Storage bucket.';

comment on column public.request_payment_terms.receipt_evidence_required is
'False only for legacy purchase tasks that reached confirmation before Phase 2 was installed.';

comment on function public.submit_request_completion_with_payment_evidence(uuid) is
'Submits completion only after pending price changes, current consent, and required receipts are valid.';

commit;
