# Cube Labs 3D Architecture

This document defines the authoritative system boundaries. The visual companion is [DEPENDENCY-GRAPHS.md](./DEPENDENCY-GRAPHS.md). Implementation rules are in [CODING-STANDARDS.md](./CODING-STANDARDS.md), and general engineering principles are in [SOFTWARE-ENGINEERING-BEST-PRACTICES.md](./SOFTWARE-ENGINEERING-BEST-PRACTICES.md).

## Product shape

Cube Labs 3D is a mobile-first Next.js application centered on playable digital puzzles, guided solvers, learning content, Cube ID profiles, social challenges, leaderboards, managed advertising, and administration.

## Architectural layers

```text
UI pages and reusable components
        ↓
Cube Labs application services
        ↓
Provider adapters
        ↓
Supabase / PostgreSQL / storage / email / realtime
```

Visual pages must not depend directly on Supabase-specific behavior. They call application services such as:

- `getCurrentUser()`
- `getProfile()`
- `saveSolve()`
- `createChallenge()`
- `getLeaderboard()`
- `getActiveAds()`
- `deleteUser()`

Provider-specific implementations should remain isolated under a dedicated data/provider boundary. See the whole-system and import-direction graphs in [DEPENDENCY-GRAPHS.md](./DEPENDENCY-GRAPHS.md).

## Shared page systems

Public pages should use shared site layout components:

- site header;
- mobile bottom navigation;
- footer;
- managed ad slots;
- managed carousels;
- affiliate product cards;
- consistent page shells and spacing.

Admin pages use a separate protected admin layout. Page composition and required page states are mapped in [DEPENDENCY-GRAPHS.md](./DEPENDENCY-GRAPHS.md) and governed by [CODING-STANDARDS.md](./CODING-STANDARDS.md).

## Cube systems

Puzzle rendering and puzzle logic should remain separable where practical:

- engine/state model;
- move notation and serialization;
- solver integration;
- Three.js renderer;
- touch/gesture resolver;
- timers, undo, scramble history, and solve reporting.

The working 3×3 interaction is the reference experience for other cube sizes. Larger cubes require camera zoom, panning, accurate layer selection, and stable viewport positioning without changing the approved 3×3 behavior.

The canonical puzzle, puzzle-family reuse, save/resume, and renderer dependencies are mapped in [DEPENDENCY-GRAPHS.md](./DEPENDENCY-GRAPHS.md). Specialized engine truth remains in [CUBE-ENGINE.md](./CUBE-ENGINE.md), engine notes, engine implementations, and engine tests.

## Managed content

Ads and promotional content attach to pages through named placements, for example:

- `home_top_banner`
- `home_carousel`
- `solver_top_banner`
- `solver_product_carousel`
- `learn_mid_banner`
- `leaderboard_sponsor`
- `profile_promo`

Pages render shared components such as `AdSlot` and `ManagedCarousel`; campaign content is selected from the database by placement, schedule, status, and priority. See [ADS-AFFILIATES.md](./ADS-AFFILIATES.md), [ADMIN-PORTAL.md](./ADMIN-PORTAL.md), and the managed-content graph in [DEPENDENCY-GRAPHS.md](./DEPENDENCY-GRAPHS.md).

## Core data domains

The platform is expected to contain ordinary PostgreSQL tables for:

- profiles and Cube IDs;
- solves and solve statistics;
- friendships and friend requests;
- challenges and challenge attempts;
- reusable scrambles and scramble attempts;
- saved solver snapshots and cube-state memory;
- leaderboard entries and ranking snapshots;
- achievements and collections;
- notifications and activity;
- ads, campaigns, placements, slides, and affiliate products;
- admin roles and permissions;
- audit logs;
- feature flags and site settings.

Test records must include an explicit test marker and remain excluded from public rankings and production analytics by default. The solve, scramble, challenge, and leaderboard relationship is mapped in [DEPENDENCY-GRAPHS.md](./DEPENDENCY-GRAPHS.md) and specified in [SOCIAL-AND-MULTIPLAYER.md](./SOCIAL-AND-MULTIPLAYER.md).

## Authentication

Current authentication uses Supabase email/password auth with HTTP-only cookies. Recovery links must target an allowlisted production or preview reset route. Authentication provider details must remain isolated so another auth provider can be introduced later.

See [AUTHENTICATION.md](./AUTHENTICATION.md), [SECURITY.md](./SECURITY.md), [BACKUP-AND-MIGRATION.md](./BACKUP-AND-MIGRATION.md), and the authentication sequence in [DEPENDENCY-GRAPHS.md](./DEPENDENCY-GRAPHS.md).

## Admin security boundary

The browser is never trusted for privileged actions. Admin operations must:

1. validate the active session;
2. verify role and permission server-side;
3. validate request data;
4. perform the action through a protected server route or server action;
5. write an audit record;
6. return only necessary information.

### Admin platform (implemented — see ADR 0003)

The `/admin` platform implements the boundary as concrete layers:

```text
components/admin/* , app/admin/**            (UI)
        ↓
app/admin/actions/* , app/api/admin/*        (protected server actions / routes)
        ↓
lib/admin/*                                  (administration services)
        ↓
lib/admin/service-client.ts                  (service-role adapter, server-only)
        ↓
Supabase / PostgreSQL / Auth
```

- Gate: `app/admin/layout.tsx` → `requireAdmin()`; each page → `requirePermission()`;
  each action/route → `authorizeAction()`.
- Authorization store: `admin_members` (never profile/user metadata).
- Audit: append-only `admin_audit_log`, redacted before write.
- Service-role key is server-only (`SUPABASE_SERVICE_ROLE_KEY`, never `NEXT_PUBLIC_*`)
  and the layer fails closed when unconfigured.
- Migration: `supabase/migrations/20260723_admin_platform.sql`.
- Full detail in [SECURITY.md](./SECURITY.md), [ADMIN-PORTAL.md](./ADMIN-PORTAL.md), [CODING-STANDARDS.md](./CODING-STANDARDS.md), and the admin security graph in [DEPENDENCY-GRAPHS.md](./DEPENDENCY-GRAPHS.md).

## State ownership

Each kind of state must have one clear owner:

- URL state owns shareable navigation and filters;
- local React state owns transient visual interaction;
- feature controllers own coordinated UI state at the nearest common boundary;
- puzzle engines own canonical puzzle truth;
- renderers own camera, animation, selection, and viewport state only;
- application services own persisted domain operations;
- the database owns durable records.

Do not duplicate a source of truth across these layers without an explicit synchronization contract. See [DEPENDENCY-GRAPHS.md](./DEPENDENCY-GRAPHS.md) and [CODING-STANDARDS.md](./CODING-STANDARDS.md).

## Testing and architectural proof

Architecture is not proven by compilation alone. Relevant changes move through the evidence ladder defined in [CODING-STANDARDS.md](./CODING-STANDARDS.md): build, unit, static route/import, browser, integration, and production proof.

The proof dependencies are mapped in [DEPENDENCY-GRAPHS.md](./DEPENDENCY-GRAPHS.md). Evidence and unresolved risk belong in [PROJECT-HEALTH.md](./PROJECT-HEALTH.md), [DAILY-LOG.md](./DAILY-LOG.md), and applicable checkpoints.

## Structural change process

Any major restructuring requires:

- owner approval;
- an architecture decision record in `docs/decisions/`;
- an update to this document;
- an update to [DEPENDENCY-GRAPHS.md](./DEPENDENCY-GRAPHS.md);
- changelog entry;
- migration and rollback notes;
- verification that approved page layouts and cube behavior remain intact.

Generated import, route, schema, and coverage graphs may be added as evidence. Generated output describes what the code currently does; this document and [DEPENDENCY-GRAPHS.md](./DEPENDENCY-GRAPHS.md) define what the architecture permits. Any mismatch must be investigated.
