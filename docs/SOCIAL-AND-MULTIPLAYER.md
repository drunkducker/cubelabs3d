# Cube Labs 3D — Social and Multiplayer

**Last reviewed:** 2026-07-22
**Canonical status:** architecture and prototype work exist; production integration is incomplete.

This document consolidates the two overlapping social checklists recovered from `feature/social-challenges-foundation`. It is the permanent source of truth for Cube ID social features, asynchronous challenges, leaderboards, live multiplayer, safety, and rollout order.

## Product goal

A player can create a cube challenge from an exact puzzle state, share it with another person, compare results, rematch, build a public identity, and later compete in leaderboards or live matches. Core solving must remain available to guests without a forced login.

## Verified prototype work on the feature branch

The following work exists on `feature/social-challenges-foundation`, but is not considered production-complete until reconciled with and merged into `main`:

- [x] Renderer-independent challenge, attempt, profile, and leaderboard types.
- [x] Responsive `/community` prototype.
- [x] Local challenge creation route.
- [x] Dynamic challenge acceptance and rematch route.
- [x] Browser persistence for prototype challenges.
- [x] Community calls-to-action connected to the local challenge builder.
- [ ] Production build and lint verification recorded for the branch.
- [ ] Safe integration with the canonical homepage and current cube engines.

## Current leaderboard UI prototype

- [~] A mobile-first `/leaderboard` visual prototype exists on `claude/home-page-html-rebuild-q7qomi`.
- [~] The prototype uses a shared Next app bottom navigation component and a provider-isolated preview data module.
- [~] A build-verified tracked 3x3 leaderboard challenge prototype exists at `/leaderboard/3x3/play`.
- [~] `/play/3x3`, `/challenge/[id]`, and `/profile/challenges` now provide a first usable send/receive path for signed-in accounts.
- [~] The challenge prototype records elapsed time, move count, touch/button move counts, undo use, replay metadata, and manual test/admin time overrides.
- [ ] Replace preview/test rows with a production `getLeaderboard()` application service.
- [ ] Exclude admin/test data from public rankings by default.
- [ ] Separate assisted and unassisted results before public ranking.
- [ ] Add suspicious-result review, admin correction, and audit logging before trusting public results.

## Release 1 — Asynchronous challenges

### Cube-state integration

- [ ] Define a versioned serialized puzzle-state contract.
- [ ] Store puzzle type, cube size, exact state, scramble, rule settings, and schema version.
- [ ] Separate setup/scramble history from player move history.
- [~] Capture elapsed time, move count, solved status, undo use, and touch/button control type in the 3x3 prototype replay metadata.
- [ ] Promote tracking fields such as test data, assistance flags, validation status, recipient time, and device/control type to explicit schema columns before production rankings.
- [ ] Capture hint use, solver use, device class, and full renderer-independent puzzle state.
- [ ] Add a Create Challenge action to supported playable puzzle controls.
- [~] Load an official 3x3 scramble from `/leaderboard/3x3/play` and `/challenge/[id]`.
- [ ] Lock the official starting state and validate it server-side when an attempt begins.
- [ ] Validate submitted results server-side.

### Sharing and attempts

- [ ] Generate non-enumerable server-created challenge IDs.
- [~] Provide signed-in `/challenge/[id]` routes for direct account challenges.
- [ ] Allow guest attempts without registration.
- [~] Add first send-to-account action from the tracked 3x3 challenge page using exact Cube Tag / username / public slug lookup.
- [ ] Add copy-link, native share, QR, email, and text-message actions.
- [~] Add sender target time to the recipient challenge page.
- [ ] Add full sender/recipient comparison, including recipient time and move-count display from stored solve rows.
- [ ] Add rematch flow.
- [ ] Add expiration, privacy, deletion, and abuse controls.

## Accounts and Cube ID

- [~] Email authentication foundation.
- [~] Cube ID/profile database foundation.
- [ ] Preserve guest attempts when an account is created.
- [ ] Fully implement public display name plus unique private handle/tag rules.
- [ ] Add built-in and uploaded avatars with moderation.
- [ ] Add public, friends-only, and private profile settings.
- [ ] Add puzzle-specific statistics, streaks, achievements, and activity history.
- [ ] Add account deletion and data export.

## Friends and safety

- [ ] Friend requests, accept, decline, remove, block, and report.
- [ ] Direct friend challenges.
- [ ] Notification preferences.
- [ ] Username, avatar, and challenge-message moderation.
- [ ] Rate limits for invitations, friend requests, challenge creation, and email delivery.
- [ ] Privacy defaults suitable for younger users.
- [ ] Prevent challenge-link enumeration and unauthorized state access.

## Leaderboards

- [ ] Challenge-specific leaderboards.
- [ ] Friends, daily, weekly, monthly, seasonal, and all-time filters.
- [ ] Separate puzzle types and cube sizes.
- [ ] Separate assisted and unassisted results.
- [ ] Record undo, hint, solver, practice, and control-type flags.
- [ ] Fastest-time and fewest-moves categories.
- [ ] Official daily scrambles.
- [ ] Suspicious-result detection, review, correction, and audit logging.

## Release 2 — Live private matches

- [ ] Private room codes and lobby readiness.
- [ ] Server-authoritative shared scramble and synchronized countdown.
- [ ] Opponent progress without revealing exact moves.
- [ ] Disconnect, reconnect, forfeit, timeout, and tie rules.
- [ ] Match result and replay storage.

## Release 3 — Public competition

- [ ] Casual and ranked matchmaking.
- [ ] Skill rating by puzzle type and cube size.
- [ ] Match by rating, puzzle, assistance rules, and control type.
- [ ] Seasons and rewards.
- [ ] Clubs, groups, tournaments, and private events.

## Data and service boundaries

- The cube renderer must not own network persistence.
- Puzzle state must be versioned and renderer-independent.
- Challenge creation and result acceptance must use server-side validation.
- Public leaderboard rows must never expose private profile or authentication data.
- Admin corrections must be auditable and must not silently overwrite original attempt records.
- Guest play remains supported; accounts unlock synchronization, friends, rankings, and history.

## First usable milestone

A player can open a supported puzzle, create a challenge from the exact current state, share a secure link, and let a friend attempt that identical state as a guest. Both players can see solve status, time, move count, assistance flags, and a rematch action.

## Recovery note

Consolidated from:

- `docs/MULTIPLAYER-SOCIAL-CHECKLIST.md`
- `docs/SOCIAL-MULTIPLAYER-CHECKLIST.md`
- Branch: `feature/social-challenges-foundation`

The original branch files remain historical evidence. This permanent document supersedes them for future planning.
