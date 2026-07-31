-- ButuanGo beta trust layer: participant ratings, safe activity summaries,
-- future-match blocking, safety reports, and server-enforced abuse limits.
-- Run after supabase/migrations/017_admin_dashboard.sql.

begin;

create table if not exists public.request_ratings (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  reviewed_user_id uuid not null references public.profiles(id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  comment text check (
    comment is null or char_length(trim(comment)) between 2 and 500
  ),
  created_at timestamptz not null default now(),
  constraint request_ratings_parties_differ check (
    reviewer_id <> reviewed_user_id
  ),
  constraint request_ratings_one_per_participant unique (
    request_id,
    reviewer_id
  )
);

create index if not exists request_ratings_reviewed_user_idx
on public.request_ratings (reviewed_user_id, created_at desc);

create table if not exists public.account_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_user_id),
  constraint account_blocks_parties_differ check (
    blocker_id <> blocked_user_id
  )
);

create index if not exists account_blocks_blocked_user_idx
on public.account_blocks (blocked_user_id, blocker_id);

create table if not exists public.account_reports (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete restrict,
  reporter_id uuid not null references public.profiles(id) on delete restrict,
  reported_user_id uuid not null references public.profiles(id) on delete restrict,
  category text not null check (
    category in ('HARASSMENT', 'SPAM', 'IMPERSONATION', 'UNSAFE_BEHAVIOR', 'OTHER')
  ),
  details text not null check (
    char_length(trim(details)) between 10 and 1000
  ),
  status text not null default 'OPEN' check (
    status in ('OPEN', 'ACTIONED', 'DISMISSED')
  ),
  resolution_note text check (
    resolution_note is null
    or char_length(trim(resolution_note)) between 5 and 1500
  ),
  reviewed_by uuid references public.profiles(id) on delete restrict,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_reports_parties_differ check (
    reporter_id <> reported_user_id
  ),
  constraint account_reports_resolution_shape check (
    (status = 'OPEN'
      and resolution_note is null
      and reviewed_by is null
      and reviewed_at is null)
    or
    (status in ('ACTIONED', 'DISMISSED')
      and resolution_note is not null
      and reviewed_by is not null
      and reviewed_at is not null)
  )
);

create unique index if not exists account_reports_one_open_pair_idx
on public.account_reports (request_id, reporter_id, reported_user_id)
where status = 'OPEN';

create index if not exists account_reports_status_created_idx
on public.account_reports (status, created_at desc);

create index if not exists account_reports_reported_user_idx
on public.account_reports (reported_user_id, status, created_at desc);

alter table public.account_restrictions
add column if not exists source_report_id uuid
references public.account_reports(id) on delete set null;

create or replace function private.audit_admin_account_restriction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  target_id uuid;
  audit_action text;
  audit_details jsonb;
begin
  if tg_op = 'DELETE' then
    actor_id := coalesce((select auth.uid()), old.created_by);
    target_id := old.account_id;
    audit_action := 'ACCOUNT_RESTRICTION_CLEARED';
    audit_details := jsonb_build_object(
      'restricted_until', old.restricted_until,
      'source_dispute_id', old.source_dispute_id,
      'source_report_id', old.source_report_id
    );
  elsif tg_op = 'UPDATE' then
    actor_id := new.created_by;
    target_id := new.account_id;
    audit_action := 'ACCOUNT_RESTRICTION_UPDATED';
    audit_details := jsonb_build_object(
      'restricted_until', new.restricted_until,
      'source_dispute_id', new.source_dispute_id,
      'source_report_id', new.source_report_id
    );
  else
    actor_id := new.created_by;
    target_id := new.account_id;
    audit_action := 'ACCOUNT_RESTRICTED';
    audit_details := jsonb_build_object(
      'restricted_until', new.restricted_until,
      'source_dispute_id', new.source_dispute_id,
      'source_report_id', new.source_report_id
    );
  end if;

  insert into public.admin_audit_events (
    admin_id,
    action,
    entity_type,
    entity_id,
    details
  )
  values (
    actor_id,
    audit_action,
    'account_restriction',
    target_id,
    audit_details
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists account_reports_set_updated_at
on public.account_reports;
create trigger account_reports_set_updated_at
before update on public.account_reports
for each row execute function public.set_updated_at();

alter table public.request_ratings enable row level security;
alter table public.account_blocks enable row level security;
alter table public.account_reports enable row level security;

drop policy if exists "Participants and admins can read request ratings"
on public.request_ratings;
create policy "Participants and admins can read request ratings"
on public.request_ratings for select to authenticated
using (
  reviewer_id = (select auth.uid())
  or reviewed_user_id = (select auth.uid())
  or (select private.current_profile_role()) = 'admin'
);

drop policy if exists "Users and admins can read account blocks"
on public.account_blocks;
create policy "Users and admins can read account blocks"
on public.account_blocks for select to authenticated
using (
  blocker_id = (select auth.uid())
  or (select private.current_profile_role()) = 'admin'
);

drop policy if exists "Reporters and admins can read safety reports"
on public.account_reports;
create policy "Reporters and admins can read safety reports"
on public.account_reports for select to authenticated
using (
  reporter_id = (select auth.uid())
  or (select private.current_profile_role()) = 'admin'
);

revoke all on table public.request_ratings
from public, anon, authenticated;
revoke all on table public.account_blocks
from public, anon, authenticated;
revoke all on table public.account_reports
from public, anon, authenticated;

grant select on table public.request_ratings to authenticated;
grant select on table public.account_blocks to authenticated;
grant select on table public.account_reports to authenticated;

create or replace function private.users_have_block(
  p_first_user_id uuid,
  p_second_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.account_blocks
    where (blocker_id = p_first_user_id and blocked_user_id = p_second_user_id)
       or (blocker_id = p_second_user_id and blocked_user_id = p_first_user_id)
  );
$$;

create or replace function private.enforce_request_match_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.runner_id is not null
    and old.runner_id is null
    and new.status = 'ACCEPTED'
    and private.users_have_block(new.requestor_id, new.runner_id) then
    raise exception 'This request is unavailable because one participant blocked future matching';
  end if;

  return new;
end;
$$;

drop trigger if exists requests_enforce_match_block
on public.requests;
create trigger requests_enforce_match_block
before update of runner_id, status on public.requests
for each row execute function private.enforce_request_match_block();

create or replace function private.enforce_request_creation_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null or new.requestor_id is distinct from caller_id then
    return new;
  end if;

  if (
    select count(*)
    from public.requests
    where requestor_id = caller_id
      and created_at >= now() - interval '10 minutes'
  ) >= 3 then
    raise exception 'Request limit reached. Wait before creating another request';
  end if;

  if (
    select count(*)
    from public.requests
    where requestor_id = caller_id
      and created_at >= now() - interval '24 hours'
  ) >= 10 then
    raise exception 'Daily request limit reached. Try again after 24 hours';
  end if;

  if (
    select count(*)
    from public.requests
    where requestor_id = caller_id
      and status = 'OPEN'
  ) >= 5 then
    raise exception 'Complete or cancel an open request before creating another';
  end if;

  if (
    select count(*)
    from public.requests
    where requestor_id = caller_id
      and status = 'CANCELLED'
      and updated_at >= now() - interval '24 hours'
  ) >= 5 then
    raise exception 'New requests are temporarily limited after repeated cancellations';
  end if;

  return new;
end;
$$;

drop trigger if exists requests_enforce_creation_limits
on public.requests;
create trigger requests_enforce_creation_limits
before insert on public.requests
for each row execute function private.enforce_request_creation_limits();

drop policy if exists "Participants and runners can read eligible requests"
on public.requests;
create policy "Participants and runners can read eligible requests"
on public.requests for select to authenticated
using (
  requestor_id = (select auth.uid())
  or runner_id = (select auth.uid())
  or (
    status = 'OPEN'
    and (select private.current_profile_role()) = 'runner'
    and requestor_id <> (select auth.uid())
    and not private.users_have_block(
      requestor_id,
      (select auth.uid())
    )
  )
);

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
    'PRICE_CHANGE_DECLINED',
    'HANDOFF_VERIFIED',
    'PAYMENT_CONFIRMED',
    'REQUEST_FAILED',
    'FAILURE_ACKNOWLEDGED',
    'DISPUTE_OPENED',
    'DISPUTE_WITHDRAWN',
    'DISPUTE_RESOLVED',
    'ACCOUNT_RESTRICTED',
    'RATING_RECEIVED',
    'SAFETY_REPORT_RESOLVED'
  )
);

create or replace function public.get_request_trust_context(
  p_request_id uuid,
  p_other_user_id uuid
)
returns table (
  profile_id uuid,
  average_rating numeric,
  rating_count bigint,
  completed_as_requestor bigint,
  completed_as_runner bigint,
  cancelled_as_requestor bigint,
  failed_as_runner bigint,
  blocked_by_me boolean,
  my_rating smallint,
  my_rating_comment text,
  can_rate boolean,
  can_report boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request_record public.requests%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication is required';
  end if;

  select *
  into request_record
  from public.requests
  where id = p_request_id;

  if request_record.id is null
    or request_record.runner_id is null
    or not (
      (request_record.requestor_id = caller_id
        and request_record.runner_id = p_other_user_id)
      or
      (request_record.runner_id = caller_id
        and request_record.requestor_id = p_other_user_id)
    ) then
    raise exception 'Trust details are available only to request participants';
  end if;

  return query
  select
    p_other_user_id,
    coalesce(round(avg(rating_record.rating)::numeric, 2), 0::numeric),
    count(rating_record.id),
    (
      select count(*)
      from public.requests
      where requestor_id = p_other_user_id
        and status = 'COMPLETED'
    ),
    (
      select count(*)
      from public.requests
      where runner_id = p_other_user_id
        and status = 'COMPLETED'
    ),
    (
      select count(*)
      from public.requests
      where requestor_id = p_other_user_id
        and status = 'CANCELLED'
    ),
    (
      select count(*)
      from public.requests
      where runner_id = p_other_user_id
        and status = 'FAILED'
    ),
    exists (
      select 1
      from public.account_blocks
      where blocker_id = caller_id
        and blocked_user_id = p_other_user_id
    ),
    my_rating_record.rating,
    my_rating_record.comment,
    request_record.status = 'COMPLETED'
      and request_record.completed_at >= now() - interval '30 days'
      and my_rating_record.id is null,
    not exists (
      select 1
      from public.account_reports
      where request_id = p_request_id
        and reporter_id = caller_id
        and reported_user_id = p_other_user_id
        and status = 'OPEN'
    )
  from public.profiles as profile
  left join public.request_ratings as rating_record
    on rating_record.reviewed_user_id = profile.id
  left join public.request_ratings as my_rating_record
    on my_rating_record.request_id = p_request_id
   and my_rating_record.reviewer_id = caller_id
  where profile.id = p_other_user_id
  group by
    profile.id,
    my_rating_record.id,
    my_rating_record.rating,
    my_rating_record.comment;
end;
$$;

create or replace function public.submit_request_rating(
  p_request_id uuid,
  p_rating smallint,
  p_comment text default null
)
returns public.request_ratings
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request_record public.requests%rowtype;
  reviewed_id uuid;
  reviewer_role text;
  saved_rating public.request_ratings%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication is required';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Choose a rating from 1 to 5';
  end if;

  if p_comment is not null
    and char_length(trim(p_comment)) not between 2 and 500 then
    raise exception 'Rating comments must contain 2 to 500 characters';
  end if;

  select *
  into request_record
  from public.requests
  where id = p_request_id;

  if request_record.status <> 'COMPLETED'
    or request_record.completed_at < now() - interval '30 days' then
    raise exception 'This request is not eligible for a rating';
  end if;

  if request_record.requestor_id = caller_id then
    reviewed_id := request_record.runner_id;
    reviewer_role := 'requestor';
  elsif request_record.runner_id = caller_id then
    reviewed_id := request_record.requestor_id;
    reviewer_role := 'runner';
  else
    raise exception 'Only request participants can submit a rating';
  end if;

  if reviewed_id is null then
    raise exception 'The request has no participant to rate';
  end if;

  insert into public.request_ratings (
    request_id,
    reviewer_id,
    reviewed_user_id,
    rating,
    comment
  )
  values (
    p_request_id,
    caller_id,
    reviewed_id,
    p_rating,
    nullif(trim(p_comment), '')
  )
  returning * into saved_rating;

  insert into public.notifications (
    user_id,
    request_id,
    type,
    target_role,
    title,
    message
  )
  values (
    reviewed_id,
    p_request_id,
    'RATING_RECEIVED',
    case when reviewer_role = 'requestor' then 'runner' else 'requestor' end,
    'New transaction rating',
    format('You received a %s-star rating for: %s', p_rating, request_record.title)
  );

  return saved_rating;
exception
  when unique_violation then
    raise exception 'You already rated this request';
end;
$$;

create or replace function public.set_account_block(
  p_request_id uuid,
  p_blocked_user_id uuid,
  p_blocked boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request_record public.requests%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication is required';
  end if;

  if p_blocked is null then
    raise exception 'Choose whether to block or unblock this account';
  end if;

  select *
  into request_record
  from public.requests
  where id = p_request_id;

  if request_record.runner_id is null
    or not (
      (request_record.requestor_id = caller_id
        and request_record.runner_id = p_blocked_user_id)
      or
      (request_record.runner_id = caller_id
        and request_record.requestor_id = p_blocked_user_id)
    ) then
    raise exception 'You can block only a participant from your request';
  end if;

  if p_blocked then
    if (
      select count(*)
      from public.account_blocks
      where blocker_id = caller_id
        and created_at >= now() - interval '24 hours'
    ) >= 20 then
      raise exception 'Daily block limit reached';
    end if;

    insert into public.account_blocks (blocker_id, blocked_user_id)
    values (caller_id, p_blocked_user_id)
    on conflict (blocker_id, blocked_user_id) do nothing;
  else
    delete from public.account_blocks
    where blocker_id = caller_id
      and blocked_user_id = p_blocked_user_id;
  end if;

  return p_blocked;
end;
$$;

create or replace function public.submit_account_report(
  p_request_id uuid,
  p_reported_user_id uuid,
  p_category text,
  p_details text
)
returns public.account_reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request_record public.requests%rowtype;
  saved_report public.account_reports%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication is required';
  end if;

  if p_category not in (
    'HARASSMENT',
    'SPAM',
    'IMPERSONATION',
    'UNSAFE_BEHAVIOR',
    'OTHER'
  ) then
    raise exception 'Choose a valid report category';
  end if;

  if char_length(trim(coalesce(p_details, ''))) not between 10 and 1000 then
    raise exception 'Describe the safety concern in 10 to 1000 characters';
  end if;

  select *
  into request_record
  from public.requests
  where id = p_request_id;

  if request_record.runner_id is null
    or not (
      (request_record.requestor_id = caller_id
        and request_record.runner_id = p_reported_user_id)
      or
      (request_record.runner_id = caller_id
        and request_record.requestor_id = p_reported_user_id)
    ) then
    raise exception 'You can report only a participant from your request';
  end if;

  if (
    select count(*)
    from public.account_reports
    where reporter_id = caller_id
      and created_at >= now() - interval '24 hours'
  ) >= 5 then
    raise exception 'Daily safety-report limit reached';
  end if;

  insert into public.account_reports (
    request_id,
    reporter_id,
    reported_user_id,
    category,
    details
  )
  values (
    p_request_id,
    caller_id,
    p_reported_user_id,
    p_category,
    trim(p_details)
  )
  returning * into saved_report;

  return saved_report;
exception
  when unique_violation then
    raise exception 'An open safety report already exists for this participant and request';
end;
$$;

create or replace function public.admin_list_account_reports(
  p_status text default 'OPEN',
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  request_id uuid,
  request_title text,
  category text,
  details text,
  status text,
  reporter_id uuid,
  reporter_name text,
  reporter_email text,
  reported_user_id uuid,
  reported_name text,
  reported_email text,
  reported_restricted_until timestamptz,
  resolution_note text,
  reviewer_name text,
  reviewed_at timestamptz,
  created_at timestamptz
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
  if (select private.current_profile_role()) is distinct from 'admin' then
    raise exception 'Only an Admin can review safety reports';
  end if;

  if p_status is null
    or p_status not in ('ALL', 'OPEN', 'ACTIONED', 'DISMISSED') then
    raise exception 'Choose a valid safety-report status';
  end if;

  return query
  select
    report.id,
    report.request_id,
    request.title,
    report.category,
    report.details,
    report.status,
    report.reporter_id,
    reporter.full_name,
    reporter.email,
    report.reported_user_id,
    reported.full_name,
    reported.email,
    restriction.restricted_until,
    report.resolution_note,
    reviewer.full_name,
    report.reviewed_at,
    report.created_at
  from public.account_reports as report
  join public.requests as request on request.id = report.request_id
  join public.profiles as reporter on reporter.id = report.reporter_id
  join public.profiles as reported on reported.id = report.reported_user_id
  left join public.profiles as reviewer on reviewer.id = report.reviewed_by
  left join public.account_restrictions as restriction
    on restriction.account_id = report.reported_user_id
   and restriction.restricted_until > now()
  where p_status = 'ALL' or report.status = p_status
  order by report.created_at desc, report.id desc
  limit safe_limit
  offset safe_offset;
end;
$$;

create or replace function public.admin_resolve_account_report(
  p_report_id uuid,
  p_outcome text,
  p_resolution_note text,
  p_restrict_reported_days integer default 0
)
returns public.account_reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_id uuid := (select auth.uid());
  report_record public.account_reports%rowtype;
  updated_report public.account_reports%rowtype;
  request_record public.requests%rowtype;
  restricted_until_value timestamptz;
begin
  if admin_id is null
    or (select private.current_profile_role()) is distinct from 'admin' then
    raise exception 'Only an Admin can resolve safety reports';
  end if;

  if p_outcome not in ('ACTIONED', 'DISMISSED') then
    raise exception 'Choose a valid report outcome';
  end if;

  if char_length(trim(coalesce(p_resolution_note, ''))) not between 5 and 1500 then
    raise exception 'Enter a resolution note with 5 to 1500 characters';
  end if;

  if p_restrict_reported_days is null
    or p_restrict_reported_days < 0
    or p_restrict_reported_days > 365 then
    raise exception 'Restriction days must be from 0 to 365';
  end if;

  if p_outcome <> 'ACTIONED' and p_restrict_reported_days > 0 then
    raise exception 'Only an actioned report can restrict the reported account';
  end if;

  select *
  into report_record
  from public.account_reports
  where id = p_report_id
  for update;

  if report_record.id is null or report_record.status <> 'OPEN' then
    raise exception 'This safety report is no longer open';
  end if;

  select *
  into request_record
  from public.requests
  where id = report_record.request_id;

  update public.account_reports
  set
    status = p_outcome,
    resolution_note = trim(p_resolution_note),
    reviewed_by = admin_id,
    reviewed_at = now()
  where id = p_report_id
  returning * into updated_report;

  if p_restrict_reported_days > 0 then
    restricted_until_value := now()
      + make_interval(days => p_restrict_reported_days);

    insert into public.account_restrictions (
      account_id,
      reason,
      source_dispute_id,
      source_report_id,
      restricted_until,
      created_by
    )
    values (
      report_record.reported_user_id,
      format('Safety report action: %s', trim(p_resolution_note)),
      null,
      report_record.id,
      restricted_until_value,
      admin_id
    )
    on conflict (account_id) do update set
      reason = excluded.reason,
      source_dispute_id = public.account_restrictions.source_dispute_id,
      source_report_id = excluded.source_report_id,
      restricted_until = greatest(
        public.account_restrictions.restricted_until,
        excluded.restricted_until
      ),
      created_by = excluded.created_by,
      updated_at = now();

    insert into public.notifications (
      user_id,
      request_id,
      type,
      target_role,
      title,
      message
    )
    values (
      report_record.reported_user_id,
      report_record.request_id,
      'ACCOUNT_RESTRICTED',
      case
        when request_record.requestor_id = report_record.reported_user_id
          then 'requestor'
        else 'runner'
      end,
      'Account temporarily restricted',
      format(
        'Your account is restricted from new marketplace activity until %s.',
        restricted_until_value
      )
    );
  end if;

  insert into public.notifications (
    user_id,
    request_id,
    type,
    target_role,
    title,
    message
  )
  values (
    report_record.reporter_id,
    report_record.request_id,
    'SAFETY_REPORT_RESOLVED',
    case
      when request_record.requestor_id = report_record.reporter_id
        then 'requestor'
      else 'runner'
    end,
    'Safety report reviewed',
    format('An Admin reviewed your safety report for: %s', request_record.title)
  );

  return updated_report;
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
    'ACCOUNT_REPORT_RESOLVED'
  )
);

alter table public.admin_audit_events
drop constraint if exists admin_audit_events_entity_type_check;
alter table public.admin_audit_events
add constraint admin_audit_events_entity_type_check check (
  entity_type in (
    'request_dispute',
    'account_restriction',
    'account_report'
  )
);

create or replace function private.audit_admin_account_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'OPEN'
    and new.status in ('ACTIONED', 'DISMISSED')
    and new.reviewed_by is not null then
    insert into public.admin_audit_events (
      admin_id,
      action,
      entity_type,
      entity_id,
      details
    )
    values (
      new.reviewed_by,
      'ACCOUNT_REPORT_RESOLVED',
      'account_report',
      new.id,
      jsonb_build_object(
        'request_id', new.request_id,
        'outcome', new.status,
        'reported_user_id', new.reported_user_id
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists account_reports_audit_admin_resolution
on public.account_reports;
create trigger account_reports_audit_admin_resolution
after update on public.account_reports
for each row execute function private.audit_admin_account_report();

revoke all on function private.users_have_block(uuid, uuid)
from public, anon, authenticated;
grant execute on function private.users_have_block(uuid, uuid)
to authenticated;
revoke all on function private.enforce_request_match_block()
from public, anon, authenticated;
revoke all on function private.enforce_request_creation_limits()
from public, anon, authenticated;
revoke all on function private.audit_admin_account_report()
from public, anon, authenticated;
revoke all on function private.audit_admin_account_restriction()
from public, anon, authenticated;

revoke all on function public.get_request_trust_context(uuid, uuid)
from public, anon;
revoke all on function public.submit_request_rating(uuid, smallint, text)
from public, anon;
revoke all on function public.set_account_block(uuid, uuid, boolean)
from public, anon;
revoke all on function public.submit_account_report(uuid, uuid, text, text)
from public, anon;
revoke all on function public.admin_list_account_reports(text, integer, integer)
from public, anon;
revoke all on function public.admin_resolve_account_report(uuid, text, text, integer)
from public, anon;

grant execute on function public.get_request_trust_context(uuid, uuid)
to authenticated;
grant execute on function public.submit_request_rating(uuid, smallint, text)
to authenticated;
grant execute on function public.set_account_block(uuid, uuid, boolean)
to authenticated;
grant execute on function public.submit_account_report(uuid, uuid, text, text)
to authenticated;
grant execute on function public.admin_list_account_reports(text, integer, integer)
to authenticated;
grant execute on function public.admin_resolve_account_report(uuid, text, text, integer)
to authenticated;

comment on table public.request_ratings is
'One immutable participant rating per completed request and reviewer.';

comment on table public.account_blocks is
'User-controlled blocks that prevent future marketplace matching without hiding existing responsibilities.';

comment on table public.account_reports is
'Private participant safety reports visible only to the reporter and Admin reviewers.';

comment on function public.get_request_trust_context(uuid, uuid) is
'Returns a limited trust summary and caller-specific actions only for two participants in the same request.';

commit;
