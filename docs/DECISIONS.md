# Cube Labs 3D Architecture Decisions

**Consolidated:** 2026-07-27

Accepted structural decisions live in this single append-only file. Keep the
stable ADR numbers. Add a new numbered section when project structure, system
boundaries, data ownership, providers, security, public identifiers, ranking,
managed advertising, or test-data isolation changes.

---

## ADR 0001 — Documentation governance

> Consolidated from `docs/decisions/0001-documentation-governance.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: docs/decisions/0001-documentation-governance.md -->
# ADR 0001: Permanent Documentation Governance

- Status: accepted
- Date: 2026-07-22
- Decision owners: Cube Labs project owner and contributing agents

## Context

Cube Labs accumulated useful checkpoint and progress Markdown files while the product evolved quickly. Those files preserve history, but important rules and decisions were spread across documents and conversations. This made it easier for future contributors to miss requirements, duplicate systems, redesign approved pages, or fail to log structural changes.

## Decision

Create `/docs` as the permanent source of truth.

All contributors must follow the documented structure. Every meaningful change must update the correct permanent document and changelog. Architectural or structural changes require a decision record.

Older checkpoint files remain historical evidence. Their durable information must be folded into permanent topic documents or referenced through an archive index rather than silently discarded.

## Required change record

Meaningful changes log:

- date and time;
- author or agent;
- branch and commit;
- purpose;
- affected systems and files;
- tests;
- deployment status;
- known issues;
- migration impact;
- rollback plan where applicable.

## Consequences

### Benefits

- New contributors have one starting point.
- Project rules become enforceable and reviewable.
- Architecture drift is easier to detect.
- Provider migration, security, admin behavior, and approved UX remain documented.
- AI handoffs become more reliable.

### Costs

- Features require documentation work in addition to code.
- Old notes must be reviewed and consolidated over time.
- Contributors must pause and record structural decisions rather than making silent changes.

## Alternatives rejected

- Continue using only timestamped progress notes: preserves history but does not provide a reliable current source of truth.
- Keep rules only in chat: inaccessible to repository contributors and easy to lose.
- Maintain documentation outside the repository: risks version drift from the code.

## Rollback

The files can technically be reverted, but returning to scattered undocumented decisions is not recommended.
<!-- END CONSOLIDATED SOURCE: docs/decisions/0001-documentation-governance.md -->

---

## ADR 0002 — Tracked 3×3 challenge prototype

> Consolidated from `docs/decisions/0002-tracked-3x3-challenge-prototype.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: docs/decisions/0002-tracked-3x3-challenge-prototype.md -->
# ADR 0002: Tracked 3x3 Challenge Prototype Boundary

- Status: accepted for prototype
- Date: 2026-07-22
- Decision owners: Cube Labs project owner and contributing agents

## Context

The owner wants the mobile leaderboard to launch a playable 3x3 challenge that records solve tracking, lets players choose and save the scramble they send, allows owner/test controls such as manual complete time and reported move/undo counts, and sends the same scramble to another Cube Labs account.

The repository already has:

- a reusable NxN playable cube component with timer, scramble, solved-state, undo, and gesture handling;
- a `solve_results` table and `/api/solves` endpoint;
- a `challenges` table in `20260722_cube_id_platform.sql`;
- documentation requiring provider-isolated services, test-data isolation, server-side validation, and no false production leaderboard claims.

The initial `challenges` table did not include explicit top-level columns for recipient time, test-data markers, assistance flags, validation status, or anti-cheat review.

2026-07-22 follow-up: `supabase/migrations/20260722_tracked_scrambles_solver_memory.sql` now adds the first durable schema layer for reusable scrambles, ranked scramble attempts, solver memories, and promoted tracking/test-data columns. The remaining boundary is production trust: browser proof, server-side validation, anti-cheat, admin audit UI, and paid-tier enforcement.

2026-07-27 follow-up: PR #6 generalized exact-start memory and friend routing
across supported puzzle routes. Draft Skewb PR #9 adds the first shared
non-3×3 completed-attempt envelope through `lib/puzzle-attempt.ts`, including
time, moves, undo/touch/button counts, move history, assistance blocking, and
optional sender-result attachment. This extends the accepted prototype
boundary; it does not change the production-trust requirements below.

## Decision

Build the first usable 3x3 leaderboard challenge as a prototype on `claude/home-page-html-rebuild-q7qomi` by:

- reusing `app/NxNCubeGame.tsx` instead of creating a separate cube renderer;
- adding a challenge mode that records elapsed time, move count, touch/button move counts, undo count, replay metadata, and manual test/admin time overrides;
- allowing the player to load a chosen 3x3 scramble before saving or sending;
- allowing admin/test reported metric overrides while preserving actual observed metrics in replay metadata;
- saving solve results through the existing `solve_results` table;
- creating signed-in account-to-account challenge rows through the existing `challenges` table;
- exposing `/leaderboard/3x3/play`, `/play/3x3`, `/challenge/[id]`, and `/profile/challenges`;
- keeping Supabase access behind `app/lib/challenge-service.ts` and API routes;
- marking manual override data in `replay_data` as `is_test_data` and `manual_time_override`.
- marking tracking overrides in `replay_data` as test/admin data with actual and reported metrics.
- allowing shared puzzle components to submit the same versioned tracking
  envelope through existing APIs while keeping renderer logic independent from
  persistence;
- refusing to promote auto-solved/assisted attempts as legitimate results.

Do not treat these prototype records as production leaderboard truth.

## Required production follow-up

Before public rankings rely on this flow:

- verify and harden the new schema columns for test data, assistance flags, sender/recipient summaries, reusable scrambles, scramble attempts, and solver memories;
- define a versioned renderer-independent puzzle-state contract;
- validate challenge starts and submitted results server-side;
- separate assisted/unassisted rankings;
- exclude test/admin/manual overrides from public rankings by default;
- add suspicious-result review and admin audit logs;
- verify RLS policies and account-to-account access with real signed-in users.
- keep paid-user entitlements server-side; do not trust client-visible flags to unlock private solver memory.

## Consequences

### Benefits

- The leaderboard now leads to a real playable 3x3 flow instead of a static page.
- The owner can test win/loss and complete-time scenarios without corrupting future public rankings.
- Players can choose the scramble they want to send without waiting for the future scramble library.
- The prototype uses current app services and routes rather than scattering Supabase calls through visual components.
- The implementation can be browser-tested immediately after deployment.

### Costs

- Replay metadata is doing temporary work that should become explicit schema later.
- Custom scrambles now have reusable database rows, but public ranking views and validation are not implemented yet.
- Solver-memory storage/API now exist, but solver pages do not yet save/resume through it and paid-user retention behavior is not enforced yet.
- Recipient lookup is exact Cube Tag / username / public slug only.
- Guest challenge attempts, public share links, email/text sends, and anti-cheat are not complete.
- Production Supabase migrations must be run before the challenge table exists in production.

## Rollback

Remove the prototype routes/API/service/shared constants, revert the `NxNCubeGame` challenge-mode changes, restore the homepage and leaderboard CTA links, and remove this ADR plus matching changelog/social/roadmap entries.
<!-- END CONSOLIDATED SOURCE: docs/decisions/0002-tracked-3x3-challenge-prototype.md -->

---

## ADR 0003 — Admin platform architecture

> Consolidated from `docs/decisions/0003-admin-platform-architecture.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: docs/decisions/0003-admin-platform-architecture.md -->
# ADR 0003: Admin Platform Architecture

- Status: accepted
- Date: 2026-07-23
- Decision owners: Cube Labs project owner and contributing agents
- Branch: `claude/cubelabs-admin-dashboard-4pe35q`

## Context

Cube Labs needs an owner-operated administration platform at `/admin` covering
overview, users, ads, test data, leaderboards, challenges, content, security,
audit, settings, and exports. It must be a functional, secure, database-backed
system — not a static mockup — and must not weaken existing auth, RLS, or public
pages. The existing stack (Next.js 14 App Router, Supabase Auth + REST, HTTP-only
cookies, Vercel) must be reused and strengthened.

## Decisions

### 1. Administrator role storage

Authorization lives in a dedicated `admin_members` table (role, active,
expiration, created/updated-by), **never** in editable profile fields or
client-controlled user metadata. Roles: owner, admin, moderator, editor, support,
analyst.

### 2. Permission enforcement

A centralized matrix (`lib/admin/permissions.ts`) is the single source of truth.
`permissionsForRole` is derived from `hasPermission` so listed and effective
grants cannot diverge. Owner-only capabilities are enforced by an `OWNER_ONLY`
set that denies non-owners even if the matrix is mis-edited. UI visibility reads
the matrix, but **every** server operation re-checks with `authorizeAction`.

### 3. Service-role usage

The Supabase service-role key is used only in server-only code
(`lib/admin/service-client.ts`, guarded by `import "server-only"`) after
`requireAdmin`/`requirePermission` passes. It is read from
`SUPABASE_SERVICE_ROLE_KEY` (never `NEXT_PUBLIC_*`) and fails closed when absent.

### 4. Audit-log design

`admin_audit_log` is append-only (no UPDATE/DELETE policy). Values are redacted
(`lib/admin/redact.ts`) before insert. Moderation corrections preserve the
original value (`original_time_ms`, `correction_reason`, `corrected_by`).

### 5. Test-data isolation

A parent `test_runs` record groups generated QA data. Every generated row is
`is_test=true`, `test_run_id` set, `leaderboard_eligible=false`. Public
leaderboard reads filter `is_test=false & leaderboard_eligible=true`. Cleanup
deletes only the selected run's rows.

### 6. Managed advertising architecture

Campaigns, carousels, and affiliate products are database rows. Content changes
never require a deploy. Pure selection logic (`campaign-selection.ts`) enforces
status/schedule/priority/device; drafts and expired items never render. Public
RLS exposes only live rows.

### 7. Provider independence

UI → server action → service → provider adapter → Supabase. Provider-specific
calls stay behind the adapter so a future migration touches one layer.

### 8. Export & migration boundaries

Exports are bounded, audited CSV/JSON snapshots (test data excluded by default),
explicitly **not** presented as verified backups. `audit_logs` export is
owner-only. No one-click destructive provider migration is provided.

## Consequences

- Security is enforced server-side at every layer; the browser is never trusted.
- The system fails closed when unconfigured (missing service-role key / migration).
- Adding the migration + service-role key is required before live data appears;
  until then the UI honestly shows "Unavailable" rather than fake zeros.
- Public render components for ads and some deep feature UIs (carousel slide
  editor, full content authoring) remain follow-up work, tracked in the roadmap.
<!-- END CONSOLIDATED SOURCE: docs/decisions/0003-admin-platform-architecture.md -->

---

## ADR 0004 — Consolidated documentation structure

- Status: accepted
- Date: 2026-07-27
- Decision owners: Cube Labs project owner and contributing agents

### Context

The repository had 45 project-owned Markdown files after the Skewb
reconciliation. Current truth, implementation guidance, and historical evidence
were duplicated across status/health files, roadmap/checklist files,
constitution/AI/coding rules, root engine notes, admin references, daily logs,
changelogs, checkpoints, handoffs, and deploy triggers. Reading all files on
every task was wasteful, while selectively reading them without a routing
contract risked context loss.

### Decision

Use 13 routed Markdown files:

- `README.md`, `ASSET-CREDITS-AND-LICENSES.md`, and
  `design/learn/README.md` for repository-level context;
- `docs/README.md` as the routing index;
- `docs/GOVERNANCE.md` for the constitution, workflow, and coding standards;
- `docs/CURRENT_STATUS.md` for live state, health, risk, and release gates;
- `docs/ROADMAP.md` for both the roadmap and stable atomic checklist;
- `docs/ARCHITECTURE.md` for architecture, authentication, security, backup,
  and migration;
- `docs/CUBE-ENGINE.md`, `docs/SOCIAL-AND-MULTIPLAYER.md`, and
  `docs/ADMIN-PORTAL.md` as focused system references;
- `docs/DECISIONS.md` as the append-only ADR record;
- `docs/HISTORY.md` as the searchable evidence archive.

Retired files are consolidated under source-labeled sections in those
destinations. Their exact pre-consolidation versions remain in Git history.
Future work appends one evidence entry to `HISTORY.md`; it must not create a new
daily log, changelog, checkpoint, transfer note, deploy trigger, or
continuation-prompt Markdown file.

### Consequences

- Routine work reads three files: the routing index, governance/current status,
  and the relevant system reference.
- Historical detail remains searchable without becoming mandatory reading.
- Stable ADR and atomic checklist numbers remain intact.
- Canonical files are longer, so contributors must search or jump to the
  relevant section rather than read every consolidated source block.
- New Markdown files require a genuinely new durable ownership boundary and an
  update to the routing index.

### Rollback

Git can restore any retired file exactly. If a consolidated document becomes
too broad, split only a durable subject boundary, retain a clear index mapping,
and record a superseding ADR; do not recreate per-session notes.

---

## ADR 0005 — Kilominx solver route vs play route

- Status: accepted
- Date: 2026-07-27
- Decision owners: Cube Labs project owner and contributing agents
- Branch: `claude/manual-solver-input-jja9t0` (unmerged at time of writing)

### Context

Every supported puzzle follows one convention: `/solver/<puzzle>` is the real
solver (scramble and/or enter your own cube, get a verified solution) and
`/play/<puzzle>` is the playable game. `/solver/3x3` renders the manual solver;
`/play/3x3` renders the game. Challenge attempts (`app/challenge/[id]`) route
every puzzle to `/solver/<puzzle>`.

The Kilominx was the exception. `/solver/kilominx` hosted the playable 3D game
(`app/KilominxGame.tsx`) and there was no `/play/kilominx`, so there was no way
to enter your own physical Kilominx, unlike the 3×3/4×4/5×5. Adding "Enter My
Cube" manual input raised the question of where the new solver lives and what
happens to the game.

### Decision

Match the established convention:

- `/solver/kilominx` renders the new `components/KilominxSolver.tsx` (scramble +
  flat-net manual entry + verified solution + net playback), mirroring the role
  `/solver/3x3` plays.
- The playable 3D game moves verbatim to `app/play/kilominx/page.tsx`;
  `app/KilominxGame.tsx` is unchanged, only re-hosted, preserving the approved
  playable experience (Constitution §2, §3).
- `/solve` hub copy for Kilominx describes the solver; the solver links to
  `/play/kilominx`.
- Challenge routing is unchanged — it already pointed Kilominx at
  `/solver/kilominx`, which is now a solver like every other puzzle, so the
  change makes challenges more consistent, not less.

### Consequences

- The Kilominx now matches the site-wide `/solver` vs `/play` split; no puzzle
  is a special case.
- A link or bookmark to `/solver/kilominx` expecting the 3D game now lands on
  the solver; the game is one tap away at `/play/kilominx`. Internal references
  (`/solve`, `app/challenge/[id]`) were updated or verified.
- No database, schema, auth, or configuration change. Rollback is a branch
  revert; the game component was never modified.

### Required follow-up

- Mobile/browser QA of both routes before production verification.
- Consider a dedicated 3D `KilominxSolverCube3D` so the solver can play the
  solution back on a 3D puzzle rather than the flat net.
  _Done on branch `claude/kilominx-solver-3d-page-wbyyay` — see ADR 0006 and the
  2026-07-28 history entry._

## ADR 0006 — Solver 3D playback is facelet-driven and may be inspected by swipe

- Status: accepted
- Date: 2026-07-28
- Decision owners: Cube Labs project owner and contributing agents
- Branch: `claude/kilominx-solver-3d-page-wbyyay` (unmerged at time of writing)

### Context

Every `/solver/<puzzle>` page follows one layout: pick a state (scramble or
enter your own cube), get a verified solution, and watch it play back. The
4×4/5×5 solvers play the solution back on a 3D cube
(`components/NxNSolverCube3D.tsx`) that starts from a geometrically solved cube
coloured by the actual facelet state, then physically animates the solution. The
Kilominx solver was the exception — it played back on the flat pentagon net
only. ADR 0005 flagged a dedicated `KilominxSolverCube3D` as follow-up.

Two questions came with building it: (1) how the 3D view stays exactly in sync
with the engine and the flat net at every step, and (2) whether a playback cube
may also be turned by hand. The controls guidance cautions against playback-style
controls on playable pages; this is the inverse — turn interaction on a playback
view — so the rule needed stating rather than assuming.

### Decision

- **Facelet-driven, engine-tracked playback, mirroring `NxNSolverCube3D`.** A
  solver's 3D playback colours pieces from the state's facelet snapshot and
  animates the verified solution; move/layer selection tracks a logical state
  seeded at `solved()` and advanced by the engine's own move application, so the
  3D view, the flat net, and the engine never disagree. Single-step changes
  animate; multi-step scrubs rebuild instantly. This is the cookie-cutter for
  every puzzle's solver playback — copy `NxNSolverCube3D` /
  `KilominxSolverCube3D`; do not invent a second state path inside the renderer.
- **Inspect-only swipe-to-turn is allowed on a solver playback cube.** Swiping a
  sticker turns that face for inspection; a "Lock rotation" toggle freezes only
  the camera (orbit + zoom), leaving swipe-to-turn active, matching the Skewb's
  Rotate-View lock. Manual turns are explicitly non-authoritative: they desync
  the cube from the solution step and the next stepper/playback change rebuilds
  to that step exactly. The engine, the verified solution, and the flat net stay
  the source of truth; a manual turn never edits solver state.

### Consequences

- The Kilominx solver now matches the 4×4/5×5 solver layout; no puzzle's solver
  is a flat-net special case.
- Future puzzle solvers have one documented 3D-playback template and one rule for
  optional manual inspection, so they stay consistent.
- Because manual turns are non-authoritative and `touch-action` must stay `none`
  for swipes to register, a locked playback cube can still be turned but the page
  does not scroll over the canvas on touch (same as the play pages).
- No database, schema, auth, or configuration change. Rollback is a branch
  revert; no engine or shared file changed.

### Required follow-up

- Real-device QA of swipe direction/orientation on the solver playback cube.
- If other solvers (Pyraminx, Skewb) adopt a 3D solution-playback panel, extract
  the shared facelet-playback shape rather than copying it a third time.
