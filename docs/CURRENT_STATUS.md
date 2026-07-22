# Cube Labs 3D — Current Status

**Last verified:** 2026-07-22
**Canonical branch:** `main`
**Repository:** `drunkducker/cubelabs3d`

This document is the single current-state summary. Dated checkpoint files are historical records and must not override this file.

## Current production baseline

- `main` is the repository default branch.
- The current site baseline includes the mobile-first homepage, interactive cube experiences, Supabase authentication foundation, and permanent documentation governance.
- The homepage layout must not be changed unless the project owner explicitly requests it.
- Login and profile work must continue from the existing Sign In flow.

## Verified completed work

### Platform foundation

- [x] GitHub repository connected and writable
- [x] Vercel deployment workflow established
- [x] IONOS domain purchased
- [x] Mobile-first site foundation
- [x] Homepage, footer, legal-page foundation, and content carousels
- [x] Permanent `/docs` governance structure started

### Authentication and data

- [x] Supabase application foundation
- [x] Authentication route and server actions
- [x] Profile route foundation
- [x] Solve-results API foundation
- [x] Database schema for profiles and solve results
- [x] Existing Sign In button wired to authentication
- [ ] Fully re-verify password reset delivery in production
- [ ] Fully document AWS SES production configuration and rollback procedure

### Puzzle platform

- [x] Interactive hero cube
- [x] Playable 3×3 experience
- [x] Larger NxN cube engine work
- [x] Mobile viewport and high-DPI canvas fixes
- [x] Playable Pyraminx with solver and touch interaction
- [x] Undo, scramble tracking, timer, and move-history improvements on supported puzzle pages
- [ ] Verify current general-purpose 3×3 solver behavior against arbitrary manual input
- [ ] Verify and finish the 4×4 reduction/edge-pairing solver path
- [ ] Complete and verify the 5×5 solver path
- [ ] Build camera/photo/video cube-state scanning

### Social and operations

- [x] Initial Cube ID/profile foundation
- [x] Friendship, challenges, leaderboard, admin, advertising, and affiliate architecture documented or planned
- [ ] Production-ready friends system
- [ ] Production-ready challenge links and shared scrambles
- [ ] Production-ready leaderboards
- [ ] Production-ready admin portal
- [ ] Production ad and affiliate management

## Current priorities

1. Reconcile the real implementation state of the 3×3, 4×4, and 5×5 solvers with the roadmap.
2. Finish authentication recovery and email-delivery verification.
3. Preserve old checkpoint documents under a historical archive rather than treating them as current truth.
4. Add tests and verification notes for every completed roadmap item.
5. Continue social, admin, monetization, and scanner work only through the documented architecture.

## Known documentation rule

A feature is complete only when its code, tests, relevant permanent documentation, changelog entry, and any required architecture decision record are all updated.

## Status labels

- `[x]` Verified complete from repository history or current documentation.
- `[~]` Implemented in part or requiring re-verification.
- `[ ]` Not complete.
- `[?]` Reported in a checkpoint or conversation but not yet verified in the current repository.
