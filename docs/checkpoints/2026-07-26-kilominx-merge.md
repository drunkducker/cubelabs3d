# Kilominx Merge Checkpoint — 2026-07-26

## Summary

The RootA branch `claude/puzzle-gen-twisting-69clo3` was reviewed against `main`, opened as PR #4, and merged into the canonical branch.

- Feature head: `8e45978c73b9bc7294592ab59a50e864c0f4e195`
- Merge commit: `51950a047bb363a1e922fb099d869ea923205da4`
- Pull request: #4 — Merge Kilominx puzzle and saved scrambles

## Added to `main`

- `app/KilominxGame.tsx` — interactive Three.js Kilominx with swipe turns, face buttons, scramble, timer, undo, reset, and animated solver playback.
- `lib/kilominx-engine.ts` — dodecahedron-derived geometry, move tables, state representation, parser, random scrambles, and reduction solver.
- `app/solver/kilominx/page.tsx` — public solver route.
- `app/solve/page.tsx` — Kilominx entry in the Solve hub.
- `tests/kilominx-engine.test.ts` — geometry, order-5/inverse/twist invariants, scramble round trips, and 50 random-scramble solution verifications.
- `components/SavedScrambles.tsx` — reusable solver-memory save/load panel.
- Kilominx save/load integration through `/api/solver-memory`.

## Verification status

### Repository evidence

- The feature branch includes dedicated automated Kilominx tests.
- The solver verifies generated solutions against the same engine state model.
- PR #4 merged cleanly into `main`.

### Still unverified

- No GitHub Actions workflow run was returned for merge commit `51950a0`.
- The merged `main` deployment has not yet been recorded as browser-tested.
- Mobile rendering, touch/swipe behavior, rotation/orientation changes, timer, undo, reset, and playback still need production-device verification.
- Saved scramble persistence needs signed-in production testing against Supabase.
- Guest behavior should be checked to ensure it shows a sign-in prompt rather than an error.

## Project-health impact

- **Puzzle breadth:** improved — Kilominx is now a first-class interactive solver.
- **Solver confidence:** improved — Kilominx has a dedicated regression suite and random-state verification evidence.
- **Solver Memory adoption:** improved — the reusable save/load UI is now used by one live solver.
- **Release risk:** moderately increased until mobile/browser and production persistence testing are recorded.
- **Architecture risk:** low — the branch shares RootA history and merged normally; no RootB manual port was involved.

## Documentation reconciliation

Updated on `main` after the merge:

- `docs/CURRENT_STATUS.md`
- `docs/ROADMAP.md`
- this dated checkpoint

The canonical documents now identify `main` as current at and after merge commit `51950a0`, record the merged Kilominx feature, and retain production/browser verification as open work rather than marking it fully complete.

## Next actions

1. Confirm the Vercel deployment for the merge and documentation commits.
2. Test `/solver/kilominx` on Android/iOS-sized mobile viewports and desktop.
3. Test all interaction controls and solve playback.
4. Test signed-in scramble save/load and guest sign-in behavior.
5. Reuse `SavedScrambles` on compatible 3×3/4×4/5×5/Pyraminx solver pages after puzzle-specific load behavior is verified.
6. Keep the Kilominx branch until production verification and a final diff check, then delete it.

## Rollback

Revert merge commit `51950a047bb363a1e922fb099d869ea923205da4` to remove the Kilominx feature set. The saved-scramble component uses the existing solver-memory API and does not introduce a new migration in this merge.
