# Cube Labs 3D — Current Status

**Last verified:** 2026-07-23
**Canonical branch:** `main` (updated by the 2026-07-23 admin/profile merge)
**Repository:** `drunkducker/cubelabs3d`

This document is the single current-state summary. Dated checkpoint files and unmerged branches are historical or in-progress evidence and must not override this file.

## Current production baseline

- `main` is the repository default branch and the live Vercel production deploy (`cubelabs3d.vercel.app`).
- The current site baseline includes the mobile-first homepage, interactive puzzle experiences, Supabase authentication + Cube ID, password reset, Cube Labs Mail, the NxN/4×4/interim-5×5 solvers, the tracked 3x3 challenge prototype, connected mobile profile/social pages, homepage-linked News/My Arcade/Learn hubs, the admin/ads/billing platform, and permanent documentation governance.
- The homepage layout must not be changed unless the project owner explicitly requests it.
- Login and profile work must continue from the existing Sign In flow.

## Recently merged to `main` (2026-07-23)

Merged for promotion from `claude/cubelabs-admin-dashboard-4pe35q`, `origin/gpt/mobile-profile-page-20260722`, and the local `gpt/mobile-profile-page-20260722` follow-up commits:

- **Admin platform:** `/admin` dashboard, server-side admin auth/permissions, audit/security logs, users, ads/carousels/affiliates, media, billing, exports, test-lab, leaderboards, challenges, role editor, operator shell, public ad render components, and Stripe checkout/webhook routes.
- **Profile/social:** connected mobile `/profile` and subroutes, shared profile service, friend search/suggestions/actions, public `/u/[slug]` pages, People To Challenge, challenge recipient prefill, privacy export/close-account queue controls.
- **Competition support:** mobile `/leaderboard`, `/leaderboard/3x3/play`, `/play/3x3`, `/challenge/[id]`, challenge APIs/services, reusable scramble and solver-memory schema/API.
- **Owner site hubs:** homepage-linked `/news`, `/my-arcade`, and `/learn` routes so those cards/rails no longer dead-end.

> **Deployment gates not yet confirmed:** run the dated Supabase migrations in production, set required server-only environment variables (`SUPABASE_SERVICE_ROLE_KEY`, Stripe keys, media bucket), bootstrap the owner admin row, then complete browser + RLS verification before marking admin/social/profile/billing features `[x]`.

## Earlier merge to `main` (2026-07-22)

Promoted from `claude/working-status-mumm9x` by fast-forward (`80037f1..76f244d`). Build passes (25 routes). Two feature areas were folded in:

- **Cube ID + auth** (from `gpt/cube-id-platform`): Cube ID player dashboard, password-reset flow, Cube Labs Mail, and dormant provider auth routes. The homepage-matched single-page `/auth` sign-in (from `gpt/current-site-state`) was chosen over the provider gateway; the gateway, `/auth/email`, and `/auth/provider/*` remain parked for when OAuth is enabled in Supabase.
- **Solvers** (from `claude/new-session-euaf6s`): 3×3 manual color entry, arbitrary-state 4×4 solver, interim reduced-state 5×5 solver, NxN timer/solved-state/scramble history.

> **Deployment gate not yet confirmed:** `/profile` (Cube ID), `/profile/mail`, social discovery, privacy queues, admin, ads, media, and billing all depend on the dated Supabase migrations and server-only production keys. Until the owner confirms those are run/configured and browser verified, treat those pages as merged-but-unverified.

## Repository history caution

The repo has **two unrelated Git histories**. `main` and the recent `gpt/*` / `claude/*` branches share root `01445ce`. A separate line (`drive-homepage-import`, `fix/cube-transform-stability`, `feature/social-challenges-foundation`, root `e28a424`) shares **no merge base** with `main`, is not deployed, and can only be brought in by **manual port — never `git merge`**.

## Branch registry

Keep this table current. Every active branch must have a purpose and a merge state so no work is ever lost or accidentally re-merged.

| Branch | History | Purpose | State |
| --- | --- | --- | --- |
| `main` | RootA | Canonical / live production | ✅ current |
| `claude/working-status-mumm9x` | RootA | Older staging/session-handoff branch | superseded — review before delete |
| `claude/home-page-html-rebuild-q7qomi` | RootA | Learn/home HTML rebuilds, `/leaderboard`, and tracked 3x3 challenge prototype | ✔ merged through profile/main promotion — safe to delete after verification |
| `gpt/mobile-profile-page-20260722` | RootA | Mobile profile, social discovery, privacy request queue, and homepage-linked News/My Arcade/Learn hubs | ✔ merged through main promotion — safe to delete after verification |
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
| `claude/cubelabs-admin-dashboard-4pe35q` | RootA | Admin dashboard platform (`/admin`) | ✔ merged through main promotion — migration + service-role + browser/RLS verification pending |

## Admin platform (2026-07-23)

The `/admin` administration platform is merged into the current main branch and is coded plus build/type/unit-test verified. It is **fail-closed**:
without `SUPABASE_SERVICE_ROLE_KEY` and `supabase/migrations/20260723_admin_platform.sql`
applied in production, admin routes still require an active `admin_members` row and the
UI shows "Unavailable" rather than fake data. Before any admin item goes `[x]`: apply the
migration, set the service-role key, run `select public.bootstrap_owner('…')`, and complete
browser + RLS-advisor verification (`docs/SECURITY.md`). See ADR 0003.

## Verified completed work

### Platform foundation

- [x] GitHub repository connected and writable
- [x] Vercel deployment workflow established
- [x] IONOS domain purchased
- [x] Mobile-first site foundation
- [x] Homepage, footer, legal-page foundation, and content carousels
- [x] Permanent `/docs` governance structure
- [x] Current status, roadmap, daily check-ins, changelog, historical checkpoint index, and project-health dashboard
- [~] Homepage-linked `/news`, `/my-arcade`, and `/learn` hubs are merged/build-verified; content/admin wiring and browser QA remain pending

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
- [ ] Confirm the `20260722_*.sql`, `20260723_admin_platform.sql`, `20260724_ad_rendering.sql`, and `20260725_media_and_billing.sql` migrations are run in production
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
- [~] Mobile leaderboard visual prototype and tracked 3x3 challenge prototype are merged/build-verified; production verification pending
- [~] Player-chosen scramble save/send, reusable scramble database, ranked attempt rows, and admin/test tracking columns are implemented on the preview branch and applied in Supabase; two-account browser verification is still pending
- [~] Solver Memory database and `/api/solver-memory` are implemented for signed-in saved cube states; individual solver UI auto-save and paid-tier limits are still pending
- [~] Local community and challenge prototype exists on `feature/social-challenges-foundation` (RootB — manual port only)
- [ ] Versioned renderer-independent puzzle-state contract
- [~] Production-ready friends system — first search/suggestion/request pass is merged/build-verified; block/report/rate limits and two-account QA remain
- [ ] Production-ready secure challenge links and shared scrambles
- [ ] Production-ready leaderboards
- [~] Production-ready admin portal — merged and build/unit-test verified; migration, service-role, owner bootstrap, browser QA, RLS verification, rate limits, and 2FA remain
- [~] Production ad and affiliate management — admin management and public render components merged; placement, migration, and browser verification remain

## Current priorities

1. Run all dated Supabase migrations and configure `SUPABASE_SERVICE_ROLE_KEY`, Stripe keys, and the private admin media bucket.
2. Bootstrap the owner admin account, then browser/RLS-test `/admin`, roles, media, billing, ads, exports, and permission denial.
3. Browser-test `/profile`, `/profile/friends`, `/u/[slug]`, `/profile/settings`, and the privacy export/closure queue.
4. Browser-test the new 3x3 save/send flow with two accounts and confirm `scrambles`, `solve_results`, `scramble_attempts`, `challenges`, and `challenge_attempts` rows are created together.
5. Wire solver pages to `/api/solver-memory`, then add billing-aware paid memory limits.
6. Browser-test the homepage links into `/news`, `/my-arcade`, and `/learn` once deployed.
7. Verify password-reset + SES delivery end-to-end in production and write the runbook.
8. Add solver correctness fixtures for 3×3/4×4/5×5 before claiming any solver `[x]`.

## Status labels

- `[x]` Verified complete on `main` (code + build, and browser/prod verification where applicable).
- `[~]` Merged to `main` but not fully verified, or branch-only.
- `[ ]` Not complete.
- `[?]` Reported in a checkpoint or conversation but not yet verified in the repository.
