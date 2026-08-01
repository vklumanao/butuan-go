# Safety Radar Background

## Objective

Give the landing-page safety section a subtle animated background that reinforces
community awareness without competing with its interactive guidance cards.

## Scope

### Included

- CSS-only dotted field, radar rings and sweep, drifting glows, and beacon
- A soft background glow that follows the active safety guidance card
- Mobile restraint and reduced-motion behavior

### Excluded

- Canvas, particle dependencies, pointer tracking, audio, and production release

## Data and security impact

- Database or API changes: None
- Personal or private data: None
- Destructive behavior: None

## Acceptance criteria

- [x] Background remains behind readable section content.
- [x] Active-card glow follows the selected safety step.
- [x] Motion uses low-opacity, slow visual effects.
- [x] Mobile and reduced-motion modes remain usable.
- [x] `git diff --check` and `npm run check` pass.

## Release requirements

- Migration or configuration changes: None
- Deployment authorized by user: No

## Handoff

- Files changed: Landing page, shared CSS, and this feature brief
- Verification completed: ESLint, production and development builds, reduced-
  motion review, full-page desktop screenshot, and `git diff --check`
- Verification not possible locally: Physical mobile-device testing
