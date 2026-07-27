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
