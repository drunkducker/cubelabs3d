# Cube Labs 3D — Current Status

**Last verified:** 2026-07-22
**Canonical branch:** `main`
**Repository:** `drunkducker/cubelabs3d`

This document is the single current-state summary. Dated checkpoint files and unmerged branches are historical or in-progress evidence and must not override this file.

## Current production baseline

- `main` is the repository default branch.
- The current site baseline includes the mobile-first homepage, interactive puzzle experiences, Supabase authentication foundation, and permanent documentation governance.
- The homepage layout must not be changed unless the project owner explicitly requests it.
- Login and profile work must continue from the existing Sign In flow.

## Pending merge candidate (`claude/working-status-mumm9x`)

A verified merge candidate for the next `main` has been assembled from the two branches that Vercel is actively deploying:

- `gpt/cube-id-platform` — Cube ID dashboard, provider auth routes, working password-reset flow, and Cube Labs Mail.
- `claude/new-session-euaf6s` — 3×3 manual color entry, arbitrary-state 4×4 solver, interim 5×5 solver, NxN timer/scramble history.

Both merged with zero conflicts (disjoint files) and `npm run build` passes (25 routes). Promotion to `main` is gated on running both `supabase/migrations/20260722_*.sql` migrations and an owner review of the preview. Until promoted, the items below still reflect `main`, not the candidate.

## Repository history caution

The repo has **two unrelated Git histories**. `main` and the recent `gpt/*` / `claude/*` branches share root `01445ce`. A separate line (`drive-homepage-import`, `fix/cube-transform-stability`, `feature/social-challenges-foundation`, root `e28a424`) shares **no merge base** with `main`, is not deployed, and can only be brought in by manual port — not `git merge`.
- Branch-only prototypes must be selectively reconciled rather than merged wholesale when they are substantially behind `main`.

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
- [x] Profile route foundation
- [x] Solve-results API foundation
- [x] Database schema for profiles and solve results
- [x] Existing Sign In button wired to authentication
- [x] Historical password-reset preview deployment note preserved
- [ ] Fully re-verify password-reset delivery in production
- [ ] Fully document AWS SES production configuration and rollback procedure

### Puzzle platform

- [x] Interactive hero cube
- [x] Playable 3×3 experience
- [x] Larger NxN cube-engine work
- [x] Mobile viewport and high-DPI canvas fixes
- [x] Playable Pyraminx with solver and touch interaction
- [x] Permanent cube-engine boundaries and branch recovery notes
- [ ] Verify current general-purpose 3×3 solver behavior against arbitrary manual input
- [ ] Verify and finish the 4×4 reduction/edge-pairing solver path
- [ ] Complete and verify the 5×5 solver path
- [ ] Decide whether to port branch-only NxN timer, solved-state, and scramble-history parity work
- [ ] Build camera/photo/video cube-state scanning

### Social and operations

- [x] Initial Cube ID/profile foundation
- [x] Social and multiplayer architecture consolidated into a permanent document
- [~] Local community and challenge prototype exists on `feature/social-challenges-foundation`
- [ ] Reconcile the prototype safely with current `main`
- [ ] Versioned renderer-independent puzzle-state contract
- [ ] Production-ready friends system
- [ ] Production-ready secure challenge links and shared scrambles
- [ ] Production-ready leaderboards
- [ ] Production-ready admin portal
- [ ] Production ad and affiliate management

## Current priorities

1. Verify the real implementation state of the 3×3, 4×4, and 5×5 solvers.
2. Reconcile valuable branch-only code without importing stale branch history wholesale.
3. Finish authentication recovery and email-delivery verification.
4. Define and test the versioned puzzle-state contract before production social integration.
5. Add tests and verification notes for every completed roadmap item.

## Known documentation rule

A feature is complete only when its code, tests, relevant permanent documentation, changelog entry, project-health impact, and any required architecture decision record are all updated.

## Status labels

- `[x]` Verified complete from the canonical repository and documentation.
- `[~]` Implemented in part, branch-only, or requiring re-verification.
- `[ ]` Not complete.
- `[?]` Reported in a checkpoint or conversation but not yet verified in the current repository.