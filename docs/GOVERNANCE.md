# Cube Labs 3D Governance

**Consolidated:** 2026-07-27

This is the canonical contributor contract. Read this file before meaningful
repository work, then read `CURRENT_STATUS.md` and the reference document for
the system being changed.

The project constitution, contributor workflow, and coding standards are
preserved below with their former source filenames for provenance. Filing
instructions have been normalized to the consolidated structure. New
governance rules belong in this file instead of a new Markdown file.

---

## Project constitution

> Consolidated from `docs/CONSTITUTION.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: docs/CONSTITUTION.md -->
# Cube Labs 3D Project Constitution

Status: authoritative

This document defines the non-negotiable rules for Cube Labs 3D. Human contributors and AI agents must follow it.

## 1. Mobile first

Every page and interaction is designed and validated for phones before desktop. Desktop layouts may enhance the mobile experience but may not replace or degrade it.

## 2. Preserve approved experiences

Approved layouts and interactions must not be redesigned without explicit approval. The homepage and hero cube experience are especially protected. The hero cube must remain touchable, responsive, and central to the product identity.

## 3. The playable cube is the core value

Cube interactions should feel like handling a physical puzzle digitally. Touch accuracy, clear highlighting, camera control, undo, reliable animation, and mobile performance take priority over decorative features.

## 4. Follow the documented structure

The repository structure, component boundaries, data layer, documentation layout, and naming rules defined in `/docs` must be followed.

No contributor may:

- create a parallel architecture without approval;
- move or rename major folders casually;
- bypass shared components for quick fixes;
- place provider-specific database calls throughout visual components;
- hard-code ads, affiliate campaigns, leaderboard results, or admin-only behavior into pages;
- alter an approved page while working on an unrelated feature.

Any necessary structural change requires approval, an update to `ARCHITECTURE.md`, a numbered entry in `DECISIONS.md`, an evidence entry in `HISTORY.md`, migration notes, and rollback notes.

## 5. Documentation is part of the feature

A feature is not complete until its implementation, tests, permanent documentation, `HISTORY.md` evidence entry, and required `DECISIONS.md` record are complete.

Every meaningful change must log:

- date and time;
- author or agent;
- branch;
- commit when available;
- purpose;
- files and systems affected;
- tests performed;
- deployment status;
- known issues;
- migration impact;
- rollback path.

Documentation must be filed in the correct location. Temporary progress notes do not replace permanent documentation.

## 6. Reusable systems over duplication

Shared navigation, layouts, cube controls, ad slots, carousels, profile cards, leaderboard views, challenge cards, and admin controls must be reusable components. Fixes belong in the shared source whenever the behavior is shared.

## 7. Database independence

Supabase is the current provider, not the permanent application architecture. Pages must use a Cube Labs data/service layer. Provider-specific logic stays isolated so PostgreSQL, authentication, storage, and realtime services can be replaced without rebuilding the UI.

Database migrations and schema definitions must be committed to the repository.

## 8. Security by default

Authorization is enforced server-side. Admin access, user deletion, role changes, challenge overrides, premium grants, ad publishing, and leaderboard corrections require protected server actions and audit logs.

Secrets and service-role credentials may never be exposed to the browser or committed to the repository.

## 9. Test data isolation

Admin-generated solves, wins, losses, friendships, challenges, achievements, and leaderboard entries must be marked as test data. Test data is excluded from public statistics and rankings unless an owner explicitly enables a test display mode.

## 10. Managed ads and affiliates

Ads, banners, carousel slides, sponsorships, and affiliate products are database-driven managed content. Pages render named placements through reusable components. Campaign content must not require code changes or deployments.

Sponsored and affiliate content must be clearly disclosed.

## 11. Clear code documentation

New code must explain purpose, inputs, outputs, dependencies, security assumptions, and the reason the code exists. Comments should clarify decisions and non-obvious behavior rather than restating syntax.

## 12. Honest status reporting

Contributors must not claim work is complete, deployed, tested, or committed unless it has been verified. Failures and uncertainty must be recorded directly.

## 13. Definition of done

A change is complete only when:

- implementation is finished;
- mobile behavior is verified;
- existing approved behavior is protected;
- security and data access are reviewed;
- tests are completed and recorded;
- documentation is updated in the proper structure;
- `HISTORY.md` is updated;
- a `DECISIONS.md` record exists when required;
- deployment state is recorded;
- rollback information exists for risky changes.
<!-- END CONSOLIDATED SOURCE: docs/CONSTITUTION.md -->

---

## AI and contributor workflow

> Consolidated from `docs/AI-INSTRUCTIONS.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: docs/AI-INSTRUCTIONS.md -->
# AI Instructions for Cube Labs 3D

Every AI agent working on this repository must follow these instructions before changing code.

## Required reading

Read, in order:

1. `docs/README.md`
2. `docs/GOVERNANCE.md`
3. `docs/CURRENT_STATUS.md`
4. the canonical reference related to the task
5. relevant entries in `docs/HISTORY.md` when prior evidence matters
6. relevant records in `docs/DECISIONS.md` for structural constraints

## Before coding

- Confirm the active branch and deployment target.
- Confirm the current remote PR head separately from the local commit; app-based
  publishing may preserve the tree while assigning a different commit SHA.
- Inspect existing shared components before creating new ones.
- Identify which permanent documents must change with the feature.
- Read the current status, relevant reference section, and latest applicable
  history entry before diagnosing a reported regression.
- Protect approved layouts and unrelated pages.
- Confirm whether the task affects authentication, security, user data, admin privileges, ads, rankings, migrations, or provider independence.

## Implementation rules

- Design and validate mobile first.
- Preserve the existing hero cube and approved homepage layout unless the owner explicitly requests a redesign.
- Reuse shared components and shared engine behavior.
- Keep provider-specific code out of visual page components.
- Never hard-code managed advertisements or affiliate campaigns.
- Never expose service-role keys, SMTP credentials, private tokens, or privileged APIs.
- Enforce authorization server-side.
- Clearly mark generated test data and exclude it from public results.
- Add useful comments explaining non-obvious decisions and behavior.

## Documentation and logging

Every meaningful change must be logged in the documented structure. Update the
canonical reference and append one evidence entry to `HISTORY.md`. Add a
numbered record to `DECISIONS.md` when the change affects:

- project structure;
- system boundaries;
- data ownership;
- database schema strategy;
- provider choice;
- security model;
- public identifiers;
- ranking rules;
- managed advertising behavior;
- test-data isolation;
- approved UX conventions.

The history entry must include the date, author/agent, branch, purpose,
affected systems, tests, deployment status, known issues, migration impact,
and rollback notes when applicable.

Do not postpone documentation until a later conversation. Before saying a task
is complete:

- update `CURRENT_STATUS.md` when the active head, PR, production baseline, or
  priorities changed;
- update `ROADMAP.md` without promoting branch-only work to `[x]`;
- update the canonical feature reference;
- append one checked/completed/unverified record to `HISTORY.md`;
- add a numbered `DECISIONS.md` entry when the decision boundary requires it;
- update the same records again after a push, deployment result, or merge.

Historical entries stay intact. Add a new superseding entry instead of
rewriting what was accurately known at the earlier time.

## Completion reporting

Do not say a change is complete unless it has been verified. Distinguish clearly between:

- planned;
- coded;
- committed;
- merged;
- deployed;
- tested on desktop;
- tested on a real or emulated mobile device;
- blocked.

## Prohibited behavior

An AI agent may not:

- silently reorganize the repository;
- replace approved designs while fixing unrelated code;
- duplicate an existing shared system;
- bypass the application data layer;
- place test records into real leaderboards;
- weaken RLS or admin authorization to fix an error;
- claim background work is occurring;
- claim a commit or deployment exists without checking.

## Handoff requirement

At the end of a substantial task, record:

- what changed;
- current branch and commit;
- deployment URL or deployment status;
- tests completed;
- remaining issues;
- next recommended action;
- documentation files updated.

If local and hosted commits differ, include both SHAs and the verified tree
relationship. If documentation is still uncommitted, say so explicitly.
<!-- END CONSOLIDATED SOURCE: docs/AI-INSTRUCTIONS.md -->

---

## Coding standards

> Consolidated from `docs/CODING-STANDARDS.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: docs/CODING-STANDARDS.md -->
# Cube Labs 3D Coding Standards

Authoritative implementation + commenting standards. Referenced by
`docs/README.md`.

## Architecture boundaries

```
Admin UI / reusable admin components   (components/admin/*, app/admin/**)
        ↓
Protected server actions / route handlers   (app/admin/actions/*, app/api/admin/*)
        ↓
Cube Labs administration services   (lib/admin/*)
        ↓
Provider adapter (service role)   (lib/admin/service-client.ts)
        ↓
Supabase / PostgreSQL / Auth / Storage
```

- **Visual components never perform privileged Supabase operations directly.**
  They call server actions, which call services, which call the provider adapter.
- Provider-specific calls stay behind the service/adapter boundary so a future
  migration away from Supabase touches one layer, not the UI.
- `import "server-only"` guards every module that must never reach the client
  (`service-client`, `auth`, `audit`, `overview`, `users`, `security`,
  `settings`, `list`, and the action files).

## Server actions & routes

Every privileged mutation follows the same shape:

1. `assertSameOrigin()`
2. `authorizeAction(permission)` (throws on failure)
3. validate + normalize input (`lib/admin/validation.ts`)
4. operate via the service role
5. `writeAudit(...)` (redacted)
6. `revalidatePath(...)`
7. redirect with a safe `message` / `error` query param (never leak internals)

`handleActionError` maps errors to user-safe messages and records a security
event for authorization failures.

## Validation

- All input is validated server-side; the browser is never trusted for shape,
  size, or safety.
- URLs go through `safeUrl` (http/https only). Text is length-capped.
- Enumerated values go through `oneOf`; integers through `clampInt`.

## Migrations

Additive and idempotent (`create table if not exists`, `add column if not exists`,
`drop policy if exists` before `create policy`). Enable RLS, add policies,
add indexes, preserve existing rows, comment non-obvious security decisions,
include rollback guidance. Never rewrite existing gameplay rows.

## Comments

Match the surrounding terse style. Explain **why** for non-obvious security and
architecture decisions (see the header comments in `20260723_admin_platform.sql`
and `lib/admin/*`). Do not over-comment mechanical code.

## Styling

Mobile-first. Tailwind utilities reading from the CSS custom properties in
`app/globals.css`. Primary interactive controls are ≥44×44px. Shared admin form
control: the `.input` class. Status is never communicated by color alone (text
label + pill).

## Testing

Pure logic (permissions, redaction, validation, campaign selection) is unit
tested with Vitest under `tests/` and must stay green (`npm test`). A green build
is `[~]`, not `[x]` — real behavior must be confirmed where a user can see it.

Puzzle changes should test each layer they can break:

- engine invariants, inverse/round-trip behavior, and solved detection;
- renderer membership and accumulated transforms across repeated algorithms;
- gesture candidate stability after earlier moves;
- serialized save/result/challenge payloads and assistance blocking;
- browser/mobile behavior for touch direction, layout, native share/clipboard,
  account persistence, and two-account challenge paths.

Do not use a logic-only test to claim a Three.js interaction is verified, or a
browser preview build to claim production database/RLS behavior is verified.

## Do not

- Weaken RLS to make a feature work.
- Hard-code managed ads, leaderboards, roles, or admin behavior.
- Store authorization in client-controlled fields.
- Scatter provider-specific URLs/keys through components.
- Claim something is deployed or verified without checking it.
<!-- END CONSOLIDATED SOURCE: docs/CODING-STANDARDS.md -->
