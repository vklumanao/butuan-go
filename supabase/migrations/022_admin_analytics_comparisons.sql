-- Adds period comparison and lifecycle funnel aggregates to Admin analytics.
-- Run after supabase/migrations/021_admin_monthly_analytics.sql.

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
  local_now timestamptz := now();
  local_today date := (local_now at time zone analytics_timezone)::date;
  current_month date := date_trunc('month', local_today)::date;
  selected_month date := date_trunc(
    'month',
    coalesce(p_month, local_today)
  )::date;
  range_start timestamptz := selected_month::timestamp
    at time zone analytics_timezone;
  range_end timestamptz := (selected_month + interval '1 month')::timestamp
    at time zone analytics_timezone;
  analysis_end timestamptz;
  daily_series_end date;
  comparison_month date := (selected_month - interval '1 month')::date;
  comparison_start timestamptz := comparison_month::timestamp
    at time zone analytics_timezone;
  comparison_end timestamptz;
  comparison_is_partial boolean := selected_month = current_month;
  summary_data jsonb;
  comparison_summary_data jsonb;
  daily_data jsonb;
  status_data jsonb;
  funnel_data jsonb;
begin
  if (select auth.uid()) is null
    or (select private.current_profile_role()) is distinct from 'admin' then
    raise exception 'Only an Admin can view monthly analytics';
  end if;

  if selected_month > current_month then
    raise exception 'Analytics are not available for a future month';
  end if;

  analysis_end := least(range_end, local_now);
  daily_series_end := least(
    (selected_month + interval '1 month - 1 day')::date,
    local_today
  );
  comparison_end := case
    when comparison_is_partial then least(
      range_start,
      comparison_start + (analysis_end - range_start)
    )
    else range_start
  end;

  select jsonb_build_object(
    'new_users', (
      select count(*)
      from public.profiles as profile
      where profile.role <> 'admin'
        and profile.created_at >= range_start
        and profile.created_at < analysis_end
    ),
    'onboarded_users', (
      select count(*)
      from public.profiles as profile
      where profile.role <> 'admin'
        and profile.created_at >= range_start
        and profile.created_at < analysis_end
        and profile.onboarding_completed_at is not null
        and profile.onboarding_completed_at < analysis_end
    ),
    'pending_onboarding', (
      select count(*)
      from public.profiles as profile
      where profile.role <> 'admin'
        and profile.created_at >= range_start
        and profile.created_at < analysis_end
        and (
          profile.onboarding_completed_at is null
          or profile.onboarding_completed_at >= analysis_end
        )
    ),
    'requests_created', (
      select count(*)
      from public.requests as request
      where request.created_at >= range_start
        and request.created_at < analysis_end
    ),
    'requests_completed', (
      select count(*)
      from public.requests as request
      where request.completed_at >= range_start
        and request.completed_at < analysis_end
    ),
    'requests_cancelled', (
      select count(*)
      from public.requests as request
      where request.cancelled_at >= range_start
        and request.cancelled_at < analysis_end
    ),
    'requests_failed', (
      select count(*)
      from public.requests as request
      where request.failed_at >= range_start
        and request.failed_at < analysis_end
    ),
    'disputes_opened', (
      select count(*)
      from public.request_disputes as dispute
      where dispute.created_at >= range_start
        and dispute.created_at < analysis_end
    ),
    'reports_submitted', (
      select count(*)
      from public.account_reports as report
      where report.created_at >= range_start
        and report.created_at < analysis_end
    ),
    'restrictions_applied', (
      select count(*)
      from public.admin_audit_events as event
      where event.action = 'ACCOUNT_RESTRICTED'
        and event.created_at >= range_start
        and event.created_at < analysis_end
    )
  )
  into summary_data;

  select jsonb_build_object(
    'new_users', (
      select count(*)
      from public.profiles as profile
      where profile.role <> 'admin'
        and profile.created_at >= comparison_start
        and profile.created_at < comparison_end
    ),
    'onboarded_users', (
      select count(*)
      from public.profiles as profile
      where profile.role <> 'admin'
        and profile.created_at >= comparison_start
        and profile.created_at < comparison_end
        and profile.onboarding_completed_at is not null
        and profile.onboarding_completed_at < comparison_end
    ),
    'pending_onboarding', (
      select count(*)
      from public.profiles as profile
      where profile.role <> 'admin'
        and profile.created_at >= comparison_start
        and profile.created_at < comparison_end
        and (
          profile.onboarding_completed_at is null
          or profile.onboarding_completed_at >= comparison_end
        )
    ),
    'requests_created', (
      select count(*)
      from public.requests as request
      where request.created_at >= comparison_start
        and request.created_at < comparison_end
    ),
    'requests_completed', (
      select count(*)
      from public.requests as request
      where request.completed_at >= comparison_start
        and request.completed_at < comparison_end
    ),
    'requests_cancelled', (
      select count(*)
      from public.requests as request
      where request.cancelled_at >= comparison_start
        and request.cancelled_at < comparison_end
    ),
    'requests_failed', (
      select count(*)
      from public.requests as request
      where request.failed_at >= comparison_start
        and request.failed_at < comparison_end
    ),
    'disputes_opened', (
      select count(*)
      from public.request_disputes as dispute
      where dispute.created_at >= comparison_start
        and dispute.created_at < comparison_end
    ),
    'reports_submitted', (
      select count(*)
      from public.account_reports as report
      where report.created_at >= comparison_start
        and report.created_at < comparison_end
    ),
    'restrictions_applied', (
      select count(*)
      from public.admin_audit_events as event
      where event.action = 'ACCOUNT_RESTRICTED'
        and event.created_at >= comparison_start
        and event.created_at < comparison_end
    )
  )
  into comparison_summary_data;

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
      and profile.created_at < analysis_end
    group by 1
  ),
  request_activity as (
    select
      (request.created_at at time zone analytics_timezone)::date as activity_date,
      count(*) as requests_created
    from public.requests as request
    where request.created_at >= range_start
      and request.created_at < analysis_end
    group by 1
  ),
  completion_activity as (
    select
      (request.completed_at at time zone analytics_timezone)::date as activity_date,
      count(*) as requests_completed
    from public.requests as request
    where request.completed_at >= range_start
      and request.completed_at < analysis_end
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
      and request.created_at < analysis_end
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

  with cohort as (
    select request.id
    from public.requests as request
    where request.created_at >= range_start
      and request.created_at < analysis_end
  ),
  stage_counts as (
    select
      count(*) as created_count,
      count(*) filter (
        where exists (
          select 1
          from public.request_updates as update_event
          where update_event.request_id = cohort.id
            and update_event.to_status = 'ACCEPTED'
            and update_event.created_at < analysis_end
        )
      ) as accepted_count,
      count(*) filter (
        where exists (
          select 1
          from public.request_updates as update_event
          where update_event.request_id = cohort.id
            and update_event.to_status = 'IN_PROGRESS'
            and update_event.created_at < analysis_end
        )
      ) as started_count,
      count(*) filter (
        where exists (
          select 1
          from public.request_updates as update_event
          where update_event.request_id = cohort.id
            and update_event.to_status = 'AWAITING_CONFIRMATION'
            and update_event.created_at < analysis_end
        )
      ) as submitted_count,
      count(*) filter (
        where exists (
          select 1
          from public.request_updates as update_event
          where update_event.request_id = cohort.id
            and update_event.to_status = 'COMPLETED'
            and update_event.created_at < analysis_end
        )
      ) as completed_count
    from cohort
  )
  select jsonb_build_array(
    jsonb_build_object('stage', 'CREATED', 'count', created_count),
    jsonb_build_object('stage', 'ACCEPTED', 'count', accepted_count),
    jsonb_build_object('stage', 'STARTED', 'count', started_count),
    jsonb_build_object('stage', 'SUBMITTED', 'count', submitted_count),
    jsonb_build_object('stage', 'COMPLETED', 'count', completed_count)
  )
  into funnel_data
  from stage_counts;

  return jsonb_build_object(
    'period', jsonb_build_object(
      'month_start', selected_month,
      'month_end', (selected_month + interval '1 month')::date,
      'period_end', analysis_end,
      'timezone', analytics_timezone
    ),
    'summary', summary_data,
    'comparison', jsonb_build_object(
      'period', jsonb_build_object(
        'month_start', comparison_month,
        'month_end', selected_month,
        'period_end', comparison_end,
        'is_partial', comparison_is_partial
      ),
      'summary', comparison_summary_data
    ),
    'daily_activity', daily_data,
    'request_statuses', coalesce(status_data, '[]'::jsonb),
    'request_funnel', coalesce(funnel_data, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.admin_get_monthly_analytics(date)
from public, anon;
grant execute on function public.admin_get_monthly_analytics(date)
to authenticated;

comment on function public.admin_get_monthly_analytics(date) is
'Returns Admin-only monthly aggregates, prior-period comparison, and lifecycle funnel data in Asia/Manila time.';

commit;
