# ButuanGo Agent Guardrails

These instructions apply to every file in this repository. Keep implementation
focused, secure, and easy for the project owner to verify.

## Product boundaries

- ButuanGo is a local Requestor/Runner task marketplace with a protected Admin
  workspace.
- Google sign-in proves control of a Google account; it is not identity
  verification.
- Payments are arranged and settled directly by participants. Do not describe
  ButuanGo as holding funds, guaranteeing reimbursement, or providing escrow.
- Preserve transaction, dispute, safety, and Admin audit history. Never add a
  hard-delete path for these records without an explicit, separately reviewed
  requirement.
- Exact request locations remain private until a Runner accepts the request.

## Branches and releases

- Implement normal feature work on `development`.
- Treat `main` as the production release branch.
- Do not merge, deploy, or change external production state unless the user
  explicitly requests it.
- Before any frontend deployment that depends on database changes, confirm that
  every required Supabase migration and verification script has been applied.
- Firebase Hosting deployments must use the configured `app` target. Do not add
  GitHub Actions or another automatic deployment workflow unless explicitly
  requested later.

## Efficient task workflow

1. Read the request and define the smallest complete outcome.
2. Search with `rg` or `rg --files` before opening files. Read only the relevant
   sections of large files.
3. Check `docs/PROJECT_MAP.md` and reuse existing routes, components, services,
   constants, and database functions.
4. For a material feature, copy `docs/FEATURE_BRIEF.md` into the working notes
   and fill in scope, exclusions, security impact, and acceptance checks.
5. Inspect the current Git status before editing. Preserve unrelated user work.
6. Implement one vertical slice at a time and avoid opportunistic refactors.
7. Run targeted checks while working, then run `npm run check` before handoff.
8. Report required migrations, verification limitations, and deployment state
   clearly. Never imply that unexecuted SQL was tested against Supabase.

## Frontend conventions

- Use React and JavaScript/JSX; do not introduce TypeScript without a separate
  migration decision.
- Follow existing `@/` imports and reuse components under `src/components/ui`.
- Keep route screens in `src/pages`, reusable UI in `src/components`, Supabase
  calls in `src/services`, and shared values in `src/lib`.
- Maintain responsive keyboard-accessible interfaces, visible labels, loading
  states, empty states, and actionable error messages.
- Do not expose secrets, service-role keys, exact private locations, private
  receipts, handoff codes, or protected report details in client logs.
- Prefer small focused changes over new abstractions with only one consumer.

## Supabase and security conventions

- Treat browser input and role checks as untrusted. Enforce sensitive behavior
  in PostgreSQL through constraints, RLS, triggers, and `security definer` RPCs.
- Never place a Supabase service-role key in Vite code or a `VITE_*` variable.
- Browser roles must not receive direct write privileges for protected workflow
  tables when an ownership-checking RPC is appropriate.
- Every schema change belongs in the next numbered file under
  `supabase/migrations`. Do not rewrite an already-applied migration.
- Add or update a matching `supabase/verify_*.sql` file for each migration.
- Use explicit schemas and a protected `search_path` in security-definer
  functions. Revoke default public execution and grant only the required role.
- Check unfinished requests, payment responsibilities, disputes, safety reports,
  and audit requirements before account lifecycle changes.
- Preserve the privacy boundary: public discovery receives only general area and
  approximate coordinates; exact locations remain participant-only.

## Coding-agent usage

- Use one agent for straightforward changes.
- Use additional coding agents only when the user requests delegation and the
  work can be divided into independent, bounded tasks.
- Good bounded roles are:
  - Investigator: read-only architecture or root-cause inspection.
  - Implementer: one named feature area with an explicit file boundary.
  - Security reviewer: read-only review of SQL, RLS, permissions, and destructive
    behavior.
  - Verifier: read-only check of the final diff, lint, build, and test evidence.
- Do not assign multiple agents to inspect or implement the same files.
- Give each agent a narrow objective, relevant paths, exclusions, and expected
  output. Ask for findings rather than a repeat of all file contents.
- The primary agent owns integration, resolves conflicts, runs final checks, and
  gives the user one consolidated result.

## Context and token discipline

- Search for symbols before reading entire files.
- Avoid repeatedly loading unchanged content or restating settled architecture.
- Keep plans to the few steps needed for the current task.
- Pass agents the smallest useful context and prefer recent focused turns over
  full-history forks when the task permits.
- Do not spawn agents for status questions, one-file edits, copy changes, or
  sequential work that the primary agent can complete directly.
- Stop expanding scope when acceptance criteria are satisfied; record unrelated
  improvements as optional follow-up work.

## Required verification

- Run `npm run check` for every completed code change. It runs ESLint and the
  production Vite build.
- Run `git diff --check` before committing.
- For database work, also review the migration transaction boundaries, function
  grants, RLS policies, destructive statements, and matching verification SQL.
- If PostgreSQL, Supabase CLI, or required credentials are unavailable, state
  that the SQL was structurally reviewed but not executed.
- Do not commit generated `dist` output or local `.env` values.

