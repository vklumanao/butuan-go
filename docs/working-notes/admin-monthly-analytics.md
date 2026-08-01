# Admin Monthly Analytics

## Objective

Give an Admin a clear current-month view of registrations, onboarding, request
activity, outcomes, and safety events through protected aggregate charts.

## Users and scenario

- Primary role: Admin
- Starting state: Admin opens the operations dashboard
- Expected end state: Admin understands monthly marketplace trends without
  receiving private transaction details

## Scope

### Included

- Asia/Manila monthly aggregate RPC and verification SQL
- Monthly summary, daily activity, request-status, onboarding, and safety data
- Lazy-loaded Recharts analytics interface
- Loading, empty, error, tooltip, legend, and text-summary states

### Excluded

- Third-party visitor tracking, exact locations, private request text, receipts,
  revenue claims, month navigation, and automatic refresh

## Existing code to reuse

- Relevant routes: `/admin/dashboard`
- Pages/components: `AdminDashboardPage`, Admin states, Card, Button
- Services/RPCs: `adminService`, `private.current_profile_role`
- Constants/validation: Request status labels

## Data and security impact

- Database migration required: Yes, migration 021
- New or changed RPCs: `admin_get_monthly_analytics(date)`
- RLS or grants affected: Admin-checked security-definer RPC; authenticated
  execute grant only
- Personal/private data involved: Aggregate counts only
- Payment, dispute, safety, or audit impact: Aggregate dispute, report, and
  restriction-event counts; no record details
- Destructive or irreversible behavior: None

## Agent split

- Additional agents needed: No
- Why the work is independently divisible: Sequential database/frontend slice
- Agent file boundaries and expected findings: Not applicable

## Acceptance criteria

- [ ] Admin receives the expected aggregate contract.
- [ ] Non-Admin callers are rejected by the backend.
- [x] Every elapsed current-month day is represented, including zero days.
- [x] Charts remain usable on mobile and desktop.
- [x] Analytics failure does not hide the existing operations dashboard.
- [x] No private or identifying record details are returned.
- [x] Migration and verification SQL are included.
- [x] `git diff --check` passes.
- [x] `npm run check` and the development build pass.

## Release requirements

- Required migrations and order: Apply migration 021 after migration 020
- Manual Supabase verification: Run `verify_admin_monthly_analytics.sql` as
  documented
- Environment/configuration changes: None
- Deployment authorized by user: No
- Rollback or recovery note: Drop the new RPC before reverting the frontend

## Handoff

- Files changed: Admin dashboard and service, lazy analytics component, package
  manifests, migration 021, verification SQL, README, and this brief
- Verification completed: ESLint, production build, development build, lazy
  analytics bundle, SQL/schema structural review, and `git diff --check`
- Verification not possible locally: Live Supabase migration execution, signed-in
  Admin/non-Admin RPC checks, and an automated browser visual check
- Required user action: Apply and verify migration 021 before deployment
- Optional follow-up outside scope: Historical month selection and comparisons
