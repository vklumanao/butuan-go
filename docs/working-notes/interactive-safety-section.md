# Interactive Safety Section

## Objective

Make the landing-page safety guidance engaging and easier to explore without
turning critical information into a distracting carousel.

## Users and scenario

- Primary role: Public visitor
- Starting state: Visitor reaches the Community safety section
- Expected end state: Visitor can select and understand each safety practice

## Scope

### Included

- Staggered scroll entrance for the copy and safety cards
- Keyboard- and tap-selectable safety cards
- Animated selection progress and expanded guidance
- Reduced-motion support

### Excluded

- Automatic rotation, new animation dependencies, or backend behavior
- Changes to the dedicated Safety page

## Existing code to reuse

- Relevant routes: `/` and `/safety`
- Pages/components: `LandingPage.jsx`, `ScrollReveal`, `Button`
- Services/RPCs: None
- Constants/validation: None

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

- [x] Cards work with click, tap, and keyboard interaction.
- [x] Selection, progress, and expanded guidance stay synchronized.
- [x] Mobile and desktop layouts remain usable.
- [x] Reduced-motion preferences disable nonessential movement.
- [x] Existing safety and payment language remains accurate.
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
- Verification completed: ESLint, production build, and diff whitespace check
- Verification not possible locally: Automated visual browser capture
- Required user action: Review the interaction locally
- Optional follow-up outside scope: Dedicated Safety page enhancements
