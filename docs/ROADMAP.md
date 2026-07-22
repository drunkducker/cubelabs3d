# Cube Labs 3D — Master Roadmap

**Last updated:** 2026-07-22

This is the canonical project checklist. Items are checked only when repository evidence and required documentation support completion.

## 1. Foundation

- [x] GitHub repository connected
- [x] Vercel deployment foundation
- [x] IONOS domain purchased
- [x] Mobile-first site foundation
- [x] Homepage and interactive hero experience
- [x] Footer and lower-page content structure
- [x] Legal-page foundation
- [x] Permanent documentation governance
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
- [~] Password reset flow
- [~] AWS SES email delivery
- [ ] Email configuration runbook and recovery procedure
- [ ] Avatar upload and moderation
- [ ] Public display-name and unique-handle rules fully implemented
- [ ] Account deletion and export workflow
- [ ] Provider-migration test

## 3. Puzzle engine and solvers

- [x] Interactive hero cube
- [x] Playable 3×3 cube experience
- [x] Reusable NxN cube work
- [x] Larger-cube interaction, viewport, zoom, and performance improvements
- [x] High-DPI mobile canvas fix
- [x] Pyraminx engine, solver, timer, undo, scramble history, and swipe-depth behavior
- [?] General-purpose 3×3 solver from arbitrary manual input
- [~] 4×4 playable engine
- [~] 4×4 reduction and edge-pairing solver
- [~] 5×5 engine and solver work
- [ ] 5×5 arbitrary-state manual input parity with the 3×3 workflow
- [ ] 6×6 and larger solver strategy
- [ ] Camera/photo/video state scanner
- [ ] Solver correctness fixtures and regression suite
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

- [~] Cube ID/profile foundation
- [ ] Friends and friend requests
- [ ] Shareable pre-scrambled challenge links
- [ ] Solved/unsolved challenge modes
- [ ] Challenge acceptance and result recording
- [ ] Daily shared scramble
- [ ] Personal and global leaderboards
- [ ] Anti-cheat and suspicious-result review
- [ ] Ghost races
- [ ] Live multiplayer rooms
- [ ] Reporting, blocking, and moderation

## 6. Admin portal

- [x] Admin portal requirements documented
- [ ] Admin authentication and role enforcement
- [ ] User search, suspension, deletion, and audit trail
- [ ] Test-result override tools for controlled QA
- [ ] Leaderboard moderation
- [ ] Banner and carousel manager
- [ ] Affiliate-link manager
- [ ] Site configuration controls
- [ ] Security dashboard and audit logs
- [ ] Backup/export controls

## 7. Monetization

- [x] Ads and affiliate architecture documented
- [ ] Managed ad slots outside gameplay controls
- [ ] Banner and carousel campaigns
- [ ] Amazon affiliate integration and disclosures
- [ ] Conversion tracking
- [ ] Premium/no-ads plan
- [ ] Theme or appearance packs
- [ ] Revenue reporting and compliance review

## 8. Security, quality, and operations

- [x] Security requirements documented
- [x] Backup and provider-migration rules documented
- [x] AI contributor rules documented
- [x] Architecture decision records started
- [ ] Complete automated test suite
- [ ] Production security review
- [ ] Row-level security verification
- [ ] Rate limiting and abuse controls
- [ ] Disaster-recovery rehearsal
- [ ] Database export and restore rehearsal
- [ ] Dependency and secret scanning
- [ ] Accessibility audit
- [ ] Cross-device release checklist

## Current release gate

Before a feature is checked complete, confirm:

- [ ] Implementation is merged into the canonical branch.
- [ ] Build and relevant automated tests pass.
- [ ] Real-device or browser verification is recorded when applicable.
- [ ] Relevant permanent documentation is updated.
- [ ] `CHANGELOG.md` is updated.
- [ ] An ADR exists when the change affects architecture, security, data ownership, public behavior, providers, or major structure.
- [ ] Rollback and known-issue notes are recorded.
