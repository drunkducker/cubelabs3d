# Cube Labs 3D — Current Status

**Last verified:** 2026-07-27
**Canonical branch:** `main`
**Current canonical head:** `c5f7b58`
**Repository:** `drunkducker/cubelabs3d`

This document is the single current-state summary. Dated checkpoints and unmerged branches are historical or in-progress evidence and must not override this file.

## Current production baseline

- `main` is the repository default branch and the Vercel production source.
- The repository baseline includes the mobile-first homepage, interactive puzzle experiences, Supabase authentication and Cube ID, password reset, Cube Labs Mail, NxN/4×4/interim-5×5 solvers, Pyraminx, Kilominx, tracked 3×3 challenges, the shared all-puzzle Save & Friend Play panel, connected profile/social pages, News/My Arcade/Learn hubs, and the admin/ads/media/billing platform.
- `main` also includes the reconciled admin roadmap and the switchable branded coming-soon homepage controlled by `NEXT_PUBLIC_COMING_SOON`.
- Skewb is not on `main`; it is under review in draft PR #9.
- The homepage layout must not be changed unless the project owner explicitly requests it.
- Login and profile work must continue from the existing Sign In flow.

## Latest verified `main` changes — 2026-07-26

The current `main` head is `c5f7b58845079a942b4385a1af479476bb2ffbb1`.

Recent merged milestones:

- PR #4 / merge `51950a0`: Kilominx engine, renderer, solver, route, tests, and
  reusable saved-scramble UI.
- PR #6 / merge `7ce293b`: shared Save & Friend Play across supported puzzles,
  puzzle-aware challenge routing, solver memory, and exact-scramble sending.
- PR #8 / merge `859483c`: safely ported the unique admin roadmap page, model,
  navigation, and overview widget onto current `main`.
- PR #7 / merge `c5f7b58`: switchable branded coming-soon homepage while
  preserving the full application and legal routes.

Status:

- These changes are merged, but production/mobile verification and the
  database/configuration gates listed below remain open.
- The coming-soon switch is an environment setting; its actual production value
  must be checked in Vercel rather than inferred from source.
- Solver-memory and friend-play production behavior still depends on existing
  Supabase migration, account, RLS, and two-account verification gates.

## Active Skewb review — PR #9

- Pull request: [#9](https://github.com/drunkducker/cubelabs3d/pull/9),
  `feature/skewb-puzzle` → `main`.
- Remote head: `c3b5502b105aa29e74cea56231eb0f64f635b983`.
- Local verified equivalent: `15faac9e09ffcbcc74ca5d16bb8b06dac3c98eb0`.
- The publishing connector recreated the commit, but the PR records that its
  Git tree exactly matches the verified local tree.
- GitHub reports the draft PR open, mergeable, nine commits ahead, and zero
  behind `main`.
- Vercel reports success for the remote head.
- The feature now uses fourteen moving bodies, all eight corner pivots,
  continuous layer drag, a verified state-based solver, the shared 460 ms turn
  pace, and visible Save Start, Share Link, Save Result, and Send to Friend
  actions.
- Completed unassisted solves carry time, moves, undo/touch/button metrics, and
  move history into result saving and friend challenges. Auto-solved attempts
  are blocked from legitimate-result saving.
- Verification: 64/64 Vitest tests, clean TypeScript, lint exit 0 with existing
  warnings only, successful production build, and successful Vercel preview.
- Still required: hosted phone drag/direction/orientation testing, native share
  and clipboard testing, signed-in solver-memory/result saving, a two-account
  send/open/submit challenge, owner approval, and merge to `main`.

## Major July 23 merge

The July 23 promotion merged the admin platform, ads/affiliates/media/billing, connected mobile profile/social discovery/privacy queues, tracked 3×3 challenge support, scramble and solver-memory schema/API, and homepage-linked News/My Arcade/Learn hubs.

> **Deployment gates still not confirmed:** run all dated Supabase migrations in production, set required server-only variables (`SUPABASE_SERVICE_ROLE_KEY`, Stripe keys), create the private media bucket, bootstrap the owner admin row, and complete browser plus RLS verification.

## Repository history caution

The repo has two unrelated Git histories. `main` and the recent `gpt/*` and `claude/*` RootA branches share the canonical history. `drive-homepage-import`, `fix/cube-transform-stability`, and `feature/social-challenges-foundation` are RootB branches with no merge base and must only be manually ported—never directly merged.

## Branch registry

| Branch | History | Purpose | State |
| --- | --- | --- | --- |
| `main` | RootA | Canonical branch | ✅ current at `c5f7b58` |
| `feature/skewb-puzzle` | RootA | Rebuilt Skewb, solver, results, save/send | 🟡 draft PR #9 at `c3b5502`; Vercel passed; not merged |
| `claude/puzzle-gen-twisting-69clo3` | RootA | Kilominx + saved scrambles | ✔ merged through PR #4; safe to delete after production verification |
| `gpt/all-puzzle-memory-friend-play-20260726` | RootA | Shared memory and friend play | ✔ merged through PR #6; safe to delete after verification |
| `gpt/reconcile-admin-dashboard-20260726` | RootA | Reconciled admin roadmap | ✔ merged through PR #8; safe to delete after verification |
| `gpt/coming-soon-page-20260726` | RootA | Switchable coming-soon homepage | ✔ merged through PR #7; safe to delete after verification |
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
- [~] Skewb engine, fourteen-piece renderer, continuous touch turns, verified
  solver, result tracking, and save/share/send UI pass all branch checks on PR
  #9; hosted phone/account verification and merge remain
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

1. Test PR #9 on a real phone: repeated layer turns, direction, orientation
   change, Rotate View, 460 ms pace, native share/clipboard, and compact layout.
2. With two signed-in accounts, verify Skewb Save Start, Save Result, Send to
   Friend, open/submit, and the resulting Supabase rows/RLS behavior.
3. After owner approval, merge PR #9 and record the production deployment head;
   do not call Skewb production-complete before that evidence exists.
4. Verify current `main` on production, including the intended
   `NEXT_PUBLIC_COMING_SOON` setting, Kilominx, and shared Save & Friend Play.
5. Run all dated Supabase migrations and configure
   `SUPABASE_SERVICE_ROLE_KEY`, Stripe keys, and the private admin media bucket.
6. Bootstrap the owner admin account and browser/RLS-test the admin platform.
7. Browser-test profile, friends, public profiles, privacy queues, mail, and
   password reset.
8. Add correctness fixtures for 3×3, 4×4, and 5×5, then complete security
   hardening: rate limits, step-up auth, anti-cheat, reporting, and scanning.

## Status labels

- `[x]` Verified complete on `main` with required evidence.
- `[~]` Merged but not fully production/browser verified, or branch-only.
- `[ ]` Not complete.
- `[?]` Reported but not yet verified in the repository.
