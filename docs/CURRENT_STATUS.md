# Cube Labs 3D — Current Status

**Last verified:** 2026-07-27
**Canonical branch:** `main`
**Current head:** `f97ddd8` (`docs: cross-reference dependency graph handbook`)
**Repository:** `drunkducker/cubelabs3d`

This document is the single current-state summary. Dated checkpoints and unmerged branches are historical or in-progress evidence and must not override this file.

## Current production baseline

- `main` is the repository default branch and the Vercel production source.
- The repository baseline includes the mobile-first homepage, interactive puzzle experiences, Supabase authentication and Cube ID, password reset, Cube Labs Mail, 2×2/3×3/4×4/interim-5×5/NxN solvers, Pyraminx, Kilominx, tracked 3×3 challenges, the shared cross-puzzle Save & Friend Play panel, connected profile/social pages, News/My Arcade/Learn hubs, and the admin/ads/media/billing platform (including the `/admin` roadmap widget).
- A branded coming-soon page is available and gated by the `NEXT_PUBLIC_COMING_SOON` environment variable (`app/page.tsx` → `components/ComingSoonPage.tsx`). When the variable is unset or `0`, the full homepage renders.
- The homepage layout must not be changed unless the project owner explicitly requests it.
- Login and profile work must continue from the existing Sign In flow.

## Merges since the Kilominx promotion (`51950a0` → `f97ddd8`)

The Kilominx promotion (PR #4, merge `51950a0`) is no longer the head. The following landed on `main` afterward:

- **PR #6 — all-puzzle Save & Friend Play (`gpt/all-puzzle-memory-friend-play-20260726`).** A universal Save & Friend Play panel (`components/UniversalPuzzleActions.tsx`) on every supported puzzle/solver route (3×3, 4×4, 5×5, supported NxN, Pyraminx, Kilominx). Captures visible scrambles, allows manual start-state entry, saves to `/api/solver-memory`, and sends account-to-account challenges through `/api/challenges` preserving `puzzle_type` and the exact scramble. `/challenge/[id]` is now puzzle-aware. Engines that do not yet subscribe to the shared `cube-labs:load-scramble` event still receive the official scramble visibly and on the clipboard.
- **PR #8 — admin roadmap reconciliation (`gpt/reconcile-admin-dashboard-20260726`).** Ported only the unique admin-roadmap slice from the stale admin branch onto current `main`: `lib/admin/todo.ts`, the `/admin/todo` roadmap page, the Admin Roadmap nav item, and the compact roadmap widget on `/admin`. The original branch is preserved as `backup/claude-admin-dashboard-20260726`.
- **PR #7 — switchable branded coming-soon homepage (`gpt/coming-soon-page-20260726`).** See the baseline note above.
- **Atomic master checklist.** `docs/MASTER-CHECKLIST.md` added as the numbered, one-task-at-a-time execution checklist, linked from `docs/ROADMAP.md`.
- **Documentation governance batch (2026-07-27).** Expanded `docs/CODING-STANDARDS.md`, added `docs/SOFTWARE-ENGINEERING-BEST-PRACTICES.md`, and added the cross-referenced `docs/DEPENDENCY-GRAPHS.md` handbook with index wiring.

Status:

- All of the above are merged to `main` with repository-level evidence (build/type/unit where recorded). No GitHub Actions run was captured for these merge commits.
- Production/mobile browser verification of the deployed `main` head is still required before marking the user-facing Kilominx and Save & Friend Play experiences fully verified.
- Solver-memory production behavior still depends on the existing Supabase migration/configuration gates.

## Work in progress (not on `main`)

- **PR #9 (draft) — Skewb puzzle + documentation consolidation (`feature/skewb-puzzle`).** Rebuilds Skewb rendering/play/solver/sharing and, separately, proposes a larger documentation restructure (a small routed canonical set, `MASTER-CHECKLIST.md` folded into `ROADMAP.md`, a `docs:check` gate). Unmerged draft; its base is behind the current `main` head. Do not treat its doc restructure as applied.
- **PR #1 (draft, RootB) — social challenges foundation (`feature/social-challenges-foundation`).** Community/challenge prototype on the unrelated RootB history; manual port only, never a direct merge.

## Major July 23 merge

The July 23 promotion merged the admin platform, ads/affiliates/media/billing, connected mobile profile/social discovery/privacy queues, tracked 3×3 challenge support, scramble and solver-memory schema/API, and homepage-linked News/My Arcade/Learn hubs.

> **Deployment gates still not confirmed:** run all dated Supabase migrations in production, set required server-only variables (`SUPABASE_SERVICE_ROLE_KEY`, Stripe keys), create the private media bucket, bootstrap the owner admin row, and complete browser plus RLS verification.

## Repository history caution

The repo has two unrelated Git histories. `main` and the recent `gpt/*` and `claude/*` RootA branches share the canonical history. `drive-homepage-import`, `fix/cube-transform-stability`, and `feature/social-challenges-foundation` are RootB branches with no merge base and must only be manually ported—never directly merged.

## Branch registry

The authoritative branch list is `git ls-remote --heads origin` (27 remote branches as of 2026-07-27). This registry tracks the branches that matter for the baseline, open work, and cleanup. Branches not listed here are exploratory or superseded RootA branches that carry no unique unmerged product code; confirm with a diff against `main` before deleting.

**Important:** none of the "merged — safe to delete" branches below have actually been deleted yet. They remain on the remote pending final verification and diff checks.

| Branch | History | Purpose | State |
| --- | --- | --- | --- |
| `main` | RootA | Canonical branch | ✅ current at `f97ddd8` |
| `feature/skewb-puzzle` | RootA | Skewb puzzle + proposed doc consolidation | 🚧 open draft PR #9; unmerged |
| `feature/social-challenges-foundation` | RootB | Community/challenge prototype | 🚧 open draft PR #1; manual port only |
| `claude/more-cubelabs-yuom1x` | RootA | Deterministic 5×5 rewrite | ⛔ WIP, unmerged |
| `backup/claude-admin-dashboard-20260726` | RootA | Preserved copy of the pre-reconcile admin branch | 🗄 keep as backup |
| `gpt/all-puzzle-memory-friend-play-20260726` | RootA | Save & Friend Play | ✔ merged through PR #6 |
| `gpt/coming-soon-page-20260726` | RootA | Coming-soon homepage | ✔ merged through PR #7 |
| `gpt/reconcile-admin-dashboard-20260726` | RootA | Admin roadmap slice | ✔ merged through PR #8 |
| `claude/puzzle-gen-twisting-69clo3` | RootA | Kilominx + saved scrambles | ✔ merged through PR #4 |
| `claude/home-page-html-rebuild-q7qomi` | RootA | Learn/home rebuild, leaderboard, tracked challenge | ✔ merged |
| `gpt/mobile-profile-page-20260722` | RootA | Profile/social/privacy/hubs | ✔ merged |
| `claude/cubelabs-admin-dashboard-4pe35q` | RootA | Admin platform | ✔ merged; production gates pending |
| `gpt/cube-id-platform` | RootA | Cube ID/auth/Mail | ✔ merged (PR #3) |
| `gpt/current-site-state` | RootA | Homepage-matched sign-in | ✔ merged |
| `claude/new-session-euaf6s` | RootA | 4×4 and interim 5×5 | ✔ merged |
| `claude/cube-engine-centering-zb2e9m` | RootA | 3×3 manual entry and NxN timer | ✔ merged |
| `supabase-auth-foundation` | RootA | Auth foundation | ✔ merged (PR #2) |
| `test-cube-engine` | RootA | Early engine test | ✔ merged |
| `claude/working-status-mumm9x` | RootA | Older staging/session handoff | superseded — review before delete |
| `claude/4x4-cube-solving-location-5umw3q`, `claude/admin-hardening-followup`, `claude/manual-solver-input-jja9t0`, `claude/pyrinx-bug-qot86k`, `claude/todo-list-search-qzgdwf`, `fix/pyraminx-center-pieces` | RootA | Exploratory/fix branches | ❓ verify diff vs `main` before delete |
| `drive-homepage-import` | RootB | Interactive hero cube and puzzle hub | 🔀 parked — manual port only |
| `fix/cube-transform-stability` | RootB | Solver playback and transform fixes | 🔀 parked — manual port only |

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
- [~] Shared cross-puzzle Save & Friend Play panel merged across supported routes; native scramble-load wiring and production verification remain
- [~] 2×2 (Pocket), 3×3 manual entry, 4×4 arbitrary-state solver, and interim 5×5 solver are merged; broader correctness fixtures remain
- [ ] Complete deterministic 5×5 solver
- [ ] Add 3×3/4×4/5×5 correctness fixtures and regression suite
- [ ] Build camera/photo/video state scanning

### Social and operations

- [x] Social and multiplayer architecture consolidated
- [~] Leaderboard/challenge prototypes merged; trusted ranking, anti-cheat, and production verification remain
- [~] Friends system merged; block/report/rate limits and two-account QA remain
- [~] Admin, ads, media, and billing merged and code-tested; production migration/configuration/browser/RLS verification remains

## Current priorities

1. Confirm the Vercel deployment for the current `main` head (`f97ddd8`), then browser-test Kilominx and the shared Save & Friend Play panel on mobile and desktop: rendering, swipe turns, buttons, scramble, undo, timer, solve playback, saved scramble save/load, friend-challenge send/accept, and guest sign-in behavior.
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
