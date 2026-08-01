# ButuanGo Feature Brief

Copy this template into working notes for a material feature. Keep every section
short. A one-file copy or styling change normally does not need a feature brief.

## Objective

What user-visible outcome must be true when this work is complete?

## Users and scenario

- Primary role:
- Starting state:
- Expected end state:

## Scope

### Included

-

### Excluded

-

## Existing code to reuse

- Relevant routes:
- Pages/components:
- Services/RPCs:
- Constants/validation:

## Data and security impact

- Database migration required: Yes / No
- New or changed RPCs:
- RLS or grants affected:
- Personal/private data involved:
- Payment, dispute, safety, or audit impact:
- Destructive or irreversible behavior:

## Agent split

- Additional agents needed: Yes / No
- Why the work is independently divisible:
- Agent file boundaries and expected findings:

Use one agent unless delegation is explicitly requested and materially useful.
Never assign multiple agents to edit the same files.

## Acceptance criteria

- [ ] Primary happy path works.
- [ ] Loading, empty, error, and blocked states are handled where applicable.
- [ ] Mobile and desktop layouts remain usable.
- [ ] Authorization is enforced by the backend for sensitive behavior.
- [ ] Existing privacy boundaries remain intact.
- [ ] Required migration and verification SQL are included.
- [ ] `git diff --check` passes.
- [ ] `npm run check` passes.

## Release requirements

- Required migrations and order:
- Manual Supabase verification:
- Environment/configuration changes:
- Deployment authorized by user: Yes / No
- Rollback or recovery note:

## Handoff

- Files changed:
- Verification completed:
- Verification not possible locally:
- Required user action:
- Optional follow-up outside scope:
