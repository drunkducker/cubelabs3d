# Cube Labs 3D — Current Status

**Last verified:** 2026-07-26
**Canonical branch:** `main`
**Current head after feature merge:** `51950a0`
**Repository:** `drunkducker/cubelabs3d`

This document is the single current-state summary. Dated checkpoints and unmerged branches are historical or in-progress evidence and must not override this file.

## Current production baseline

- `main` is the repository default branch and the Vercel production source.
- The repository baseline includes the mobile-first homepage, interactive puzzle experiences, Supabase authentication and Cube ID, password reset, Cube Labs Mail, NxN/4×4/interim-5×5 solvers, Pyraminx, Kilominx, tracked 3×3 challenges, connected profile/social pages, News/My Arcade/Learn hubs, and the admin/ads/media/billing platform.
- The homepage layout must not be changed unless the project owner explicitly requests it.
- Login and profile work must continue from the existing Sign In flow.

## Latest merge to `main` — 2026-07-26

PR #4 merged `claude/puzzle-gen-twisting-69clo3` into `main` at merge commit `51950a047bb363a1e922fb099d869ea923205da4`.

Added:

- Interactive 3D Kilominx at `/solver/kilominx`.
- Dodecahedron-derived Kilominx geometry and move engine in `lib/kilominx-engine.ts`.
- Verified reduction solver using generated 3-cycles and corner twists.
- Timer, scramble, undo, swipe turns, face buttons, reset, and animated solving.
- Kilominx entry on `/solve`.
- Reusable `components/SavedScrambles.tsx` backed by `/api/solver-memory`.
- Save/load scramble support for signed-in Kilominx users.
- `tests/kilominx-engine.test.ts`, including geometry and move invariants, scramble round trips, and 50 random-scramble solver checks.

Status:

- The feature is merged to `main` and has repository-level automated test evidence from the feature branch.
- No GitHub Actions run was available for the merge commit.
- Production/mobile browser verification of the merged `main` deployment is still required before marking the user-facing Kilominx experience fully verified.
- Solver-memory production behavior still depends on the existing Supabase migration/configuration gates.

## Major July 23 merge

The July 23 promotion merged the admin platform, ads/affiliates/media/billing, connected mobile profile/social discovery/privacy queues, tracked 3×3 challenge support, scramble and solver-memory schema/API, and homepage-linked News/My Arcade/Learn hubs.

> **Deployment gates still not confirmed:** run all dated Supabase migrations in production, set required server-only variables (`SUPABASE_SERVICE_ROLE_KEY`, Stripe keys), create the private media bucket, bootstrap the owner admin row, and complete browser plus RLS verification.

## Repository history caution

The repo has two unrelated Git histories. `main` and the recent `gpt/*` and `claude/*` RootA branches share the canonical history. `drive-homepage-import`, `fix/cube-transform-stability`, and `feature/social-challenges-foundation` are RootB branches with no merge base and must only be manually ported—never directly merged.

## Branch registry

| Branch | History | Purpose | State |
| --- | --- | --- | --- |
| `main` | RootA | Canonical branch | ✅ current at `51950a0` |
| `claude/puzzle-gen-twisting-69clo3` | RootA | Kilominx + saved scrambles | ✔ merged through PR #4; safe to delete after production verification |
| `claude/more-cubelabs-yuom1x` | RootA | Deterministic 5×5 rewrite | ⛔ WIP, unmerged |
| `claude/working-status-mumm9x` | RootA | Older staging/session handoff | superseded — review before delete |
| `claude/home-page-html-rebuild-q7qomi` | RootA | Learn/home rebuild, leaderboard, tracked challenge | ✔ merged — safe to delete after verification |
| `gpt/mobile-profile-page-20260722` | RootA | Profile/social/privacy/hubs | ✔ merged — safe to delete after verification |
| `claude/cubelabs-admin-dashboard-4pe35q` | RootA | Admin platform | ✔ merged; production gates pending |
| `gpt/cube-id-platform` | RootA | Cube ID/auth/Mail | ✔ merged — safe to delete |
| `gpt/current-site-state` | RootA | Homepage-matched sign-in | ✔ merged — safe to delete |
| `claude/new-session-euaf6s` | RootA | 4×4 and interim 5×5 | ✔ merged — safe to delete |
| `claude/cube-engine-centering-zb2e9m` | RootA | 3×3 manual entry and NxN timer | ✔ merged — safe to delete |
| `supabase-auth-foundation` | RootA | Auth foundation | ✔ merged — safe to delete |
| `test-cube-engine` | RootA | Early engine test | ✔ merged — safe to delete |
| `drive-homepage-import` | RootB | Interactive hero cube and puzzle hub | 🔀 parked — manual port only |
| `fix/cube-transform-stability` | RootB | Solver playback and transform fixes | 🔀 parked — manual port only |
| `feature/social-challenges-foundation` | RootB | Community/challenge prototype, draft PR #1 | 🔀 parked — manual port only |

## Verified completed work

### Platform foundation

- [x] GitHub repository connected and writable
- [x] Vercel deployment workflow established
- [x] IONOS domain purchased
- [x] Mobile-first site foundation
- [x] Homepage, footer, legal foundation, and content carousels
- [x] Permanent documentation governance
- [~] News, My Arcade, and Learn hubs merged/build-verified; content wiring and browser QA remain

### Authentication and data

- [x] Supabase application and authentication foundations
- [x] Homepage-matched `/auth` flow
- [x] Profile and solve-results API foundations
- [~] Cube ID dashboard, Cube Labs Mail, password reset, social discovery, and privacy queues merged; production migration/browser/email verification remains
- [~] Solver Memory database and `/api/solver-memory` merged; Kilominx now provides the first reusable save/load UI, while wider solver wiring and paid limits remain
- [ ] Confirm all dated production migrations
- [ ] Finish AWS SES configuration and rollback runbook
- [ ] Enable real Google, Apple, and GitHub OAuth

### Puzzle platform

- [x] Interactive hero cube
- [x] Playable 3×3 and reusable NxN engine work
- [x] NxN timer, solved detection, and scramble history
- [x] Mobile viewport and high-DPI fixes
- [x] Playable Pyraminx with solver and touch interaction
- [~] Kilominx engine, interactive 3D puzzle, verified reduction solver, tests, and saved-scramble UI are merged; production mobile/browser QA remains
- [~] 3×3 manual entry, 4×4 arbitrary-state solver, and interim 5×5 solver are merged; broader correctness fixtures remain
- [ ] Complete deterministic 5×5 solver
- [ ] Add 3×3/4×4/5×5 correctness fixtures and regression suite
- [ ] Build camera/photo/video state scanning

### Social and operations

- [x] Social and multiplayer architecture consolidated
- [~] Leaderboard/challenge prototypes merged; trusted ranking, anti-cheat, and production verification remain
- [~] Friends system merged; block/report/rate limits and two-account QA remain
- [~] Admin, ads, media, and billing merged and code-tested; production migration/configuration/browser/RLS verification remains

## Current priorities

1. Confirm the Vercel deployment for merge commit `51950a0`, then test Kilominx on mobile and desktop: rendering, swipe turns, buttons, scramble, undo, timer, solve playback, saved scramble save/load, and guest sign-in behavior.
2. Run all dated Supabase migrations and configure `SUPABASE_SERVICE_ROLE_KEY`, Stripe keys, and the private admin media bucket.
3. Bootstrap the owner admin account and browser/RLS-test the admin platform.
4. Browser-test profile, friends, public profiles, privacy queues, mail, and password reset.
5. Run two-account challenge and scramble persistence verification.
6. Expand `SavedScrambles` to other compatible solver pages and add billing-aware memory limits.
7. Add correctness fixtures for 3×3, 4×4, and 5×5.
8. Complete security hardening: rate limits, admin step-up authentication, anti-cheat, reporting, dependency and secret scanning.

## Status labels

- `[x]` Verified complete on `main` with required evidence.
- `[~]` Merged but not fully production/browser verified, or branch-only.
- `[ ]` Not complete.
- `[?]` Reported but not yet verified in the repository.
