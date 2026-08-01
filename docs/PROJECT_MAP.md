# ButuanGo Project Map

Use this map before exploring the repository. Search for the relevant symbol
and open only the files needed for the current change.

## Application entry and routing

| Path | Responsibility |
| --- | --- |
| `src/main.jsx` | React entry point |
| `src/App.jsx` | Top-level providers and router |
| `src/routes/AppRoutes.jsx` | Public, protected, role, and Admin routes |
| `src/routes/ProtectedRoute.jsx` | Authenticated-session gate |
| `src/routes/RoleRoute.jsx` | Onboarding and active-role authorization |
| `src/components/layout/AppShell.jsx` | Authenticated navigation and page shell |

## Feature areas

| Path | Responsibility |
| --- | --- |
| `src/pages/auth` | Google callback, onboarding, and account-end states |
| `src/pages/requestor` | Request creation, editing, lists, and details |
| `src/pages/runner` | Nearby discovery, task lists, and task details |
| `src/pages/admin` | Operations, accounts, disputes, reports, deletions, and audit |
| `src/pages/profile` | Shared account profile screen |
| `src/pages/public` | Landing, legal, safety, unauthorized, and not-found pages |
| `src/components/requests` | Shared request workflow UI |
| `src/components/feedback` | Authenticated feedback submission dialog |
| `src/components/addresses` | Private reusable address management |
| `src/components/layout` | Navigation, notices, brands, and legal layouts |
| `src/components/ui` | Reusable interface primitives |

## State, validation, and data access

| Path | Responsibility |
| --- | --- |
| `src/contexts/AuthContext.jsx` | Session and current profile state |
| `src/hooks` | Context-facing and notification hooks |
| `src/services` | Supabase queries, RPC calls, auth, and Storage operations |
| `src/validation` | Zod form schemas |
| `src/lib/constants.js` | Roles and cross-feature account constants |
| `src/lib/requestConstants.js` | Request, payment, dispute, and report constants |
| `src/lib/requestUtils.js` | Request formatting and derived helpers |
| `src/lib/supabase.js` | Browser Supabase client configuration |

## Database and operations

| Path | Responsibility |
| --- | --- |
| `supabase/setup.sql` | Initial profile and authentication foundation |
| `supabase/migrations` | Ordered, append-only database changes |
| `supabase/verify_*.sql` | Structural and manual migration checks |
| `supabase/provision_admin.sql` | Manual trusted Google Admin provisioning |
| `firebase.json` | Firebase Hosting configuration |
| `.firebaserc` | Firebase project and Hosting target mapping |

## Current security boundaries

- Exact pickup and delivery records are separate from public request discovery.
- Unassigned Runners receive general area and approximate coordinates only.
- Request mutations use guarded RPCs and lifecycle triggers.
- Receipt files use a private Storage bucket and participant checks.
- Admin reads and mutations require the protected Admin role.
- Account access, reports, disputes, and deletion processing retain audit history.
- Google OAuth authentication is not identity verification.
- ButuanGo records direct-settlement agreements but does not process money.

## Change routing examples

| Requested change | Inspect first |
| --- | --- |
| Add a Profile control | `ProfilePage.jsx`, relevant service, profile/RPC migration |
| Change Admin accounts | `AdminUsersPage.jsx`, `adminService.js`, latest Admin migration |
| Change request status | Request action component, `requestService.js`, lifecycle migrations |
| Change maps or privacy | Map component, geography utilities, location/geography migrations |
| Change payments | Payment components, request constants, migrations `012` to `014` |
| Change authentication | Auth context/service, auth routes, migrations `015` to `016` |
| Add account safety flow | Trust service/components, Admin pages, migrations `018` onward |
