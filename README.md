# ButuanGo

ButuanGo is a local task-request marketplace foundation for Requestors who need help with everyday errands and Runners who want to complete local tasks. The working first milestone delivers real Supabase authentication, database-backed profiles, role-aware routing, separate dashboards, and secure profile updates. Milestone 2 now includes the secure request domain, Requestor creation/editing/cancellation, and Runner browsing/atomic acceptance.

## Milestone scope

Included: responsive landing and account UI, Requestor/Runner starting-mode registration, secure Requestor/Runner workspace switching, login, persistent sessions, logout confirmation, automatic profile creation, protected and active-role routes, profile editing, request creation and acceptance, secure in-app realtime notifications, loading/error states, SQL schema, triggers, and Row-Level Security.

Excluded from the current UI: email/SMS/browser-push notifications, platform-processed payments/GCash/escrow, chat, maps/GPS, ratings, reviews, AI, identity verification, government transactions, and administration UI.

## Technology

- React and React Router with JavaScript/JSX only
- Vite and Tailwind CSS
- shadcn/ui-style components backed by Radix UI
- Lucide React icons and Sonner notifications
- React Hook Form, Zod, and the Zod resolver
- Supabase Authentication and PostgreSQL

## Prerequisites

- Node.js 20.19+ or 22.12+ (the current Vite requirement)
- npm
- A Supabase account and project

## Install and configure

```bash
npm install
```

Copy `.env.example` to `.env` and enter the values from **Supabase → Project Settings → API**:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Never commit `.env` or expose a Supabase service-role key in Vite. Restart the development server after changing environment variables.

## Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor**, paste the complete contents of `supabase/setup.sql`, and run it once.
3. For the request-domain foundation, run `supabase/migrations/002_request_workflow.sql` after `setup.sql`. For an existing project where `setup.sql` already ran, run only this migration.
4. Run `supabase/verify_request_workflow.sql` to verify the request tables, RLS policies, RPC functions, and seeded categories.
5. Run `supabase/migrations/003_notifications.sql`, then run `supabase/verify_notifications.sql`. The migration adds the private notification store, request-event trigger, read-control RPCs, RLS, and Realtime publication entry.
6. Run `supabase/migrations/004_request_locations.sql`, then run `supabase/verify_request_locations.sql`. This adds private pickup/delivery records, secure location RPCs, disclosure RLS, and the location requirement for starting tasks.
7. Run `supabase/migrations/005_request_participants.sql`, then run `supabase/verify_request_participants.sql`. This adds the restricted participant-summary RPC and includes the assigned Runner's name in future acceptance notifications.
8. Run `supabase/migrations/006_runner_capacity.sql`, then run `supabase/verify_runner_capacity.sql`. This enforces one execution-active task per Runner and replaces the acceptance RPC with a concurrency-safe version.
9. Run `supabase/migrations/007_saved_addresses.sql`, then run `supabase/verify_saved_addresses.sql`. This adds the initial private address book, default-address enforcement, and ownership-checking mutation RPCs.
10. Run `supabase/migrations/008_task_recovery.sql`, then run `supabase/verify_task_recovery.sql`. This adds pre-start Runner release, cancellation of assigned-but-not-started requests, recovery history, notifications, and immediate capacity release.
11. Run `supabase/migrations/009_dual_role_mode.sql`, then run `supabase/verify_dual_role_mode.sql`. This adds the secure active workspace, role-switch RPC, profile protections, and initialization for existing accounts.
12. Run `supabase/migrations/010_account_saved_addresses.sql`, then run `supabase/verify_account_saved_addresses.sql`. This makes the private address book available from either workspace without weakening owner-only access.
13. Under **Authentication → URL Configuration**, set the Site URL to `http://localhost:5173` for local development. Add `http://localhost:5173/auth/callback` and `http://localhost:5173/reset-password` to the allowed redirect URLs. Add their production equivalents after deployment.
14. Under **Authentication → Providers → Email**, keep Email enabled. Choose whether **Confirm email** is required.

If email confirmation is enabled, registration shows inbox instructions and the confirmation link returns through `/auth/callback`. If disabled, Supabase returns a session and the user is immediately routed to the selected dashboard. Password-recovery emails return through `/reset-password`.

### Local demo mode

Set `VITE_DEMO_MODE=true` to exercise registration, login, role routing, profile updates, password recovery, session refresh, and logout without contacting Supabase. Demo accounts are stored in browser local storage, including their test passwords, so use fictional information only. Set the value to `false` and configure the Supabase variables when moving to backend testing.

### How profile creation works

Registration sends `full_name`, `phone_number`, and the selected starting `role` as authenticated user metadata. The `on_auth_user_created` PostgreSQL trigger runs as a security-definer after an Auth user is inserted and creates the matching `public.profiles` row. It stores the selection as both the immutable registration role and initial `active_role`. Public registration accepts only `requestor` and `runner`; missing or invalid metadata safely defaults to `requestor`. Admin can exist in the table but is never offered by public registration or workspace switching and must be assigned through a trusted server/database administration process.

The frontend does not perform a second profile insert. This avoids partial or duplicate profile creation. If the profile trigger is not installed or fails, login reports a missing-profile error instead of hanging.

### Row-Level Security

RLS is enabled on `profiles`. Authenticated users can select and update only the row whose ID matches `auth.uid()`; anonymous users receive no table privileges. Direct update grants are limited to `full_name`, `phone_number`, and `avatar_url`. A database trigger rejects changes to `id`, `email`, the registration `role`, or direct manipulation of `active_role`. Only the ownership-checking `switch_active_role` RPC may change the active workspace, and it accepts only `requestor` or `runner`.

### Request-domain database foundation

`supabase/migrations/002_request_workflow.sql` adds `categories`, `requests`, and `request_updates`. Marketplace request details use a general `area`; government identifiers, payment credentials, chat, and GPS data are intentionally excluded.

Authenticated users receive read access only where RLS permits it. Requestors can read their own requests, assigned Runners can read their tasks, and Runners can browse `OPEN` requests. Direct request inserts, updates, and deletes are not granted to browser roles. Instead, authenticated clients use restricted RPC functions for creation, open-request editing, pre-start cancellation or release, atomic acceptance, starting work, submitting completion, and confirming completion. Database constraints and triggers reject skipped status transitions and record lifecycle history.

The supported lifecycle is:

```text
OPEN → ACCEPTED → IN_PROGRESS → AWAITING_CONFIRMATION → COMPLETED
  └→ CANCELLED
```

### In-app notifications

`supabase/migrations/003_notifications.sql` creates private notifications when a request is accepted, started, submitted for completion confirmation, or confirmed complete. A user can select only their own rows through RLS. Direct browser inserts and updates are denied; trusted database triggers create notifications, while ownership-checking RPC functions mark them read.

The authenticated header displays a notification bell, unread count, realtime inserts, mark-one/mark-all controls, and links to the related Requestor request or Runner task. This milestone intentionally does not send email, SMS, or browser push notifications.

To verify the realtime flow, keep a Requestor account open in one browser profile and use a Runner account in another browser profile. The appropriate participant should receive a toast and unread bell item without refreshing after each lifecycle transition.

### Private pickup and delivery details

`supabase/migrations/004_request_locations.sql` stores exact addresses, landmarks, instructions, and task contact details separately from public marketplace requests. Requestors can read their own location record. An assigned Runner can read it only after acceptance; unassigned Runners and anonymous users cannot access it. Direct browser writes are denied, and ownership-checking RPCs perform creation and updates.

New requests atomically save public task details and private location details. The fulfillment type determines whether pickup, delivery, or both addresses are required. Requestors may update private details while a request is `OPEN` or `ACCEPTED`; details lock when the Runner starts. The database prevents an accepted task from moving to `IN_PROGRESS` without a valid location record.

To verify privacy, create a request with recognizable test addresses. Confirm an unassigned Runner sees only the general area and privacy lock. Accept it with one Runner and confirm only that account sees the exact details. A second Runner must not be able to select the `request_locations` row. Use fictional addresses and contacts during testing.

### Request participant identity

`supabase/migrations/005_request_participants.sql` adds `get_request_participants(request_id)`. The security-definer RPC first verifies that the caller is the request owner or assigned Runner, then returns only limited participant fields: user ID, participant type, full name, phone number, avatar URL, role, and membership date. It does not expose email addresses, authentication metadata, unrelated profiles, or admin information.

After acceptance, the Requestor sees an **Assigned Runner** card with the Runner's user-provided profile details and acceptance time. The assigned Runner sees a corresponding **Requestor** card. Future acceptance notifications include the Runner's name. The UI explicitly avoids claiming that either participant is identity-verified.

Verify authorization with three accounts: one Requestor, the assigned Runner, and an unrelated Runner. The first two should retrieve participant summaries for their shared request. The unrelated Runner must receive an authorization error when calling the RPC with that request ID.

### Runner capacity

`supabase/migrations/006_runner_capacity.sql` limits each Runner to one execution-active task. `ACCEPTED` and `IN_PROGRESS` consume capacity. `AWAITING_CONFIRMATION` does not consume capacity because the Runner has submitted their work and only the Requestor can perform the next transition.

The database trigger and `accept_request` RPC use a transaction advisory lock, so simultaneous acceptance attempts from multiple tabs cannot assign two new active tasks to the same Runner. The frontend mirrors this state with a dashboard notice, disabled acceptance control, active-task link, and friendly error. The database remains the source of truth if the UI is bypassed.

To verify concurrency, sign in as one Runner in two browser tabs, open two different available requests, and attempt to accept both at nearly the same time. Exactly one should be accepted. Submit that task for confirmation, then verify the Runner can accept another request.

### Saved address book

`supabase/migrations/007_saved_addresses.sql` creates the private reusable address book, and `supabase/migrations/010_account_saved_addresses.sql` makes it an account-level feature available from both Requestor and Runner profiles. A user can add any number of labeled addresses, edit or delete them, and choose one default. The first saved address becomes the default automatically, and deleting the default promotes another saved address when available. RLS and security-definer RPC ownership checks prevent users from reading or changing another account's addresses.

The Create Request form offers the saved addresses for pickup and delivery/destination independently. The default address is applied automatically to the relevant field on a new request, while manual entry remains available. Choosing an address copies its current values into `request_locations` as a private snapshot. Later edits or deletion of the saved template do not alter existing requests, preserving the location agreed upon when the request was created.

To verify the feature, add an address under `/runner/profile`, switch to Requestor, and confirm the same private address book appears under `/requestor/profile`. Add a second address, mark one as default, and open `/requestor/requests/new`. Confirm the default is prefilled, choose a different address for pickup or delivery, and submit the request. Edit the saved address afterward and verify the submitted request retains its original location snapshot.

### Pre-start task recovery

`supabase/migrations/008_task_recovery.sql` prevents an accepted request from becoming permanently stuck before work begins. The assigned Runner may release only an `ACCEPTED` task and must provide a reason. The database atomically clears the assignment and acceptance time, returns the request to `OPEN`, records the reason in request history, revokes the former Runner's participant/location access, frees Runner capacity, and notifies the Requestor.

The owning Requestor may cancel an `OPEN` or `ACCEPTED` request before work starts. Cancelling an accepted request removes the Runner assignment and notifies that Runner. Neither role can use this recovery flow after the request reaches `IN_PROGRESS`, because an errand or purchase may already be underway.

To verify recovery, accept a request as a Runner but do not start it. Release it with a reason and confirm it returns to the available marketplace, disappears from My Tasks, frees Runner capacity, and creates a Requestor notification plus history entry. Accept it again, then cancel it as the Requestor before start and confirm the Runner is notified and cannot access its private details.

### Dual Requestor and Runner workspaces

`supabase/migrations/009_dual_role_mode.sql` allows one normal account to use both public marketplace workspaces. Registration chooses only the starting mode. The original `profiles.role` is retained for account history, while `profiles.active_role` controls route guards, navigation, and role-gated database RPCs. Switching does not log the user out and does not change request ownership, Runner assignments, history, notifications, or capacity.

Request queries are explicitly scoped by context: Requestor pages require `requestor_id = auth user`, Runner task pages require `runner_id = auth user`, and the available marketplace excludes requests posted by that same account. The acceptance RPC independently prevents self-acceptance. Notifications identify their intended workspace and securely switch before opening the related page when necessary.

To verify dual mode, register with either starting mode and use the sidebar or mobile account menu to switch. Create a request in Requestor mode, switch to Runner mode, and confirm your own request is absent from Available Requests. Accept a different account's request, switch back to Requestor, and confirm the assigned task does not appear under My Requests. Switch to Runner again and confirm the assignment and capacity state remain intact.

### In-person settlement policy

ButuanGo does not collect, hold, transfer, refund, or process funds in this milestone. The Requestor pays the Runner directly during meetup or delivery, after reviewing the completed errand and applicable receipts. The stored expense budget and service fee are estimates and user agreements, not platform charges or proof of payment.

The Requestor should confirm completion only after receiving the item or service and settling the agreed amount in person. Users should agree on any cost change before purchase, keep applicable receipts, meet safely, and never share a PIN, OTP, password, banking credential, or payment account access. The application intentionally has no wallet, paid status, payout balance, escrow record, or online transaction history.

### Post-acceptance lifecycle verification

1. As a Runner, accept an open request and open it under **My Tasks**.
2. Select **Start Task**, confirm the dialog, and verify the status and history change to `IN_PROGRESS`.
3. Confirm the Requestor receives a **Task started** notification.
4. As the Runner, select **Submit for Confirmation** and verify the status becomes `AWAITING_CONFIRMATION`.
5. Confirm the Requestor receives a completion-confirmation notification and sees **Confirm Completion** on the request details page.
6. As the Requestor, confirm completion and verify the final status is `COMPLETED`.
7. Confirm the Runner receives a completion notification and neither role sees another lifecycle action.
8. Reopen each dashboard and confirm the live summary counts reflect the final state.

### Requestor workflow verification

1. Sign in with a Requestor account and open `/requestor/requests`.
2. Select **Create a Request** and verify that categories load from Supabase.
3. Submit valid task details with a general area, non-negative amounts, and an optional future deadline.
4. Confirm redirect to `/requestor/requests/:requestId` and verify the initial `OPEN` status plus `CREATED` history entry.
5. Return to **My Requests** and confirm the real request appears.
6. Open the Requestor dashboard and confirm the Open Requests count uses live data.
7. Confirm a Runner account cannot open any `/requestor/requests` route.

### Edit, cancel, and Runner acceptance verification

1. As a Requestor, edit an `OPEN` request and confirm an `UPDATED` history entry appears.
2. Cancel another `OPEN` request, provide a reason, and confirm its status becomes `CANCELLED` and it disappears from the Runner marketplace.
3. As a Runner, open `/runner/requests`, select an `OPEN` request, and accept it.
4. Confirm the request moves from **Available Requests** to **My Tasks** with status `ACCEPTED`.
5. Confirm the original Requestor can no longer edit or cancel the accepted request.
6. With a second Runner account, confirm the accepted request is no longer available and cannot be accepted again.
7. Confirm Requestors cannot access `/runner/requests` or `/runner/tasks`, and Runners cannot access Requestor request routes.

## Run and verify

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

### Test Requestor and Runner accounts

1. Visit `/register`, enter valid information, and choose Requestor.
2. Confirm the email if the Supabase project requires it, then log in.
3. Verify redirect to `/requestor/dashboard`, open `/requestor/profile`, edit the name or phone, and log out.
4. Register a second email as Runner and verify redirect to `/runner/dashboard`.
5. While logged in as Runner, open `/requestor/dashboard`; it should redirect to `/unauthorized`. Repeat in reverse with the Requestor account.
6. Refresh a dashboard to verify the Supabase session persists.
7. Log out, then open either dashboard URL; it should redirect to `/login`.

Confirm profile rows and roles in **Supabase → Table Editor → profiles**. Confirm role protection at the database layer by attempting an update of your own `role` through the Supabase client; PostgreSQL should reject it.

## Production build and Vercel

1. Run `npm run build` locally.
2. Import the repository into Vercel (the framework preset should detect Vite).
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel project environment variables.
4. Set the build command to `npm run build` and output directory to `dist`.
5. Add the Vercel production domain to Supabase Authentication URL Configuration and set it as the Site URL for production.
6. Configure an SPA rewrite to `/index.html` in Vercel if direct navigation to React Router paths returns a platform 404.

## Suggested next phase

Add automated workflow and RLS tests, then implement production-quality category filters, search, pagination, and route-level code splitting. Keep platform payment integrations, chat, location tracking, and ratings as separate later milestones after the core request lifecycle is thoroughly tested.
