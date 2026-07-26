# Cube Labs 3D — Master Roadmap

**Last updated:** 2026-07-26
**Repository audited:** `main` at `24d6a21` plus current PR/branch state

This is the canonical project checklist. Items are checked only when repository evidence and required documentation support completion.

> **Current baseline:** the July 23 main promotion includes the admin platform, ads/affiliates/media/billing, mobile profile and social discovery, privacy queues, tracked 3×3 challenge flow, scramble/solver-memory schema and API, and the homepage-linked News, My Arcade, and Learn hubs. The latest repository audit found no newer main-branch implementation commits. Items marked `[~]` are merged but still await production configuration, migrations, browser/RLS verification, or production hardening.

## Status key

- `[x]` verified complete on the canonical branch
- `[~]` merged to `main` but unverified, branch-only, or awaiting a migration/configuration step
- `[?]` reported but not yet verified against current code and tests
- `[ ]` incomplete

## Status and tracking rules

1. **`main` is the only source of truth.** Branch-only work is at most `[~]`.
2. **Every completed item needs evidence:** code, commit/PR, migration, or recorded browser/device verification.
3. **Migrations gate completion.** Database-backed features stay `[~]` until production application is recorded in `DAILY-LOG.md`.
4. **Build does not equal production verification.** A green build earns `[~]`; user-visible features require browser/device proof for `[x]`.
5. **Log every status change** in `DAILY-LOG.md` and keep `CURRENT_STATUS.md`, `PROJECT-HEALTH.md`, and `CHANGELOG.md aligned.
6. **Never merge RootB branches directly.** Port wanted work manually from `drive-homepage-import`, `fix/cube-transform-stability`, or `feature/social-challenges-foundation`.
7. **When uncertain, use the lower status.**

## Immediate TODO — release and verification order

### P0 — production activation blockers

- [ ] Confirm all dated Supabase migrations are applied in production, including the `20260722_*`, `20260723_admin_platform.sql`, `20260724_ad_rendering.sql`, and `20260725_media_and_billing.sql` migrations.
- [ ] Configure `SUPABASE_SERVICE_ROLE_KEY` as a server-only production variable.
- [ ] Create the private `admin-media` Supabase Storage bucket and verify signed previews/uploads.
- [ ] Configure Stripe secret and webhook-signing keys; verify checkout and webhook entitlement updates.
- [ ] Bootstrap the owner admin row with `public.bootstrap_owner(...)` and confirm the last-owner guard.
- [ ] Run the production RLS/security checklist in `docs/SECURITY.md` and record results.

### P1 — browser and account verification

- [ ] Test `/admin` on desktop and mobile: roles, users, media, billing, ads, exports, audit/security, and denied permissions.
- [ ] Test `/profile`, `/profile/friends`, `/u/[slug]`, `/profile/settings`, mail, password reset, privacy export, and close-account queues.
- [ ] Run a two-account friend/request/challenge test and record all resulting database rows.
- [ ] Test the tracked 3×3 save/send flow with two accounts and verify `scrambles`, `solve_results`, `scramble_attempts`, `challenges`, and `challenge_attempts` stay consistent.
- [ ] Verify homepage navigation into `/news`, `/my-arcade`, `/learn`, and `/leaderboard` on the production deployment.
- [ ] Verify AWS SES password-reset and mail delivery end to end; finish the configuration and rollback runbook.

### P2 — correctness and hardening

- [ ] Add solver correctness fixtures and regression tests for 3×3, 4×4, and 5×5.
- [ ] Wire solver pages to `/api/solver-memory` and add billing-aware limits, folders, and cross-device resume.
- [ ] Implement rate limiting and abuse controls for auth, friends, challenges, ads tracking, privacy requests, and sensitive admin endpoints.
- [ ] Add admin 2FA or step-up authentication for owner-only operations.
- [ ] Add blocking, reporting, moderation, anti-cheat, suspicious-result review, and trusted leaderboard validation.
- [ ] Add dependency/secret scanning and remediate known dependency audit findings.

## 1. Foundation

- [x] GitHub repository connected and writable
- [x] Vercel deployment foundation
- [x] IONOS domain purchased
- [x] Mobile-first site foundation
- [x] Homepage and interactive hero experience
- [x] Footer, legal-page foundation, and content carousels
- [x] Permanent documentation governance
- [x] Current status, daily log, roadmap, changelog, checkpoint archive, and project-health dashboard
- [~] News, My Arcade, and Learn hubs are merged/build-verified; content/admin wiring and browser QA remain
- [ ] First-party analytics and error reporting fully verified
- [ ] Search Console, sitemap, and SEO content program fully verified
- [ ] PWA installation flow fully verified

## 2. Authentication and Cube ID

- [x] Supabase application foundation
- [x] Login/create-account route and server actions
- [x] Profile route and solve-results API foundations
- [x] Sign In entry point connected
- [x] Homepage-matched `/auth` flow merged and build-verified
- [~] Cube ID player dashboard merged; migration and browser verification pending
- [~] Password reset merged; production delivery unverified
- [~] Cube Labs Mail merged; migration, worker/provider, and browser verification pending
- [~] Public display-name, unique-handle, profile slug, friendship, and privacy schema foundation
- [~] Account deletion and export request queue; final export/delete worker pending
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
- [x] Pyraminx engine, solver, timer, undo, scramble history, and swipe-depth behavior
- [x] Permanent cube-engine architecture and recovered-branch findings documented
- [~] 3×3 manual color entry and invalid-entry freeze fix; fixtures pending
- [x] NxN timer, solved-state detection, and scramble history
- [~] 3×3 focus play layout
- [~] 4×4 playable engine and arbitrary-state reduction solver; fixtures pending
- [~] Interim reduced-state 5×5 solver; deterministic rewrite remains WIP on `claude/more-cubelabs-yuom1x`
- [~] Solver-memory database/API; UI wiring and paid limits pending
- [ ] Complete and verify deterministic 5×5 solver
- [ ] Add 5×5 arbitrary-state manual input parity
- [ ] Define 6×6-and-larger solver strategy
- [ ] Build camera/photo/video state scanning
- [ ] Add paid solver memory, folders, limits, and cross-device resume
- [ ] Establish real-mobile performance budgets

## 4. Learn experience

- [~] Learn landing page merged/build-verified
- [ ] Beginner 3×3 guide
- [ ] Animated notation and algorithm library
- [ ] 4×4 and 5×5 reduction guides
- [ ] Pyraminx guide
- [ ] Search-focused educational pages
- [ ] Accessibility and reduced-motion review

## 5. Social and competition

- [x] Permanent social and multiplayer architecture consolidated
- [~] Cube ID/profile and connected social discovery foundation
- [~] Mobile `/leaderboard` visual prototype is merged to `main`; ranking service and production verification remain
- [~] Tracked 3×3 leaderboard/challenge prototype is merged to `main`; production verification remains
- [~] Friends search, suggestions, requests, accept/decline/remove are merged; block/report/rate limits and two-account QA remain
- [~] Signed-in account-to-account pre-scrambled challenge flow
- [~] Player-selected scramble save/send and replay metadata overrides
- [~] Daily shared scramble is wired to the homepage/prototype; production scheduling service remains
- [~] Scramble database and ranked attempt rows; trusted ranking service and browser proof remain
- [~] RootB community/challenge prototype remains in draft PR #1 and must be manually reconciled, not merged
- [ ] Versioned renderer-independent puzzle-state contract
- [ ] Secure public/guest shareable challenge links
- [ ] Solved/unsolved challenge modes and guest attempts
- [ ] Server-side challenge validation and trusted result recording
- [ ] Production daily shared-scramble service
- [ ] Personal, friends, country, monthly, and global leaderboards
- [ ] Anti-cheat and suspicious-result review
- [ ] Ghost races, private multiplayer rooms, and public matchmaking
- [ ] Reporting, blocking, and moderation

## 6. Admin portal

> The admin platform is merged and build/type/unit-test verified. All runtime features remain `[~]` until migrations, service-role configuration, owner bootstrap, browser QA, and RLS verification are recorded.

- [x] Admin portal requirements, security model, and operator guide documented
- [~] Admin authentication, role enforcement, and owner-only safeguards
- [~] User search, suspension, deletion queue, and audit trail
- [~] Test-result override tools
- [~] Leaderboard and challenge moderation screens
- [~] Ad campaign, carousel, and affiliate management
- [~] Site settings and feature flags
- [~] Security dashboard and append-only audit logs
- [~] Backup/export controls
- [~] Roles and permissions editor
- [~] Private media library with magic-byte validation
- [~] Premium billing with Stripe checkout and verified webhook code
- [~] Operator notification bell, command palette, and readiness checklist
- [ ] Carousel slide editor and affiliate activation controls
- [ ] Rate limiting and admin step-up authentication

## 7. Monetization

- [x] Ads and affiliate architecture documented
- [~] Managed ad slots, carousels, affiliate cards, disclosures, and click/impression tracking are coded and build-verified
- [ ] Choose and wire approved public placements
- [ ] Apply ad-rendering migration and browser-verify counters
- [~] Premium/no-ads plan and Stripe integration coded; production keys/webhook/browser verification pending
- [ ] Conversion tracking
- [ ] Theme or appearance packs
- [ ] Revenue reporting and compliance review

## 8. Security, quality, and operations

- [x] Security, backup/provider-migration, AI-contributor, and architecture-decision rules documented
- [x] Branch recovery and classification process established
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

- [ ] Review and close or replace draft PR #1; its RootB history cannot be merged into `main`.
- [ ] Finish or archive `claude/more-cubelabs-yuom1x` after extracting the deterministic 5×5 work.
- [ ] Delete merged/superseded RootA branches only after production verification and a final diff check.
- [ ] Keep `CURRENT_STATUS.md` branch registry synchronized after every cleanup.

## Current release gate

Before marking a feature `[x]`, confirm:

- [ ] Implementation is merged into `main`.
- [ ] Build and relevant automated tests pass.
- [ ] Required migrations and production variables are applied.
- [ ] Real-device or browser verification is recorded when applicable.
- [ ] Security/RLS behavior and denial paths are verified.
- [ ] Relevant permanent documentation, project health, daily log, and changelog are updated.
- [ ] An ADR exists for architecture, security, data ownership, provider, or major public-behavior changes.
- [ ] Rollback and known-issue notes are recorded.
