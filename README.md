# ButuanGo

ButuanGo is a local task-request marketplace foundation for Requestors who need help with everyday errands and Runners who want to complete local tasks. The current development milestone includes real Supabase authentication, role-aware workspaces, a secure request lifecycle, privacy-preserving nearby discovery, explicit payment arrangements and evidence, verified handoff, direct-settlement confirmation, failed-delivery reporting, participant disputes, and beta trust controls.

## Milestone scope

Included: responsive landing and account UI, Google-only authentication, mandatory first-time profile onboarding, secure Requestor/Runner workspace switching, persistent sessions, logout confirmation, automatic profile creation, protected and active-role routes, profile editing, request creation and acceptance, explicit direct-payment arrangements, Runner cash-advance consent, price-change approval, private receipt evidence, private handoff-code verification, two-sided direct-settlement confirmation, failed-delivery reporting, participant disputes, completed-request ratings, limited activity summaries, future-match blocking, private safety reports, request/report rate limits, audited restriction/suspension/permanent-ban controls, self-service deletion requests with a seven-day cancellation period and audited application-level anonymization, a protected Admin operations dashboard and audit trail, privacy-preserving nearby discovery with interactive map and list views, post-acceptance directions, secure in-app realtime notifications, loading/error states, SQL schema, triggers, Storage policies, and Row-Level Security.

Excluded from the current UI: email/SMS/browser-push notifications, platform-processed payments/GCash/escrow, chat, live GPS tracking, public written-review feeds, AI, identity verification, government transactions, automated moderation, bulk hard deletion of transaction history, and deletion of the protected Supabase authentication safety record.

## Technology

- React and React Router with JavaScript/JSX only
- Vite and Tailwind CSS
- shadcn/ui-style components backed by Radix UI
- Lucide React icons and Sonner notifications
- React Hook Form, Zod, and the Zod resolver
- MapLibre GL JS with a configurable vector basemap style
- Supabase Authentication, PostgreSQL, and private Storage

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

`VITE_MAP_STYLE_URL` is optional. The app defaults to the OpenFreeMap Liberty style. Set it to another MapLibre-compatible style URL when using a dedicated production map provider or a self-hosted style.

`VITE_GEOCODING_SEARCH_URL` is also optional. The development default uses the public Nominatim search endpoint only when a user explicitly submits a place or barangay query; it does not implement autocomplete or reverse-geocoding. Configure a dedicated Nominatim-compatible provider or self-hosted endpoint before material production traffic.

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
13. Run `supabase/migrations/011_approximate_request_geography.sql`, then run `supabase/verify_approximate_request_geography.sql`. This adds server-rounded neighborhood coordinates, secure Requestor mutation RPCs, local nearby filtering, and directions from participant-only addresses.
14. Run `supabase/migrations/012_request_payment_terms.sql`, then run `supabase/verify_request_payment_terms.sql`. This adds explicit payment arrangements, private payer details, maximum Runner cash-advance exposure, atomic acceptance consent, and a start-task consent guard.
15. Run `supabase/migrations/013_payment_evidence.sql`, then run `supabase/verify_payment_evidence.sql`. This adds higher-price approval, renewed Runner consent, participant-only receipt metadata, the private `request-receipts` Storage bucket, and guarded completion RPCs.
16. Run `supabase/migrations/014_handoff_settlement_disputes.sql`, then run `supabase/verify_handoff_settlement_disputes.sql`. This adds private handoff codes, two-sided direct-payment confirmation, terminal failed-delivery reports, participant disputes, Admin resolution RPCs, and temporary account restrictions.
17. Run `supabase/migrations/015_google_only_auth.sql`, then run `supabase/verify_google_only_auth.sql`. This adds mandatory Google-user onboarding, versioned acceptance records, and a database authorization gate for incomplete profiles.
18. Run `supabase/migrations/016_google_profile_avatars.sql`, then run `supabase/verify_google_profile_avatars.sql`. This backfills existing Google profile photos and keeps them synchronized when Google refreshes the user's avatar metadata.
19. Run `supabase/migrations/017_admin_dashboard.sql`, then run `supabase/verify_admin_dashboard.sql`. This adds Admin-only operational read APIs, the protected Admin audit trail, and audit triggers for dispute and restriction actions.
20. Run `supabase/migrations/018_trust_features.sql`, then run `supabase/verify_trust_features.sql`. This adds completed-request ratings, limited participant activity summaries, future-match blocking, private safety reports with Admin review, audit events, and server-enforced request/report limits.
21. Run `supabase/migrations/019_account_lifecycle.sql`, then run `supabase/verify_account_lifecycle.sql`. This extends temporary restrictions with read-only suspension, permanent ban, restoration, receipt-write enforcement, user notices, and Admin audit records. Suspension or ban is rejected while unfinished requests exist.
22. Run `supabase/migrations/020_account_deletion_requests.sql`, then run `supabase/verify_account_deletion_requests.sql`. This adds self-service deletion requests, blocker checks, a seven-day cancellation period, pending-account marketplace restrictions, an Admin review queue, controlled profile and location anonymization, and irreversible audit records.
23. Under **Authentication → URL Configuration**, set the Site URL to `http://localhost:5173` for local development. Add `http://localhost:5173/auth/callback` to the allowed redirect URLs, then add its exact production equivalent after deployment.
24. In Google Cloud, create a Web OAuth client and register `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback` as an authorized redirect URI. Under **Supabase Authentication → Providers → Google**, enable Google and enter that client ID and secret.
25. Disable public Email authentication in Supabase after confirming the Google flow. The application intentionally exposes no password registration, password login, or password-recovery routes.

New Google users return through `/auth/callback` and are sent to `/onboarding`. Returning users with completed profiles go directly to their current Requestor or Runner dashboard.

### Local demo mode

Google OAuth does not run in local demo mode. Use `VITE_DEMO_MODE=false` with a configured Supabase project to sign in. Existing browser-only demo sessions remain readable for interface testing, but the application no longer creates or authenticates demo password accounts.

### How profile creation works

The `on_auth_user_created` PostgreSQL trigger runs as a security-definer when Google creates a Supabase Auth user. It creates a safe, incomplete `public.profiles` row using the Google name, email, and optional avatar metadata. An incomplete profile receives no marketplace role from `private.current_profile_role`, even if the browser attempts to bypass the onboarding route.

The Google avatar is shown during onboarding, on the profile page, in desktop and mobile account navigation, and in participant cards after request acceptance. `016_google_profile_avatars.sql` backfills older Google accounts and synchronizes later Google avatar metadata changes. The interface falls back to the user's initials when Google provides no image or the remote image cannot be loaded.

The authenticated user completes their own profile through `complete_account_onboarding`, providing a phone number, selecting Requestor or Runner, and accepting the current Terms, Privacy Notice, and Safety guidance. The RPC records the initial and active role plus the acceptance version and timestamp. It cannot assign Admin. Admin profiles remain trusted backend assignments and are never offered by Google onboarding or workspace switching.

### Row-Level Security

RLS is enabled on `profiles`. Authenticated users can select and update only the row whose ID matches `auth.uid()`; anonymous users receive no table privileges. Direct update grants are limited to `full_name`, `phone_number`, and `avatar_url`. A database trigger rejects changes to identity, signup method, onboarding records, the initial role, or direct manipulation of `active_role`. Only the one-time onboarding RPC may set the first normal role, and only `switch_active_role` may later change the active Requestor/Runner workspace.

### Request-domain database foundation

`supabase/migrations/002_request_workflow.sql` adds `categories`, `requests`, and `request_updates`. Marketplace request details use a general `area`; government identifiers, payment credentials, chat, and GPS data are intentionally excluded.

Authenticated users receive read access only where RLS permits it. Requestors can read their own requests, assigned Runners can read their tasks, and Runners can browse `OPEN` requests. Direct request inserts, updates, and deletes are not granted to browser roles. Instead, authenticated clients use restricted RPC functions for creation, open-request editing, pre-start cancellation or release, atomic acceptance, starting work, submitting completion, and confirming completion. Database constraints and triggers reject skipped status transitions and record lifecycle history.

The supported lifecycle is:

```text
OPEN → ACCEPTED → IN_PROGRESS → AWAITING_CONFIRMATION → COMPLETED
  └→ CANCELLED          └→ FAILED
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

`supabase/migrations/009_dual_role_mode.sql` allows one normal account to use both public marketplace workspaces. Google onboarding chooses only the starting mode. The original `profiles.role` is retained for account history, while `profiles.active_role` controls route guards, navigation, and role-gated database RPCs. Switching does not log the user out and does not change request ownership, Runner assignments, history, notifications, or capacity.

Request queries are explicitly scoped by context: Requestor pages require `requestor_id = auth user`, Runner task pages require `runner_id = auth user`, and the available marketplace excludes requests posted by that same account. The acceptance RPC independently prevents self-acceptance. Notifications identify their intended workspace and securely switch before opening the related page when necessary.

To verify dual mode, complete Google onboarding with either starting mode and use the sidebar or mobile account menu to switch. Create a request in Requestor mode, switch to Runner mode, and confirm your own request is absent from Available Requests. Accept a different account's request, switch back to Requestor, and confirm the assigned task does not appear under My Requests. Switch to Runner again and confirm the assignment and capacity state remain intact.

### Privacy-preserving nearby discovery

Requestors may optionally use their device location when creating or editing a request. The browser rounds the coordinates to two decimal places (roughly neighborhood-level precision) before sending them, and an ownership-checking RPC enforces that precision again before storage. The exact captured coordinates never leave the request form. Runners may opt in to browser location on Available Requests; ButuanGo does not persist or send that position to Supabase, and the browser uses it to sort and filter public request approximations by straight-line distance.

Requestors can alternatively open **Choose on map**, submit a barangay/place search, click the map, or drag a private orange editing pin. The shaded preview is centered on the same coarsened point that Runners receive, so it accurately shows the public area before submission. The editing pin itself is never included in Runner marketplace data, and place search explicitly warns users not to submit private information to the external geocoder.

Available Requests provides synchronized **List** and **Map** views. Before acceptance, distance is displayed only as a range and each public location is rendered as a shaded approximate area rather than an address pin. The map supports an optional full-screen view, clusters overlapping areas, displays the Runner's non-persisted position when enabled, and opens a limited request preview linking to the protected detail route. Requests without an approximate location remain accessible in List view. The default OpenFreeMap style includes its underlying map-data attribution through MapLibre; a different compatible style may be configured with `VITE_MAP_STYLE_URL`.

Exact written pickup and destination addresses remain in `request_locations` under participant-only RLS. Once a Runner accepts a request, the private location card provides a directions link based on the authorized address. Browser geolocation requires user permission and a secure context (HTTPS in production, with localhost supported for development); area-based browsing remains available when permission is declined.

To verify the flow, create a request and open **Choose on map**. Search for a barangay or place, choose a result, then drag the orange editing pin and confirm the shaded public preview updates. Submit and confirm the stored `approximate_latitude` and `approximate_longitude` have two decimal places. In a Runner workspace, select **Use my location**, verify requests with approximate locations are ordered by distance range, and apply a radius. Switch to **Map**, select a shaded request area, and open its preview. Confirm the orange editing pin and exact address are absent. Accept the request, then verify the private address and **Open directions** control become available.

### In-person settlement policy

ButuanGo does not collect, hold, transfer, refund, or process funds in this milestone. Each request explicitly uses **No purchase expense**, **Merchant already paid**, or **Runner cash advance**, and identifies whether the Requestor or recipient will pay the Runner directly at meetup or delivery. The stored expense budget and service fee are estimates and user agreements, not platform charges or proof of payment.

For a cash advance, the expense budget is the maximum amount the Runner is asked to cover. The Runner sees that exposure before acceptance and must explicitly consent; the database records the consent amount and time and prevents the task from starting without it. Consent is voluntary and is not a reimbursement guarantee. Users should agree on any cost change before purchase, keep applicable receipts, meet safely, and never share a PIN, OTP, password, banking credential, or payment account access. The application intentionally has no wallet, paid status, payout balance, escrow record, or online transaction history.

`request_payment_terms` exposes only the arrangement, payer type, maximum advance, and consent state to eligible marketplace users. Private payer name, payer phone, and prepaid merchant reference are stored separately in `request_payment_details`; only the Requestor and assigned Runner can read them through RLS.

### Price changes and private receipts

`supabase/migrations/013_payment_evidence.sql` handles increases to a Runner cash-advance limit after work starts. A Runner may request a higher maximum with a reason, but must wait for the Requestor to approve or decline it. Approval clears the old consent, and the Runner must explicitly consent to the revised maximum before uploading the purchase receipt or submitting completion. Declining leaves the original maximum unchanged. A Runner may also withdraw a still-pending request.

Purchase receipts are stored in the private `request-receipts` Storage bucket, while participant-only metadata records the receipt amount, original file name, size, and optional note. Only the owning Requestor and assigned Runner can read the files. The assigned Runner may upload or remove receipts only while the task is `IN_PROGRESS`. JPG, PNG, WebP, and PDF files up to 5 MB are accepted, with a maximum of eight receipts per task.

For **Merchant already paid** and **Runner cash advance**, the database blocks completion submission until at least one receipt is registered. It also blocks submission while a price change is pending or revised Runner consent is missing. The Requestor must acknowledge reviewing the receipts before final completion. These records support task accountability but still do not prove that direct reimbursement or the service fee was paid.

To verify the Phase 2 flow, start a Runner-cash-advance task, request a higher limit, and confirm the Requestor receives a notification. Approve it, verify the Runner receives a decision notification, and confirm receipt upload remains locked until the Runner accepts the revised limit. Upload a fictional receipt, submit completion, open the receipt as the Requestor, check the review acknowledgement, and confirm completion. Repeat with a declined and withdrawn price change, and verify an unrelated account cannot select the metadata or open a signed receipt URL.

### Secure handoff, settlement, and resolution

`supabase/migrations/014_handoff_settlement_disputes.sql` creates a private six-digit handoff code when a task starts. Only the owning Requestor can retrieve the code; the assigned Runner receives only verification state and five attempts. Purchase evidence and price changes lock after successful verification. The Runner must then explicitly confirm receiving the documented direct amount—actual Runner-advance receipt total plus fee, or only the fee for prepaid/no-purchase tasks—before completion can be submitted. The Requestor separately confirms direct settlement during final completion.

Before verification and payment confirmation, a Runner may permanently mark an `IN_PROGRESS` task as `FAILED` with a structured reason and description. This releases Runner capacity, preserves the assignment and participant records, and notifies the Requestor. The Requestor may acknowledge the report without admitting agreement. Either participant may open one dispute for an in-progress, awaiting-confirmation, failed, or recently completed request; an open dispute pauses completion and may be withdrawn by its author.

An authenticated profile whose active role is `admin` receives a protected operations workspace at `/admin/dashboard`. It provides live summary counts, request oversight without exact private locations, an account directory, dispute resolution, account lifecycle controls, and an Admin audit log. The existing `admin_resolve_request_dispute` RPC may optionally apply a temporary restriction only after an upheld dispute. Restrictions prevent creating or accepting new requests while allowing existing responsibilities to be reviewed or completed. Suspension and permanent ban make marketplace records read-only but are rejected while unfinished requests exist; the user retains access to view records and file a relevant dispute or private safety report. Restoration removes the current control without deleting profile or transaction history.

Normal users may request deletion from Profile only when no unfinished request, open dispute, or open safety report exists. A pending request pauses new marketplace commitments and remains cancellable for seven days. After that window, the protected Admin deletion queue permits completion only when the blocker check still passes. Completion removes saved addresses and notifications, redacts private location and payer snapshots supplied by the Requestor, clears identifying profile fields and authored rating comments, preserves pseudonymous transaction and safety history, and permanently prevents application reuse by that Google identity. The Supabase authentication identity is retained as a protected safety record; this is application-level anonymization, not destructive deletion of every database or authentication record.

Admin access is never offered by Google onboarding or workspace switching. The trusted Google account must sign in once, then an operator runs `supabase/provision_admin.sql` manually after replacing its placeholder with the exact email. The database trigger-protected update assigns both Admin role fields and completes the protected profile state. There are no demo Admin credentials and no browser-accessible Admin provisioning function.

To verify Admin operations, provision a dedicated trusted Google account, sign out and back in, and confirm redirect to `/admin/dashboard`. Confirm a normal account cannot open any `/admin` route or call any `admin_list_*` RPC. Open a test dispute between two normal accounts, resolve it with a written outcome, optionally apply a short restriction only for an upheld result, and verify participant notifications plus audit events. Clear the restriction from Accounts and verify a second audit event is recorded.

### Post-acceptance lifecycle verification

1. As a Runner, accept an open request and open it under **My Tasks**.
2. Select **Start Task**, confirm the dialog, and verify the status and history change to `IN_PROGRESS`.
3. Confirm the Requestor receives a **Task started** notification.
4. For a purchase arrangement, upload at least one fictional private receipt. If the price increased under Runner advance, complete its approval and renewed-consent flow first.
5. Ask the Requestor for the private handoff code, verify it as Runner, and confirm receiving the documented direct payment.
6. As the Runner, select **Submit for Confirmation** and verify the status becomes `AWAITING_CONFIRMATION`.
7. Confirm the Requestor receives a completion-confirmation notification, can open the private receipt, and sees **Confirm Completion**.
8. As the Requestor, acknowledge the receipt review when required, confirm direct payment, and verify the final status is `COMPLETED`.
9. Confirm the Runner receives a completion notification and neither role sees another lifecycle action.
10. Reopen each dashboard and confirm the live summary counts reflect the final state.

### Requestor workflow verification

1. Sign in with a Requestor account and open `/requestor/requests`.
2. Select **Create a Request** and verify that categories load from Supabase.
3. Complete **Task**, then select **Continue** and confirm incomplete fields keep the user on that step.
4. Under **Location**, verify the fulfillment type and exact task details appear first with a **Shown after acceptance** label. Confirm the general area follows with a **Shown before acceptance** label and the map remains optional and collapsed until selected.
5. Choose a fulfillment type and confirm only its required pickup/destination fields appear. Select **Continue** and verify the values remain intact after using **Back**.
6. Under **Budget & review**, enter non-negative amounts, choose a payment arrangement and payer, optionally select a future deadline, and verify the task, public area, fulfillment type, payment arrangement, and expected amount paid to the Runner.
7. Post the request, confirm redirect to `/requestor/requests/:requestId`, and verify the initial `OPEN` status plus `CREATED` history entry.
8. Return to **My Requests** and confirm the real request appears.
9. Open the Requestor dashboard and confirm the Open Requests count uses live data.
10. Confirm a Runner account cannot open any `/requestor/requests` route.

### Edit, cancel, and Runner acceptance verification

1. As a Requestor, edit an `OPEN` request and confirm an `UPDATED` history entry appears.
2. Cancel another `OPEN` request, provide a reason, and confirm its status becomes `CANCELLED` and it disappears from the Runner marketplace.
3. As a Runner, open `/runner/requests`, verify each card and map popup show the payment arrangement, and open an `OPEN` request. For a Runner cash advance, confirm the displayed maximum before accepting.
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

## Firebase Hosting

The production frontend is linked to the Firebase project
`butuango-vklum-2026` and its `butuan-go` Hosting site is available at
`https://butuan-go.web.app`. Firebase serves the Vite `dist`
directory, rewrites client-side routes to `index.html`, prevents stale caching
of the app shell, and caches fingerprinted assets for one year.

After authenticating the Firebase CLI locally, publish a new production build
with:

```bash
npm run deploy:firebase
```

The deployed origin and `/auth/callback` URL must remain registered in the
Google OAuth client and Supabase Auth URL configuration.

### Test Google onboarding and both workspaces

1. Visit `/login`, select **Continue with Google**, and authenticate with a test Google account.
2. Confirm a new account is redirected to `/onboarding` and cannot open a marketplace dashboard before completing it.
3. Enter a valid name and phone, choose Requestor, accept the three linked documents, and verify redirect to `/requestor/dashboard`.
4. Open `/requestor/profile`, edit the name or phone, refresh, and confirm the Google-backed session persists.
5. Switch to Runner and verify redirect to `/runner/dashboard`. Open `/requestor/dashboard` while Runner is active and confirm access is denied.
6. Log out, select **Continue with Google** again, and confirm the completed account skips onboarding.
7. Log out, then open either dashboard URL and confirm redirect to `/login`.

Confirm `signup_method`, `onboarding_completed_at`, `terms_accepted_at`, `terms_version`, and both role fields in **Supabase → Table Editor → profiles**. Confirm role protection at the database layer by attempting to update your own `role` or onboarding timestamps directly through the Supabase client; PostgreSQL should reject it.

## Production build and Vercel

1. Run `npm run build` locally.
2. Import the repository into Vercel (the framework preset should detect Vite).
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel project environment variables.
4. Set the build command to `npm run build` and output directory to `dist`.
5. Add the Vercel production domain to Supabase Authentication URL Configuration and set it as the Site URL for production.
6. Configure an SPA rewrite to `/index.html` in Vercel if direct navigation to React Router paths returns a platform 404.

## Suggested next phase

Add automated workflow, Storage-policy, handoff brute-force, settlement, rating, block, safety-report, deletion, Admin-RPC, and RLS tests, followed by a staffed support-contact and deletion-appeal process. Then add service-coverage zones, private coordinates for saved-address templates, production-quality request search, and broader route-level code splitting. Keep platform payment processing/escrow, chat, live location tracking, route optimization, public written-review feeds, destructive transaction-history or authentication-record deletion, identity-document handling, and automated moderation as separate later milestones after the core request lifecycle is thoroughly tested.
