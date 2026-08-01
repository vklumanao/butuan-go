-- Protected aggregate analytics for the ButuanGo Admin dashboard.
-- Run after supabase/migrations/020_account_deletion_requests.sql.

begin;

create or replace function public.admin_get_monthly_analytics(
  p_month date default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  analytics_timezone constant text := 'Asia/Manila';
  selected_month date := date_trunc(
    'month',
    coalesce(p_month, (now() at time zone analytics_timezone)::date)
  )::date;
  local_today date := (now() at time zone analytics_timezone)::date;
  daily_series_end date := least(
    (selected_month + interval '1 month - 1 day')::date,
    local_today
  );
  range_start timestamptz := selected_month::timestamp
    at time zone analytics_timezone;
  range_end timestamptz := (selected_month + interval '1 month')::timestamp
    at time zone analytics_timezone;
  summary_data jsonb;
  daily_data jsonb;
  status_data jsonb;
begin
  if (select auth.uid()) is null
    or (select private.current_profile_role()) is distinct from 'admin' then
    raise exception 'Only an Admin can view monthly analytics';
  end if;

  select jsonb_build_object(
    'new_users', (
      select count(*)
      from public.profiles as profile
      where profile.role <> 'admin'
        and profile.created_at >= range_start
        and profile.created_at < range_end
    ),
    'onboarded_users', (
      select count(*)
      from public.profiles as profile
      where profile.role <> 'admin'
        and profile.created_at >= range_start
        and profile.created_at < range_end
        and profile.onboarding_completed_at is not null
    ),
    'pending_onboarding', (
      select count(*)
      from public.profiles as profile
      where profile.role <> 'admin'
        and profile.created_at >= range_start
        and profile.created_at < range_end
        and profile.onboarding_completed_at is null
    ),
    'requests_created', (
      select count(*)
      from public.requests as request
      where request.created_at >= range_start
        and request.created_at < range_end
    ),
    'requests_completed', (
      select count(*)
      from public.requests as request
      where request.completed_at >= range_start
        and request.completed_at < range_end
    ),
    'requests_cancelled', (
      select count(*)
      from public.requests as request
      where request.cancelled_at >= range_start
        and request.cancelled_at < range_end
    ),
    'requests_failed', (
      select count(*)
      from public.requests as request
      where request.failed_at >= range_start
        and request.failed_at < range_end
    ),
    'disputes_opened', (
      select count(*)
      from public.request_disputes as dispute
      where dispute.created_at >= range_start
        and dispute.created_at < range_end
    ),
    'reports_submitted', (
      select count(*)
      from public.account_reports as report
      where report.created_at >= range_start
        and report.created_at < range_end
    ),
    'restrictions_applied', (
      select count(*)
      from public.admin_audit_events as event
      where event.action = 'ACCOUNT_RESTRICTED'
        and event.created_at >= range_start
        and event.created_at < range_end
    )
  )
  into summary_data;

  with calendar as (
    select generated_day::date as activity_date
    from generate_series(
      selected_month::timestamp,
      daily_series_end::timestamp,
      interval '1 day'
    ) as days(generated_day)
  ),
  account_activity as (
    select
      (profile.created_at at time zone analytics_timezone)::date as activity_date,
      count(*) as new_users
    from public.profiles as profile
    where profile.role <> 'admin'
      and profile.created_at >= range_start
      and profile.created_at < range_end
    group by 1
  ),
  request_activity as (
    select
      (request.created_at at time zone analytics_timezone)::date as activity_date,
      count(*) as requests_created
    from public.requests as request
    where request.created_at >= range_start
      and request.created_at < range_end
    group by 1
  ),
  completion_activity as (
    select
      (request.completed_at at time zone analytics_timezone)::date as activity_date,
      count(*) as requests_completed
    from public.requests as request
    where request.completed_at >= range_start
      and request.completed_at < range_end
    group by 1
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'date', calendar.activity_date,
        'new_users', coalesce(account_activity.new_users, 0),
        'requests_created', coalesce(request_activity.requests_created, 0),
        'requests_completed', coalesce(completion_activity.requests_completed, 0)
      )
      order by calendar.activity_date
    ),
    '[]'::jsonb
  )
  into daily_data
  from calendar
  left join account_activity using (activity_date)
  left join request_activity using (activity_date)
  left join completion_activity using (activity_date);

  with status_order(status, sort_order) as (
    values
      ('OPEN'::text, 1),
      ('ACCEPTED'::text, 2),
      ('IN_PROGRESS'::text, 3),
      ('AWAITING_CONFIRMATION'::text, 4),
      ('COMPLETED'::text, 5),
      ('CANCELLED'::text, 6),
      ('FAILED'::text, 7)
  ),
  status_counts as (
    select request.status, count(*) as request_count
    from public.requests as request
    where request.created_at >= range_start
      and request.created_at < range_end
    group by request.status
  )
  select jsonb_agg(
    jsonb_build_object(
      'status', status_order.status,
      'count', coalesce(status_counts.request_count, 0)
    )
    order by status_order.sort_order
  )
  into status_data
  from status_order
  left join status_counts using (status);

  return jsonb_build_object(
    'period', jsonb_build_object(
      'month_start', selected_month,
      'month_end', (selected_month + interval '1 month')::date,
      'timezone', analytics_timezone
    ),
    'summary', summary_data,
    'daily_activity', daily_data,
    'request_statuses', coalesce(status_data, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.admin_get_monthly_analytics(date)
from public, anon;
grant execute on function public.admin_get_monthly_analytics(date)
to authenticated;

comment on function public.admin_get_monthly_analytics(date) is
'Returns Asia/Manila monthly aggregate marketplace analytics only to an authenticated Admin.';

commit;
