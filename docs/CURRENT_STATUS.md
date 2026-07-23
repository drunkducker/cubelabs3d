# Cube Labs 3D — Current Status

**Last verified:** 2026-07-22
**Canonical branch:** `main` (`origin/main` @ `76f244d`)
**Repository:** `drunkducker/cubelabs3d`

This document is the single current-state summary. Dated checkpoint files and unmerged branches are historical or in-progress evidence and must not override this file.

## Current production baseline

- `main` is the repository default branch and the live Vercel production deploy (`cubelabs3d.vercel.app`).
- The current site baseline includes the mobile-first homepage, interactive puzzle experiences, Supabase authentication + Cube ID, password reset, Cube Labs Mail, the NxN/4×4/interim-5×5 solvers, and permanent documentation governance.
- The homepage layout must not be changed unless the project owner explicitly requests it.
- Login and profile work must continue from the existing Sign In flow.

## Recently merged to `main` (2026-07-22)

Promoted from `claude/working-status-mumm9x` by fast-forward (`80037f1..76f244d`). Build passes (25 routes). Two feature areas were folded in:

- **Cube ID + auth** (from `gpt/cube-id-platform`): Cube ID player dashboard, password-reset flow, Cube Labs Mail, and dormant provider auth routes. The homepage-matched single-page `/auth` sign-in (from `gpt/current-site-state`) was chosen over the provider gateway; the gateway, `/auth/email`, and `/auth/provider/*` remain parked for when OAuth is enabled in Supabase.
- **Solvers** (from `claude/new-session-euaf6s`): 3×3 manual color entry, arbitrary-state 4×4 solver, interim reduced-state 5×5 solver, NxN timer/solved-state/scramble history.

> **⚠ Deployment gate not yet confirmed:** `/profile` (Cube ID) and `/profile/mail` read new tables. They require running `supabase/migrations/20260722_cube_id_platform.sql` and `supabase/migrations/20260722_cube_labs_mail_foundation.sql` in production. Until the owner confirms the migrations are run, treat those pages as merged-but-unverified.

## Repository history caution

The repo has **two unrelated Git histories**. `main` and the recent `gpt/*` / `claude/*` branches share root `01445ce`. A separate line (`drive-homepage-import`, `fix/cube-transform-stability`, `feature/social-challenges-foundation`, root `e28a424`) shares **no merge base** with `main`, is not deployed, and can only be brought in by **manual port — never `git merge`**.

## Branch registry

Keep this table current. Every active branch must have a purpose and a merge state so no work is ever lost or accidentally re-merged.

| Branch | History | Purpose | State |
| --- | --- | --- | --- |
| `main` | RootA | Canonical / live production | ✅ current |
| `claude/working-status-mumm9x` | RootA | Working/staging branch (= `main`) | active |
| `claude/home-page-html-rebuild-q7qomi` | RootA | Deployed preview branch for Learn/home HTML rebuilds, `/leaderboard`, and tracked 3x3 challenge prototype | active preview / WIP |
| `claude/more-cubelabs-yuom1x` | RootA | Deterministic 5×5 rewrite | ⛔ WIP, unmerged (tip incomplete) |
| `drive-homepage-import` | RootB | Interactive hero cube + puzzle hub | 🔀 parked — manual port only |
| `fix/cube-transform-stability` | RootB | Animated solver playback + transform fixes | 🔀 parked — manual port only |
| `feature/social-challenges-foundation` | RootB | Community hub + challenge builder (open draft PR #1) | 🔀 parked — manual port only |
| `gpt/cube-id-platform` | RootA | Cube ID / auth / Mail | ✔ merged — safe to delete |
| `gpt/current-site-state` | RootA | Homepage-matched sign-in | ✔ merged — safe to delete |
| `claude/new-session-euaf6s` | RootA | 4×4 + interim 5×5 solvers | ✔ merged — safe to delete |
| `claude/cube-engine-centering-zb2e9m` | RootA | 3×3 manual entry, NxN timer | ✔ merged — safe to delete |
| `supabase-auth-foundation` | RootA | Auth foundation | ✔ merged — safe to delete |
| `test-cube-engine` | RootA | Early engine test | ✔ merged — safe to delete |

## Verified completed work

### Platform foundation

- [x] GitHub repository connected and writable
- [x] Vercel deployment workflow established
- [x] IONOS domain purchased
- [x] Mobile-first site foundation
- [x] Homepage, footer, legal-page foundation, and content carousels
- [x] Permanent `/docs` governance structure
- [x] Current status, roadmap, daily check-ins, changelog, historical checkpoint index, and project-health dashboard

### Authentication and data

- [x] Supabase application foundation
- [x] Authentication route and server actions
- [x] Homepage-matched `/auth` sign-in / create-account (merged, build-verified) — evidence: `app/auth/page.tsx`, `components/AccountHeader.tsx`
- [x] Profile route foundation
- [x] Solve-results API foundation
- [x] Database schema for profiles and solve results
- [x] Existing Sign In button wired to authentication
- [~] Cube ID player dashboard — merged (`app/profile/page.tsx`), pending migration + browser verify
- [~] Password-reset flow — merged (`app/auth/reset/page.tsx`), production SES delivery not verified
- [~] Cube Labs Mail — merged (`app/profile/mail/page.tsx`, `app/lib/cube-labs-mail.ts`), pending migration + verify
- [ ] Confirm both `20260722_*.sql` migrations are run in production
- [ ] Fully document AWS SES production configuration and rollback procedure
- [ ] Enable and wire real Google/Apple/GitHub OAuth (gateway is parked and ready)

### Puzzle platform

- [x] Interactive hero cube
- [x] Playable 3×3 experience
- [x] 3×3 manual color entry with invalid-entry freeze fix (merged) — evidence: `components/ManualSolver.tsx`, `app/solver/3x3/page.tsx`
- [x] Larger NxN cube-engine work
- [x] NxN timer, solved-state detection, and scramble history (merged) — evidence: `app/NxNCubeGame.tsx`
- [x] Mobile viewport and high-DPI canvas fixes
- [x] Playable Pyraminx with solver and touch interaction
- [~] Arbitrary-state 4×4 solver — merged (`lib/cube4-solver.ts`, `components/FourSolver.tsx`), correctness fixtures not yet added
- [~] Interim reduced-state 5×5 solver — merged (`lib/cube5-*.ts`, `components/FiveSolver.tsx`); full deterministic path still WIP on `claude/more-cubelabs-yuom1x`
- [ ] Add solver correctness fixtures / regression suite for 3×3, 4×4, 5×5
- [ ] Build camera/photo/video cube-state scanning

### Social and operations

- [x] Initial Cube ID/profile foundation
- [x] Social and multiplayer architecture consolidated into a permanent document
- [~] Mobile leaderboard visual prototype and tracked 3x3 challenge prototype exist on `claude/home-page-html-rebuild-q7qomi` (preview/WIP; build verified, production verification pending)
- [~] Player-chosen scramble save/send and admin/test tracking overrides exist on the preview branch; public leaderboard filtering/schema still pending
- [~] Solver Memory is visible as a planned solver-hub feature; logged-in/pay-user saved-state database is not implemented
- [~] Local community and challenge prototype exists on `feature/social-challenges-foundation` (RootB — manual port only)
- [ ] Versioned renderer-independent puzzle-state contract
- [ ] Production-ready friends system
- [ ] Production-ready secure challenge links and shared scrambles
- [ ] Production-ready leaderboards
- [ ] Production-ready admin portal
- [ ] Production ad and affiliate management

## Current priorities

1. Confirm the two Supabase migrations are run and verify `/profile` + `/profile/mail` in the browser.
2. Verify password-reset + SES delivery end-to-end in production and write the runbook.
3. Add solver correctness fixtures for 3×3/4×4/5×5 before claiming any solver `[x]`.
4. Delete the six merged branches (owner action — deletion is blocked in the agent session).
5. Decide whether to port the RootB homepage/solver-playback/social work.

## Status labels

- `[x]` Verified complete on `main` (code + build, and browser/prod verification where applicable).
- `[~]` Merged to `main` but not fully verified, or branch-only.
- `[ ]` Not complete.
- `[?]` Reported in a checkpoint or conversation but not yet verified in the repository.
