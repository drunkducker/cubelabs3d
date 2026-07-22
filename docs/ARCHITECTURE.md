# Cube Labs 3D Architecture

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

Provider-specific implementations should remain isolated under a dedicated data/provider boundary.

## Shared page systems

Public pages should use shared site layout components:

- site header;
- mobile bottom navigation;
- footer;
- managed ad slots;
- managed carousels;
- affiliate product cards;
- consistent page shells and spacing.

Admin pages use a separate protected admin layout.

## Cube systems

Puzzle rendering and puzzle logic should remain separable where practical:

- engine/state model;
- move notation and serialization;
- solver integration;
- Three.js renderer;
- touch/gesture resolver;
- timers, undo, scramble history, and solve reporting.

The working 3×3 interaction is the reference experience for other cube sizes. Larger cubes require camera zoom, panning, accurate layer selection, and stable viewport positioning without changing the approved 3×3 behavior.

## Managed content

Ads and promotional content attach to pages through named placements, for example:

- `home_top_banner`
- `home_carousel`
- `solver_top_banner`
- `solver_product_carousel`
- `learn_mid_banner`
- `leaderboard_sponsor`
- `profile_promo`

Pages render shared components such as `AdSlot` and `ManagedCarousel`; campaign content is selected from the database by placement, schedule, status, and priority.

## Core data domains

The platform is expected to contain ordinary PostgreSQL tables for:

- profiles and Cube IDs;
- solves and solve statistics;
- friendships and friend requests;
- challenges and challenge attempts;
- leaderboard entries and ranking snapshots;
- achievements and collections;
- notifications and activity;
- ads, campaigns, placements, slides, and affiliate products;
- admin roles and permissions;
- audit logs;
- feature flags and site settings.

Test records must include an explicit test marker and remain excluded from public rankings and production analytics by default.

## Authentication

Current authentication uses Supabase email/password auth with HTTP-only cookies. Recovery links must target an allowlisted production or preview reset route. Authentication provider details must remain isolated so another auth provider can be introduced later.

## Admin security boundary

The browser is never trusted for privileged actions. Admin operations must:

1. validate the active session;
2. verify role and permission server-side;
3. validate request data;
4. perform the action through a protected server route or server action;
5. write an audit record;
6. return only necessary information.

## Structural change process

Any major restructuring requires:

- owner approval;
- an architecture decision record in `docs/decisions/`;
- an update to this document;
- changelog entry;
- migration and rollback notes;
- verification that approved page layouts and cube behavior remain intact.