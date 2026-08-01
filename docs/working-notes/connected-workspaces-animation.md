# Connected Workspaces Animation

## Objective

Make the landing-page role selector visually communicate the connection between
Requestor and Runner workspaces while keeping role selection user-controlled.

## Scope

### Included

- Role-reactive dotted background, colored orbs, spotlight, and SVG connection
- Sliding Requestor/Runner tab indicator
- Pulsing role icon and staggered role-panel content
- Responsive and reduced-motion behavior

### Excluded

- Automatic role switching, pointer tracking, new dependencies, and deployment

## Data and security impact

- Database, API, or private data changes: None
- Destructive behavior: None

## Acceptance criteria

- [x] Background color and signal direction respond to the selected role.
- [x] Tabs remain keyboard accessible and user-controlled.
- [x] Panel content transitions clearly without layout instability.
- [x] Motion remains subtle on mobile and stops under reduced motion.
- [x] `git diff --check` and production/development builds pass.

## Release requirements

- Migration or configuration changes: None
- Deployment authorized by user: No

## Handoff

- Files changed: Landing page, shared CSS, and this feature brief
- Verification completed: ESLint, production and development builds, Requestor
  and Runner screenshots, tab interaction, reduced-motion review, and diff check
- Verification not possible locally: Physical mobile-device testing
