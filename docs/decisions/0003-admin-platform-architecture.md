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
