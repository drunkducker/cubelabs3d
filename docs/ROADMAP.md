# Cube Labs 3D — Master Roadmap

**Last updated:** 2026-07-26
**Repository audited:** `main` after the all-puzzle Save & Friend Play merge

This is the high-level roadmap. Use **[`MASTER-CHECKLIST.md`](./MASTER-CHECKLIST.md)** as the numbered, one-task-at-a-time execution checklist. Items are checked only when repository evidence and required documentation support completion.

> **Current baseline:** `main` includes the admin platform, profile/social systems, tracked challenges, scramble and solver-memory infrastructure, News/My Arcade/Learn hubs, Kilominx, and the shared Save & Friend Play panel across supported puzzle routes. Items marked `[~]` are merged but still await production configuration, deployment, browser/RLS verification, native engine wiring, or deeper hardening.

## Status key

- `[x]` verified complete on the canonical branch
- `[~]` merged to `main` but unverified, branch-only, or awaiting migration/configuration
- `[?]` reported but not yet verified against current code and tests
- `[ ]` incomplete

## Status and tracking rules

1. `main` is the only source of truth.
2. Every completed item needs code, commit/PR, migration, test, or browser/device evidence.
3. Database-backed features remain `[~]` until production migrations are recorded.
4. Build and unit tests do not replace browser/device verification.
5. Keep `CURRENT_STATUS.md`, this roadmap, `MASTER-CHECKLIST.md`, project-health notes, changelog, and dated checkpoints aligned.
6. Never directly merge RootB branches; port wanted work manually.
7. When uncertain, use the lower status.

## Immediate TODO — release and verification order

### P0 — production activation blockers

- [ ] Confirm all dated Supabase migrations are applied in production, including `20260722_*`, `20260723_admin_platform.sql`, `20260724_ad_rendering.sql`, and `20260725_media_and_billing.sql`.
- [ ] Configure `SUPABASE_SERVICE_ROLE_KEY` as a server-only production variable.
- [ ] Create and verify the private `admin-media` bucket.
- [ ] Configure Stripe secret and webhook-signing keys and verify entitlement updates.
- [ ] Bootstrap the Owner admin row and confirm the last-owner guard.
- [ ] Run the production RLS/security checklist.
- [ ] Complete legal identity, final policies, cookie consent, age screening, moderation, and accessibility launch blockers listed in `MASTER-CHECKLIST.md`.

### P1 — browser and account verification

- [ ] Verify the latest Vercel production deployment.
- [ ] Test Kilominx on mobile and desktop: rendering, swipe turns, face buttons, scramble, undo, timer, reset, solver playback, and resize/orientation behavior.
- [ ] Test shared Save & Friend Play across 3×3, 4×4, 5×5, NxN, Pyraminx, and Kilominx.
- [ ] Add native automatic scramble loading to every puzzle engine.
- [ ] Test `/admin` on desktop and mobile, including denial paths.
- [ ] Test profile, friends, public profiles, settings, mail, password reset, privacy export, and account closure queues.
- [ ] Run two-account friend/request/challenge verification and record resulting rows.
- [ ] Verify homepage navigation into News, My Arcade, Learn, Leaderboard, and Solve routes.
- [ ] Verify AWS SES delivery end to end and finish the rollback runbook.

### P2 — correctness and hardening

- [ ] Add solver correctness fixtures and regression tests for 3×3, 4×4, and 5×5.
- [ ] Add billing-aware solver-memory limits, folders, and cross-device resume.
- [ ] Implement rate limiting and abuse controls.
- [ ] Add admin 2FA or step-up authentication.
- [ ] Add blocking, reporting, moderation, anti-cheat, suspicious-result review, and trusted ranking validation.
- [ ] Add dependency/secret scanning and remediate known findings.

## 1. Foundation

- [x] GitHub repository connected and writable
- [x] Vercel deployment foundation
- [x] IONOS domain purchased
- [x] Mobile-first site foundation
- [x] Homepage and interactive hero experience
- [x] Footer, legal foundation, and content carousels
- [x] Permanent documentation governance
- [~] News, My Arcade, and Learn hubs merged/build-verified; content wiring and browser QA remain
- [ ] First-party analytics and error reporting fully verified
- [ ] Search Console, sitemap, and SEO content program fully verified
- [ ] PWA installation flow fully verified

## 2. Authentication and Cube ID

- [x] Supabase application foundation
- [x] Login/create-account route and server actions
- [x] Profile and solve-results API foundations
- [x] Sign In entry point connected
- [x] Homepage-matched `/auth` flow merged
- [~] Cube ID dashboard, password reset, Cube Labs Mail, social discovery, and privacy queues merged; production verification remains
- [~] Public display-name, unique-handle, profile slug, friendship, and privacy schema foundation
- [ ] Complete production migration verification
- [ ] Finish email configuration, recovery, and rollback runbook
- [ ] Enable real Google, Apple, and GitHub OAuth
- [ ] Avatar upload, moderation, and abuse handling
- [ ] Provider-migration test

## 3. Puzzle engine and solvers

- [x] Interactive hero cube
- [x] Playable 3×3 experience
- [x] Reusable NxN cube work
- [x] Larger-cube interaction, viewport, zoom, high-DPI, and performance improvements
- [x] Pyraminx engine, solver, timer, undo, scramble history, and swipe behavior
- [x] Permanent cube-engine architecture documented
- [~] Kilominx interactive 3D puzzle and verified reduction solver merged; production mobile/browser QA remains
- [x] Kilominx engine regression tests include geometry/move invariants, scramble round trips, and random-scramble solves
- [~] Kilominx manual "Enter My Cube" solver on a flat pentagon net (facelet↔state mapping, legality check, net playback); coded + build/test-verified on `claude/manual-solver-input-jja9t0`, unmerged, mobile/browser QA remains. Route split: `/solver/kilominx` = solver, `/play/kilominx` = game (ADR 0004)
- [~] Shared Save & Friend Play panel merged across supported puzzle routes; native load wiring and production verification remain
- [~] 3×3 manual color entry and freeze fix; broader fixtures pending
- [x] NxN timer, solved-state detection, and scramble history
- [~] 3×3 focus play layout
- [~] 4×4 playable engine and arbitrary-state solver; fixtures pending
- [~] Interim reduced-state 5×5 solver; deterministic rewrite remains WIP
- [~] Solver-memory database/API and cross-puzzle UI foundation
- [ ] Complete and verify deterministic 5×5 solver
- [ ] Add 5×5 arbitrary-state manual input parity
- [ ] Define 6×6-and-larger solver strategy
- [ ] Build camera/photo/video state scanning
- [ ] Add paid solver-memory features
- [ ] Establish real-mobile performance budgets

## 4. Learn experience

- [~] Learn landing page merged/build-verified
- [ ] Beginner 3×3 guide
- [ ] Animated notation and algorithm library
- [ ] 4×4 and 5×5 reduction guides
- [ ] Pyraminx guide
- [ ] Kilominx guide and notation reference
- [ ] Search-focused educational pages
- [ ] Accessibility and reduced-motion review

## 5. Social and competition

- [x] Permanent social and multiplayer architecture consolidated
- [~] Cube ID/profile and connected social-discovery foundation
- [~] Mobile leaderboard and tracked 3×3 challenge prototypes merged; production ranking/verification remain
- [~] Friends search, suggestions, and request actions merged; block/report/rate limits and QA remain
- [~] Signed-in account-to-account challenge flow now routes supported puzzle types
- [~] Player-selected scramble save/send and replay metadata
- [~] Daily shared scramble wired to the prototype; production scheduling remains
- [~] Scramble database and ranked attempt rows; trusted ranking service remains
- [~] RootB community/challenge prototype remains in draft PR #1 and must be manually reconciled
- [ ] Versioned renderer-independent puzzle-state contract
- [ ] Secure public/guest challenge links
- [ ] Server-side challenge validation and trusted recording
- [ ] Production daily shared-scramble service for every supported puzzle
- [ ] Personal, friends, country, monthly, and global leaderboards for every supported puzzle/size
- [ ] Anti-cheat, reporting, blocking, and moderation
- [ ] Ghost races, private rooms, and public matchmaking

## 6. Admin portal

- [x] Admin requirements, security model, and operator guide documented
- [~] Admin authentication, roles, users, test tools, moderation, ads, settings, logs, exports, media, billing, and operator UX merged; production gates remain
- [ ] Carousel slide editor and affiliate activation controls
- [ ] Rate limiting and admin step-up authentication
- [ ] Privacy, copyright, billing-refund, consent, and anti-cheat case-management tools

## 7. Monetization

- [x] Ads and affiliate architecture documented
- [~] Managed ad slots, carousels, affiliate cards, disclosures, and tracking coded
- [ ] Choose and wire approved public placements
- [ ] Apply ad-rendering migration and browser-verify counters
- [~] Premium/no-ads plan and Stripe integration coded; production verification pending
- [ ] Finalize pricing, annual discount, trial, refund, tax, and paywall decisions
- [ ] Build pricing and billing-management pages
- [ ] Conversion tracking
- [ ] Theme or appearance packs
- [ ] Revenue reporting and compliance review

## 8. Security, legal, quality, and operations

- [x] Security, backup/provider migration, AI contributor, and ADR rules documented
- [x] Branch recovery and classification process established
- [ ] Finalize legal operator and launch policies
- [ ] Implement cookie consent, privacy choices, and production cookie inventory
- [ ] Implement age screening and parent-request handling
- [ ] Complete automated test suite
- [ ] Production security review
- [ ] Row-level-security verification
- [ ] Rate limiting and abuse controls
- [ ] Disaster-recovery rehearsal
- [ ] Database export and restore rehearsal
- [ ] Dependency and secret scanning
- [ ] Dependency audit remediation
- [ ] Accessibility audit
- [ ] Cross-device release checklist

## Branch and PR cleanup

- [x] Merge Kilominx branch through PR #4
- [x] Merge shared Save & Friend Play work through PR #6
- [ ] Delete merged feature branches only after production verification and final diff checks
- [ ] Review and close or replace draft PR #1; RootB cannot be merged directly
- [ ] Finish or archive `claude/more-cubelabs-yuom1x` after extracting deterministic 5×5 work
- [ ] Delete other merged/superseded RootA branches after verification
- [ ] Keep the branch registry synchronized

## Current release gate

Before marking a feature `[x]`, confirm:

- [ ] Implementation is merged into `main`.
- [ ] Build and relevant tests pass.
- [ ] Required migrations and production variables are applied.
- [ ] Real-device or browser verification is recorded.
- [ ] Security/RLS behavior and denial paths are verified.
- [ ] Legal, privacy, accessibility, billing, and moderation implications are addressed.
- [ ] Permanent documentation and rollback notes are updated.
