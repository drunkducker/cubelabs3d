# Cube Labs 3D — Master Roadmap

**Last updated:** 2026-07-22

This is the canonical project checklist. Items are checked only when repository evidence and required documentation support completion.

> **Latest merge (2026-07-22):** `main` was fast-forwarded to `76f244d`, folding in Cube ID / password reset / Cube Labs Mail (from `gpt/cube-id-platform`), the homepage-matched `/auth` sign-in (from `gpt/current-site-state`), and the 4×4 + interim-5×5 + 3×3-manual-entry solvers (from `claude/new-session-euaf6s`). Build passes. Items below marked `[~]` are merged but await production verification and/or the two Supabase migrations. See `CURRENT_STATUS.md` for the branch registry and `CHANGELOG.md` for details.

## Status key

- `[x]` verified complete on the canonical branch
- `[~]` merged to `main` but unverified, branch-only, or awaiting a migration
- `[?]` reported but not yet verified against current code and tests
- `[ ]` incomplete

## Status & tracking rules

These rules keep this list trustworthy. Read them before checking any box.

1. **`main` is the only source of truth.** An item is `[x]` only when it is on `main` **and** verified. Work living on any other branch is at most `[~]`, and must name the branch.
2. **Every checked item names its evidence** — a file/route, a commit/PR, a migration, or a recorded browser/device test. No evidence → not checked.
3. **Migrations gate the checkbox.** A feature needing a SQL migration stays `[~]` until the migration is confirmed run in production and recorded in `DAILY-LOG.md`.
4. **Build ≠ verified.** A green build earns `[~]`, not `[x]`. `[x]` needs the real behavior confirmed (browser/device) where a user can see it.
5. **Log every status change** in `DAILY-LOG.md` as one line: item, old→new status, commit/PR, date.
6. **Keep the branch registry current** (in `CURRENT_STATUS.md`): every active branch has a purpose and a merge state, so nothing is lost or accidentally re-merged.
7. **Never `git merge` a RootB branch** (`drive-homepage-import`, `fix/cube-transform-stability`, `feature/social-challenges-foundation`) — no shared history. Port wanted work by hand.
8. **When in doubt, mark it lower.** Honest `[~]`/`[ ]` beats an optimistic `[x]` (Constitution §12).
9. **Reconcile on sight.** If code and these docs disagree, fix it the same session — neither may stay silently stale (docs `README` §Structure enforcement).

## 1. Foundation

- [x] GitHub repository connected
- [x] Vercel deployment foundation
- [x] IONOS domain purchased
- [x] Mobile-first site foundation
- [x] Homepage and interactive hero experience
- [x] Footer and lower-page content structure
- [x] Legal-page foundation
- [x] Permanent documentation governance
- [x] Current status, daily log, roadmap, changelog, checkpoint archive, and project-health dashboard
- [ ] First-party analytics and error reporting fully verified
- [ ] Search Console, sitemap, and SEO content program fully verified
- [ ] PWA installation flow fully verified

## 2. Authentication and Cube ID

- [x] Supabase application foundation
- [x] Login/create-account route
- [x] Profile route foundation
- [x] Profiles database schema
- [x] Solve-results API foundation
- [x] Sign In entry point connected
- [x] Homepage-matched `/auth` sign-in / create-account (merged; `app/auth/page.tsx`)
- [~] Cube ID player dashboard (merged; `app/profile/page.tsx`; needs migration + browser verify)
- [~] Password reset flow (merged; `app/auth/reset/page.tsx`; production delivery unverified)
- [~] Cube Labs Mail (merged; `app/profile/mail/page.tsx`; needs migration + verify)
- [~] AWS SES email delivery (wired; production delivery unverified)
- [ ] Confirm `20260722_cube_id_platform.sql` + `20260722_cube_labs_mail_foundation.sql` run in production
- [ ] Email configuration runbook and recovery procedure
- [ ] Enable and wire real Google/Apple/GitHub OAuth (gateway parked at `/auth/provider/*`)
- [ ] Avatar upload and moderation
- [~] Public display-name and unique-handle database foundation (migrated schema)
- [ ] Public display-name and unique-handle rules fully implemented and verified
- [ ] Account deletion and export workflow
- [ ] Provider-migration test

## 3. Puzzle engine and solvers

- [x] Interactive hero cube
- [x] Playable 3×3 cube experience
- [x] Reusable NxN cube work
- [x] Larger-cube interaction, viewport, zoom, and performance improvements
- [x] High-DPI mobile canvas fix
- [x] Pyraminx engine, solver, timer, undo, scramble history, and swipe-depth behavior
- [x] Permanent cube-engine architecture and recovered branch findings documented
- [~] 3×3 manual color entry with invalid-entry freeze fix (merged; `components/ManualSolver.tsx`; correctness fixtures pending)
- [x] NxN timer, solved-state detection, and scramble history (merged; `app/NxNCubeGame.tsx`)
- [~] 4×4 playable engine (merged)
- [~] Arbitrary-state 4×4 reduction/edge-pairing solver (merged; `lib/cube4-solver.ts`; fixtures pending)
- [~] Interim reduced-state 5×5 solver (merged; `lib/cube5-*.ts`; full deterministic path still WIP on `claude/more-cubelabs-yuom1x`)
- [ ] Complete and verify deterministic 5×5 solver (finish `claude/more-cubelabs-yuom1x`)
- [ ] 5×5 arbitrary-state manual input parity with the 3×3 workflow
- [ ] 6×6 and larger solver strategy
- [ ] Camera/photo/video state scanner
- [ ] Solver correctness fixtures and regression suite (3×3, 4×4, 5×5)
- [ ] Performance budgets for large cubes on real mobile devices

## 4. Learn experience

- [ ] Learn landing page
- [ ] Beginner 3×3 guide
- [ ] Animated notation and algorithm library
- [ ] 4×4 and 5×5 reduction guides
- [ ] Pyraminx guide
- [ ] Search-focused educational pages
- [ ] Accessibility and reduced-motion review

## 5. Social and competition

- [x] Permanent social and multiplayer architecture consolidated
- [~] Cube ID/profile foundation
- [~] Local social challenge prototype on `feature/social-challenges-foundation`
- [~] Community, create-challenge, challenge-attempt, rematch, and browser-persistence prototype
- [ ] Reconcile the prototype branch with current `main`
- [ ] Versioned renderer-independent puzzle-state contract
- [ ] Friends and friend requests
- [ ] Secure shareable pre-scrambled challenge links
- [ ] Solved/unsolved challenge modes
- [ ] Guest challenge attempts
- [ ] Server-side challenge validation and result recording
- [ ] Daily shared scramble
- [ ] Personal and global leaderboards
- [ ] Anti-cheat and suspicious-result review
- [ ] Ghost races
- [ ] Live private multiplayer rooms
- [ ] Public matchmaking
- [ ] Reporting, blocking, and moderation

## 6. Admin portal

> **2026-07-23 (`claude/cubelabs-admin-dashboard-4pe35q`):** Admin platform coded and
> build-verified (38 routes, `tsc` clean, 27 unit tests pass, lint non-interactive).
> All items below are `[~]` — they require `20260723_admin_platform.sql` applied in
> production, `SUPABASE_SERVICE_ROLE_KEY` set, owner bootstrap run, and browser/RLS
> verification before any `[x]`. See ADR 0003 and `docs/SECURITY.md`.

- [x] Admin portal requirements documented
- [~] Admin authentication and role enforcement (`app/admin/layout.tsx`, `lib/admin/auth.ts`, `lib/admin/permissions.ts`; authorization unit-tested)
- [~] User search, suspension, deletion, and audit trail (`app/admin/users/*`, `app/admin/actions/users.ts`)
- [~] Test-result override tools for controlled QA (`app/admin/test-lab`, `app/admin/actions/test-lab.ts`)
- [~] Leaderboard moderation, preserving originals (`app/admin/leaderboards`, `app/admin/actions/leaderboards.ts`)
- [~] Challenge inspection and moderation (`app/admin/challenges`, `app/admin/actions/challenges.ts`)
- [~] Banner and carousel manager (schema + affiliate/campaign create; slide editor UI pending)
- [~] Affiliate-link manager (`app/admin/carousels`, `createAffiliateProduct`)
- [~] Site configuration controls and feature flags (`app/admin/settings`, `app/admin/actions/settings.ts`)
- [~] Security dashboard and audit logs (`app/admin/security`, `app/admin/audit`)
- [~] Backup/export controls (`app/admin/exports`, `app/api/admin/export`; owner-only audit export)
- [~] Roles & permissions editor UI (`app/admin/roles`; owner-only, audited, last-owner guard)
- [~] Media library (`app/admin/media`, `app/api/admin/media`; magic-byte validation, private Storage)
- [~] Premium & billing (`app/admin/billing`; Stripe checkout + verified webhook)
- [~] Operator UX: notification bell, ⌘K command palette, onboarding checklist

## 7. Monetization

> **2026-07-23:** Admin-side management (create/schedule/publish/disclose) **and**
> the public render components (`AdSlot`, `ManagedCarousel`, `AffiliateProductCard`)
> + impression/click tracking (`/api/ads/track`, SECURITY DEFINER counters) are now
> coded and build-verified (`claude/cubelabs-admin-dashboard-4pe35q`). Preview at
> `/admin/ads/preview`. Remaining: wire the components into chosen public pages,
> affiliate activation toggle + slide editor, conversion tracking. Items stay `[~]`
> until applied + browser-verified in production.

- [x] Ads and affiliate architecture documented
- [~] Managed ad slots outside gameplay controls (`components/ads/AdSlot.tsx`; drop-in ready)
- [~] Banner and carousel campaigns (`ManagedCarousel`; admin create/publish + public render)
- [~] Amazon affiliate integration and disclosures (`AffiliateProductGrid`; tagged links + `rel="sponsored nofollow"` + disclosure)
- [ ] Conversion tracking
- [~] Premium/no-ads plan (`/admin/billing`, `premium_plans`/`premium_subscriptions`, Stripe checkout + signature-verified webhook; needs `STRIPE_*` keys + browser verify)
- [ ] Theme or appearance packs
- [ ] Revenue reporting and compliance review

## 8. Security, quality, and operations

- [x] Security requirements documented
- [x] Backup and provider-migration rules documented
- [x] AI contributor rules documented
- [x] Architecture decision records started
- [x] Branch-document recovery and classification process established
- [~] Complete automated test suite (Vitest 33/33; broader e2e still needed)
- [ ] Production security review
- [~] Row-level security verification (`supabase/tests/rls_assertions.sql` — automated script; must be run in production)
- [~] Rate limiting and abuse controls (`20260726_rate_limiting.sql` + `lib/admin/rate-limit.ts`; wired into sign-in, reset, admin actions, media, checkout, mfa, ad-track)
- [ ] Disaster-recovery rehearsal
- [ ] Database export and restore rehearsal
- [~] Dependency and secret scanning (`.github/workflows/security.yml` — Gitleaks + OSV-Scanner + CodeQL + npm audit)
- [~] Admin two-factor authentication (`/admin/security/mfa`, `lib/admin/mfa.ts`; optional via `ADMIN_REQUIRE_MFA`)
- [~] Security response headers + report-only CSP (`next.config.mjs`)
- [ ] Accessibility audit
- [ ] Cross-device release checklist

## Current release gate

Before a feature is checked complete, confirm:

- [ ] Implementation is merged into the canonical branch.
- [ ] Build and relevant automated tests pass.
- [ ] Real-device or browser verification is recorded when applicable.
- [ ] Relevant permanent documentation is updated.
- [ ] `PROJECT-HEALTH.md` reflects changed readiness or risk.
- [ ] `CHANGELOG.md` is updated.
- [ ] An ADR exists when the change affects architecture, security, data ownership, public behavior, providers, or major structure.
- [ ] Rollback and known-issue notes are recorded.