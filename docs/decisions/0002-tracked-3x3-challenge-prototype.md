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

The existing `challenges` table does not yet include explicit top-level columns for recipient time, test-data markers, assistance flags, validation status, or anti-cheat review.

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

Do not treat these prototype records as production leaderboard truth.

## Required production follow-up

Before public rankings rely on this flow:

- add explicit schema columns for test data, assistance flags, validation state, sender/recipient move counts, and recipient time or a durable result summary;
- add explicit schema for reusable scrambles and scramble attempts so player-created scrambles can be ranked independently from player leaderboards;
- add explicit solver-memory schema for logged-in and paid users, including saved cube states, solutions, resume points, retention tier, privacy, export, and deletion;
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
- Custom scrambles are currently stored as challenge/solve strings, not reusable ranked scramble-library records.
- Solver memory is visible as a planned solver-hub feature, but the actual saved-state database and paid-user retention behavior are not implemented yet.
- Recipient lookup is exact Cube Tag / username / public slug only.
- Guest challenge attempts, public share links, email/text sends, and anti-cheat are not complete.
- Production Supabase migrations must be run before the challenge table exists in production.

## Rollback

Remove the prototype routes/API/service/shared constants, revert the `NxNCubeGame` challenge-mode changes, restore the homepage and leaderboard CTA links, and remove this ADR plus matching changelog/social/roadmap entries.
