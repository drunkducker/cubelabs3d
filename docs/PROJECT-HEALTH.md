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
| Documentation governance | Strong after reconciliation | All 44 pre-existing tracked Markdown files were read on 2026-07-27; stale current-state, engine, handoff, roadmap, and log records were reconciled and a Skewb checkpoint was added |
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
- permanent documentation and changelog are updated;
- rollback and known-issue notes exist;
- an ADR records major architectural or provider decisions.

## Update rule

Update this dashboard during major daily check-ins. Do not raise a health rating based only on conversation claims, an unmerged branch, or a visual prototype.
