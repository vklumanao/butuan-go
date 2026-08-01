# Admin Analytics Comparisons and Funnel

## Objective

Let an Admin inspect any available month, understand changes against the prior
period, and see where requests stop progressing through the fulfillment funnel.

## Users and scenario

- Primary role: Admin
- Starting state: Admin opens monthly analytics on the operations dashboard
- Expected end state: Admin selects a month and can interpret KPI movement and
  request-stage conversion without viewing private request details

## Scope

### Included

- Current or historical month selector with previous/next navigation
- Equivalent elapsed-period comparisons for the current month
- Full previous-month comparisons for historical months
- Request funnel from Created through Completed using lifecycle history
- Responsive visual and text representations of comparisons and funnel data

### Excluded

- Custom date ranges, future months, revenue, third-party tracking, exact
  locations, private request content, and automatic production deployment

## Existing code to reuse

- Relevant route: `/admin/dashboard`
- Page/component: `AdminMonthlyAnalytics`
- Service/RPC: `getAdminMonthlyAnalytics`, `admin_get_monthly_analytics(date)`
- Data: `requests`, `request_updates`, and existing aggregate source tables

## Data and security impact

- Database migration required: Yes, migration 022
- New or changed RPCs: Extends `admin_get_monthly_analytics(date)` response
- RLS or grants affected: Existing Admin-only security-definer boundary retained
- Personal/private data involved: Aggregate counts only
- Payment, dispute, safety, or audit impact: Comparison counts only; no details
- Destructive or irreversible behavior: None

## Agent split

- Additional agents needed: No
- Why: This is one sequential database/frontend vertical slice

## Acceptance criteria

- [x] Admin can select the current or an earlier month, but not a future month.
- [x] Current-month KPIs compare with the same elapsed prior-month period.
- [x] Historical KPIs compare with the complete previous month.
- [x] Funnel counts stages reached by the selected cohort before period end.
- [x] Zero baselines and empty cohorts have clear, non-misleading states.
- [x] Mobile, keyboard, loading, refresh, and error states remain usable.
- [ ] Backend still rejects non-Admin callers and returns aggregates only.
- [x] Migration and verification SQL are included.
- [x] `git diff --check` and `npm run check` pass.

## Release requirements

- Required migrations and order: Apply 021, then 022
- Manual Supabase verification: Run `verify_admin_analytics_comparisons.sql`
- Environment/configuration changes: None
- Deployment authorized by user: No
- Rollback or recovery note: Reapply the migration 021 RPC definition before
  reverting the frontend

## Handoff

- Files changed: Analytics component, migration 022, verification SQL, README,
  and this feature brief
- Verification completed: ESLint, production build, development build, lazy
  analytics bundle, SQL/security structural review, and `git diff --check`
- Verification not possible locally: Live Supabase execution, signed-in Admin
  and non-Admin RPC checks, and automated browser visual testing
- Required user action: Apply and verify migrations before any deployment
- Optional follow-up outside scope: Custom ranges and median response times
