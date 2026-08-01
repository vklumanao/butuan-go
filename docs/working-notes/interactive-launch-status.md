# Interactive Launch Status

## Objective

Turn the final landing-page call to action into a useful launch-status panel
with an appropriate next step even while public account access is closed.

## Users and scenario

- Primary role: Public visitor
- Starting state: Visitor reaches the end of the landing page
- Expected end state: Visitor understands the release stage and has a useful CTA

## Scope

### Included

- Three selectable release stages and contextual descriptions
- Scroll, progress, icon-ring, glow, and detail animations
- Development Google CTA and production-safe informational CTAs
- Keyboard, pointer, touch, and reduced-motion behavior

### Excluded

- Waitlist collection, launch-date promises, or backend changes
- Automatic stage progression or production account access

## Existing code to reuse

- Relevant routes: `/`, `/login`, and `/safety`
- Pages/components: `LandingPage.jsx`, `ScrollReveal`, and `Button`
- Services/RPCs: None
- Constants/validation: `isPublicAuthEnabled`

## Data and security impact

- Database migration required: No
- New or changed RPCs: None
- RLS or grants affected: None
- Personal/private data involved: None
- Payment, dispute, safety, or audit impact: Informational presentation only
- Destructive or irreversible behavior: None

## Agent split

- Additional agents needed: No
- Why the work is independently divisible: Small sequential frontend change
- Agent file boundaries and expected findings: Not applicable

## Acceptance criteria

- [x] Release stages respond to hover, focus, click, and tap.
- [x] Stage detail and selected state stay synchronized.
- [x] Production has no Google CTA and still offers useful navigation.
- [x] Development retains the Google CTA.
- [x] Reduced-motion preferences disable nonessential movement.
- [x] Mobile and desktop layouts remain usable.
- [x] `git diff --check` passes.
- [x] `npm run check` passes.

## Release requirements

- Required migrations and order: None
- Manual Supabase verification: None
- Environment/configuration changes: None
- Deployment authorized by user: No
- Rollback or recovery note: Revert the frontend commit

## Handoff

- Files changed: `LandingPage.jsx`, `index.css`, and this brief
- Verification completed: ESLint, both Vite build modes, CTA bundle checks,
  and diff whitespace check
- Verification not possible locally: Automated visual browser capture
- Required user action: Review the interaction locally
- Optional follow-up outside scope: Secure beta-interest collection
