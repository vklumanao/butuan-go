-- ButuanGo in-app product feedback and protected Admin review queue.
-- Run after supabase/migrations/022_admin_analytics_comparisons.sql.

begin;

create table if not exists public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles(id) on delete restrict,
  workspace_role text not null check (
    workspace_role in ('requestor', 'runner', 'admin')
  ),
  category text not null check (
    category in ('BUG', 'SUGGESTION', 'CONFUSING_EXPERIENCE', 'OTHER')
  ),
  message text not null check (
    char_length(trim(message)) between 10 and 2000
  ),
  page_path text check (
    page_path is null
    or (
      char_length(page_path) between 1 and 500
      and page_path like '/%'
    )
  ),
  page_title text check (
    page_title is null or char_length(trim(page_title)) between 1 and 200
  ),
  status text not null default 'NEW' check (
    status in ('NEW', 'REVIEWED', 'PLANNED', 'RESOLVED', 'DISMISSED')
  ),
  admin_note text check (
    admin_note is null or char_length(trim(admin_note)) between 5 and 1500
  ),
  reviewed_by uuid references public.profiles(id) on delete restrict,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_feedback_review_shape check (
    (
      status = 'NEW'
      and admin_note is null
      and reviewed_by is null
      and reviewed_at is null
    )
    or
    (
      status <> 'NEW'
      and admin_note is not null
      and reviewed_by is not null
      and reviewed_at is not null
    )
  )
);

create index if not exists user_feedback_admin_queue_idx
on public.user_feedback (status, created_at desc, id desc);

create index if not exists user_feedback_account_rate_idx
on public.user_feedback (account_id, created_at desc);

drop trigger if exists user_feedback_set_updated_at
on public.user_feedback;
create trigger user_feedback_set_updated_at
before update on public.user_feedback
for each row execute function public.set_updated_at();

alter table public.user_feedback enable row level security;

revoke all on table public.user_feedback
from public, anon, authenticated;

create or replace function public.submit_user_feedback(
  p_category text,
  p_message text,
  p_page_path text default null,
  p_page_title text default null
)
returns public.user_feedback
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  caller_role text;
  clean_message text := trim(coalesce(p_message, ''));
  clean_page_path text := nullif(trim(p_page_path), '');
  clean_page_title text := nullif(trim(p_page_title), '');
  created_feedback public.user_feedback%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication is required';
  end if;

  caller_role := (select private.current_profile_role());
  if caller_role is null
    or caller_role not in ('requestor', 'runner', 'admin') then
    raise exception 'Complete account setup before sending feedback';
  end if;
  if p_category is null
    or p_category not in (
      'BUG',
      'SUGGESTION',
      'CONFUSING_EXPERIENCE',
      'OTHER'
    ) then
    raise exception 'Choose a valid feedback category';
  end if;
  if char_length(clean_message) not between 10 and 2000 then
    raise exception 'Feedback must contain 10 to 2000 characters';
  end if;
  if clean_page_path is not null
    and (
      char_length(clean_page_path) > 500
      or clean_page_path not like '/%'
    ) then
    raise exception 'Page context is invalid';
  end if;
  if clean_page_title is not null
    and char_length(clean_page_title) > 200 then
    raise exception 'Page title is too long';
  end if;

  if (
    select count(*)
    from public.user_feedback
    where account_id = caller_id
      and created_at >= now() - interval '1 hour'
  ) >= 5 then
    raise exception 'You have sent several feedback entries recently. Try again later';
  end if;

  if (
    select count(*)
    from public.user_feedback
    where account_id = caller_id
      and created_at >= now() - interval '1 day'
  ) >= 20 then
    raise exception 'Your daily feedback limit has been reached. Try again tomorrow';
  end if;

  insert into public.user_feedback (
    account_id,
    workspace_role,
    category,
    message,
    page_path,
    page_title
  )
  values (
    caller_id,
    caller_role,
    p_category,
    clean_message,
    clean_page_path,
    clean_page_title
  )
  returning * into created_feedback;

  return created_feedback;
end;
$$;

create or replace function public.admin_list_user_feedback(
  p_status text default 'NEW',
  p_category text default 'ALL',
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  account_id uuid,
  submitter_name text,
  submitter_email text,
  workspace_role text,
  category text,
  message text,
  page_path text,
  page_title text,
  status text,
  admin_note text,
  reviewed_by uuid,
  reviewer_name text,
  reviewed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  safe_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  safe_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if (select auth.uid()) is null
    or (select private.current_profile_role()) is distinct from 'admin' then
    raise exception 'Only an Admin can review product feedback';
  end if;
  if p_status is null
    or p_status not in (
      'NEW',
      'REVIEWED',
      'PLANNED',
      'RESOLVED',
      'DISMISSED',
      'ALL'
    ) then
    raise exception 'Choose a valid feedback status';
  end if;
  if p_category is null
    or p_category not in (
      'BUG',
      'SUGGESTION',
      'CONFUSING_EXPERIENCE',
      'OTHER',
      'ALL'
    ) then
    raise exception 'Choose a valid feedback category';
  end if;

  return query
  select
    feedback.id,
    feedback.account_id,
    submitter.full_name,
    submitter.email,
    feedback.workspace_role,
    feedback.category,
    feedback.message,
    feedback.page_path,
    feedback.page_title,
    feedback.status,
    feedback.admin_note,
    feedback.reviewed_by,
    reviewer.full_name,
    feedback.reviewed_at,
    feedback.created_at,
    feedback.updated_at,
    count(*) over() as total_count
  from public.user_feedback as feedback
  join public.profiles as submitter on submitter.id = feedback.account_id
  left join public.profiles as reviewer on reviewer.id = feedback.reviewed_by
  where (p_status = 'ALL' or feedback.status = p_status)
    and (p_category = 'ALL' or feedback.category = p_category)
  order by
    case when feedback.status = 'NEW' then 0 else 1 end,
    feedback.created_at desc,
    feedback.id desc
  limit safe_limit
  offset safe_offset;
end;
$$;

create or replace function public.admin_update_user_feedback(
  p_feedback_id uuid,
  p_status text,
  p_admin_note text
)
returns public.user_feedback
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_id uuid := (select auth.uid());
  clean_note text := trim(coalesce(p_admin_note, ''));
  previous_status text;
  updated_feedback public.user_feedback%rowtype;
begin
  if admin_id is null
    or (select private.current_profile_role()) is distinct from 'admin' then
    raise exception 'Only an Admin can update product feedback';
  end if;
  if p_feedback_id is null then
    raise exception 'Choose feedback to update';
  end if;
  if p_status is null
    or p_status not in ('REVIEWED', 'PLANNED', 'RESOLVED', 'DISMISSED') then
    raise exception 'Choose a valid feedback outcome';
  end if;
  if char_length(clean_note) not between 5 and 1500 then
    raise exception 'Admin note must contain 5 to 1500 characters';
  end if;

  select feedback.status
  into previous_status
  from public.user_feedback as feedback
  where feedback.id = p_feedback_id
  for update;

  if previous_status is null then
    raise exception 'Feedback was not found';
  end if;

  update public.user_feedback
  set
    status = p_status,
    admin_note = clean_note,
    reviewed_by = admin_id,
    reviewed_at = now()
  where id = p_feedback_id
  returning * into updated_feedback;

  insert into public.admin_audit_events (
    admin_id,
    action,
    entity_type,
    entity_id,
    details
  )
  values (
    admin_id,
    'USER_FEEDBACK_UPDATED',
    'user_feedback',
    updated_feedback.id,
    jsonb_build_object(
      'account_id', updated_feedback.account_id,
      'category', updated_feedback.category,
      'from_status', previous_status,
      'to_status', updated_feedback.status
    )
  );

  return updated_feedback;
end;
$$;

alter table public.admin_audit_events
drop constraint if exists admin_audit_events_action_check;
alter table public.admin_audit_events
add constraint admin_audit_events_action_check check (
  action in (
    'DISPUTE_RESOLVED',
    'ACCOUNT_RESTRICTED',
    'ACCOUNT_RESTRICTION_UPDATED',
    'ACCOUNT_RESTRICTION_CLEARED',
    'ACCOUNT_REPORT_RESOLVED',
    'ACCOUNT_ANONYMIZED',
    'USER_FEEDBACK_UPDATED'
  )
);

alter table public.admin_audit_events
drop constraint if exists admin_audit_events_entity_type_check;
alter table public.admin_audit_events
add constraint admin_audit_events_entity_type_check check (
  entity_type in (
    'request_dispute',
    'account_restriction',
    'account_report',
    'account_deletion_request',
    'user_feedback'
  )
);

revoke all on function public.submit_user_feedback(text, text, text, text)
from public, anon, authenticated;
revoke all on function public.admin_list_user_feedback(text, text, integer, integer)
from public, anon, authenticated;
revoke all on function public.admin_update_user_feedback(uuid, text, text)
from public, anon, authenticated;

grant execute on function public.submit_user_feedback(text, text, text, text)
to authenticated;
grant execute on function public.admin_list_user_feedback(text, text, integer, integer)
to authenticated;
grant execute on function public.admin_update_user_feedback(uuid, text, text)
to authenticated;

comment on table public.user_feedback is
'Authenticated in-app product feedback. Direct table access is disabled; submissions and Admin review use guarded RPCs.';

comment on function public.submit_user_feedback(text, text, text, text) is
'Submits rate-limited product feedback with optional current-page context.';

comment on function public.admin_list_user_feedback(text, text, integer, integer) is
'Lists product feedback only for the protected Admin workspace.';

comment on function public.admin_update_user_feedback(uuid, text, text) is
'Records an Admin feedback outcome and creates a protected audit event.';

commit;
