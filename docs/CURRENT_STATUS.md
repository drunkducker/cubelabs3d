# Cube Labs 3D — Current Status

**Last verified:** 2026-07-27
**Canonical branch:** `main`
**Current canonical head:** `__MERGE_SHA__` (Skewb + documentation-reconciliation merge)
**Repository:** `drunkducker/cubelabs3d`

This document is the single current-state summary. Dated checkpoints and unmerged branches are historical or in-progress evidence and must not override this file.

## Current production baseline

- `main` is the repository default branch and the Vercel production source.
- The repository baseline includes the mobile-first homepage, interactive puzzle experiences, Supabase authentication and Cube ID, password reset, Cube Labs Mail, 2×2/3×3/4×4/interim-5×5/NxN solvers, Pyraminx, Kilominx, Skewb, tracked 3×3 challenges, the shared all-puzzle Save & Friend Play panel, connected profile/social pages, News/My Arcade/Learn hubs, and the admin/ads/media/billing platform.
- `main` also includes the reconciled admin roadmap and the switchable branded coming-soon homepage controlled by `NEXT_PUBLIC_COMING_SOON`.
- Skewb is now merged to `main` via the 2026-07-27 reconciliation merge (see below); hosted/mobile verification remains open.
- The homepage layout must not be changed unless the project owner explicitly requests it.
- Login and profile work must continue from the existing Sign In flow.

## Latest `main` change — 2026-07-27 Skewb + documentation reconciliation

Merge `__MERGE_SHA__` brought draft PR #9 (`feature/skewb-puzzle`) onto `main` and reconciled the documentation into a single canonical set:

- **Skewb** puzzle, solver route (`/solver/skewb`), engine (`lib/skewb-engine.ts`), renderer (`app/SkewbGame.tsx`), shared attempt contract (`lib/puzzle-attempt.ts`), and the extended Save/Share/Save-Result/Send-to-Friend panel are now on `main`.
- **Documentation** was consolidated from 45 Markdown files to 13 routed canonical documents, with every retired source preserved verbatim under `<!-- CONSOLIDATED SOURCE -->` markers. The two 2026-07-27 engineering documents that PR #9 predated — the software-engineering best-practices reference and the dependency-graph handbook — plus the expanded coding standards were folded into `GOVERNANCE.md` and `ARCHITECTURE.md` so no context was lost.
- `npm run docs:check` enforces the 13-file structure, 37 retired-source sections, and valid local links.
- Verification for this merge: `docs:check` OK, `tsc --noEmit` clean, `npm test` all passing, `npm run lint` exit 0 (pre-existing warnings only), `npm run build` succeeds with `/solver/skewb` prerendered.

The pre-merge `main` head before this merge was `c5f7b58845079a942b4385a1af479476bb2ffbb1`.

Recent merged milestones (all now ancestors of the current head):

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

## Skewb — merged to `main` (PR #9 reconciliation)

- Source pull request: [#9](https://github.com/drunkducker/cubelabs3d/pull/9),
  `feature/skewb-puzzle`, integrated into `main` through the 2026-07-27
  reconciliation merge rather than a direct PR merge (so the 2026-07-27
  documentation batch already on `main` was preserved).
- The feature uses fourteen moving bodies, all eight corner pivots,
  continuous layer drag, a verified state-based solver, the shared 460 ms turn
  pace, and visible Save Start, Share Link, Save Result, and Send to Friend
  actions.
- Completed unassisted solves carry time, moves, undo/touch/button metrics, and
  move history into result saving and friend challenges. Auto-solved attempts
  are blocked from legitimate-result saving.
- Verification: 64/64 Vitest tests, clean TypeScript, lint exit 0 with existing
  warnings only, successful production build, and successful Vercel preview.
- Still required (hosted verification, unchanged by the merge): phone
  drag/direction/orientation testing, native share and clipboard testing,
  signed-in solver-memory/result saving, and a two-account send/open/submit
  challenge.

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

### Documentation

- [x] All 45 pre-consolidation Markdown files were read and reconciled.
- [x] The active documentation set is consolidated to 13 routed files.
- [x] Retired source filenames and their full content remain inside the
      canonical destination documents; exact earlier files remain recoverable
      from Git.
- [x] One `HISTORY.md` evidence trail replaces separate changelog, daily log,
      checkpoint, transfer, and deployment-trigger files.

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

## Consolidated health dashboard

The former project-health document is preserved below. Keep its health matrix,
risks, and release-readiness rules synchronized with the current-state summary
above.

---

## Project health, risks, and release readiness

> Consolidated from `docs/PROJECT-HEALTH.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: docs/PROJECT-HEALTH.md -->
# Cube Labs 3D — Project Health

**Last verified:** 2026-07-27
**Canonical branch:** `main`
**Canonical head:** `c5f7b58`
**Active review:** draft Skewb PR #9 at `c3b5502`

This dashboard summarizes evidence-backed project health. Percentages are directional planning estimates, not promises or automated coverage measurements.

## Overall assessment

**Overall status:** active development with a strong interactive-puzzle and platform foundation, but several major production systems remain incomplete or unverified.

| Area | Health | Evidence-backed status |
| --- | --- | --- |
| Repository and deployment foundation | Strong | GitHub, `main`, Vercel workflow, and domain foundation exist |
| Mobile-first interface | Strong | Homepage and puzzle interaction foundation exist; protect approved layout |
| Documentation governance | Strong after consolidation | All 45 pre-consolidation Markdown files were read and reconciled; 13 routed files now hold current references, decisions, and searchable history without discarding retired source content |
| Authentication and profiles | Developing | Cube ID dashboard, password reset, Cube Labs Mail, and profile social-discovery branch work exist; migrations + SES/privacy worker + browser verification remain |
| 3×3 puzzle and solver | Developing | Playable experience + manual color entry merged; correctness fixtures must still prove arbitrary-input solves |
| 4×4 puzzle and solver | Developing | Arbitrary-state solver merged to `main`; correctness fixtures not yet added |
| 5×5 puzzle and solver | Early | Interim reduced-state solver merged; full deterministic path still WIP on `claude/more-cubelabs-yuom1x` |
| Pyraminx | Strong | Playable engine and solver with documented interaction and correctness work |
| Skewb | Developing | PR #9 has a fourteen-piece renderer, stable eight-pivot touch model, verified state solver, result save/send contract, 64 passing tests, and successful Vercel preview; phone/account QA and merge remain |
| Social challenges | Prototype | Tracked 3x3 account-to-account challenge prototype exists; secure production validation and browser proof are incomplete |
| Leaderboards and multiplayer | Prototype | Mobile `/leaderboard` visual prototype and 3x3 challenge entry exist; production ranking services are not complete |
| Scramble library and solver memory | Developing | Durable scramble, ranked attempt, and solver-memory schema/API are merged; solver UI, paid limits, and browser proof remain |
| Admin portal | Developing | Full platform and reconciled admin roadmap are merged into `main`; server-side auth, RLS migration, audit, and test isolation have code/build evidence, while migration/service-role/owner-bootstrap + browser/RLS verification remain pending |
| Ads and affiliates | Developing | Admin management + public render components (`AdSlot`/`AffiliateProductGrid`/`ManagedCarousel`) + click/impression tracking coded; needs placement on public pages + migration/browser verify |
| Monetization / billing | Developing | Premium plans + Stripe checkout + signature-verified webhook + `/admin/billing` coded; needs `STRIPE_*` keys + browser verify |
| Camera scanner | Not started/early | No verified production scanner |
| Automated testing | Developing | PR #9 passes 64 tests across nine files, including engine, renderer-transform, and payload-contract coverage; full release, browser, database, and cross-puzzle regression coverage remains incomplete |
| Security and recovery | Developing | Rules documented; production security and restore rehearsals remain |

## Directional completion

These figures reflect roadmap maturity, not lines of code:

- Platform and site foundation: **approximately 85%**
- Documentation foundation: **approximately 90%**
- Authentication and Cube ID: **approximately 65%**
- Puzzle engine foundation: **approximately 80%**
- Solver program across all intended puzzles: **approximately 40%**
- Social and competition: **approximately 25%**
- Scramble library and solver memory: **approximately 35%**
- Admin and monetization: **approximately 35%**
- Scanner and machine vision: **approximately 5%**
- Overall product vision: **approximately 45–55%**

## Highest risks

1. Merged-or-branch work may be mistaken for production-complete: `/profile`, `/profile/mail`, social discovery, and account export/closure depend on the dated Supabase migrations being run in production.
2. Solver labels may overstate what arbitrary-state input and verification actually support.
3. Authentication email delivery and recovery may work inconsistently until SES and Supabase configuration are documented and retested.
4. Social challenge prototypes currently need secure, versioned server persistence, explicit tracking columns, and validation.
5. Admin/test override data must never leak into public rankings without explicit test display mode.
6. Paid-user solver memory and account closure need server-side entitlement/privacy workers for export email delivery and final deletion/de-identification.
7. Large-cube performance needs repeatable real-phone budgets and regression checks.
8. Documentation can become stale unless every feature closes the code/test/docs/changelog loop.
9. Local and hosted commit SHAs can differ when the GitHub connector recreates
   a verified tree; confusing the local SHA with the PR head can produce false
   deployment notes.
10. Skewb's automated and preview-build evidence does not prove real-phone
    gesture direction, native share behavior, or signed-in two-account/RLS
    behavior.

## Immediate health priorities

1. Run PR #9 on a real phone through repeated turns, view rotation, orientation
   change, share/clipboard, and compact save/send layout.
2. Run the signed-in and two-account Skewb save/result/challenge/RLS flow.
3. Merge PR #9 only after owner approval and record the production deployment.
4. Verify the arbitrary-input 3×3 solver and add 3×3/4×4/5×5 fixtures.
5. Run/admin-verify the dated Supabase migrations, service-role setup, owner
   bootstrap, Stripe keys, and media bucket.
6. Verify password reset and SES delivery and write the operational runbook.
7. Add automated release checks for builds, solver fixtures, viewport behavior,
   documentation drift, and database security.

## Release readiness gates

A feature is healthy enough to mark complete only when:

- implementation is on the canonical branch;
- build and relevant tests pass;
- real-device/browser verification is recorded where needed;
- security and privacy effects are reviewed;
- permanent documentation and `HISTORY.md` are updated;
- rollback and known-issue notes exist;
- an ADR records major architectural or provider decisions.

## Update rule

Update this dashboard during major daily check-ins. Do not raise a health rating based only on conversation claims, an unmerged branch, or a visual prototype.
<!-- END CONSOLIDATED SOURCE: docs/PROJECT-HEALTH.md -->
