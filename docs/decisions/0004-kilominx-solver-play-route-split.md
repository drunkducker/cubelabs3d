# ADR 0004: Split the Kilominx into a solver route and a play route

- Status: accepted
- Date: 2026-07-27
- Decision owners: Cube Labs project owner and contributing agents
- Branch: `claude/manual-solver-input-jja9t0`

## Context

Every other supported puzzle follows one convention: `/solver/<puzzle>` is the
real solver (scramble and/or enter your own cube, get a verified solution) and
`/play/<puzzle>` is the playable game. `/solver/3x3` renders `ManualSolver`;
`/play/3x3` renders the game. Challenge attempts (`app/challenge/[id]`) route
every puzzle to `/solver/<puzzle>`.

The Kilominx was the exception. `/solver/kilominx` hosted the playable 3D game
(`app/KilominxGame.tsx`) — swipe-to-turn, timer, undo, and a verified solver of
the *on-screen* cube — and there was no `/play/kilominx`. There was no way for a
player to enter their own physical Kilominx, unlike the 3×3/4×4/5×5.

Adding "Enter My Cube" manual input to the Kilominx therefore raised a routing
question: where does the new solver live, and what happens to the game?

## Decision

Match the established convention:

- `/solver/kilominx` now renders the new `components/KilominxSolver.tsx`
  (scramble-demo + manual flat-net entry + verified solution + net playback),
  mirroring the role `/solver/3x3` plays.
- The playable 3D game moves **verbatim** to the new `app/play/kilominx/page.tsx`.
  `app/KilominxGame.tsx` is unchanged — only re-hosted — so the approved playable
  experience is preserved intact (Constitution §2, §3).
- `/solve` hub copy for Kilominx updated to describe the solver; the solver page
  links to `/play/kilominx` and the game keeps its "Back to solvers" link.
- Challenge routing is left as-is: it already pointed Kilominx at
  `/solver/kilominx`, which is now a solver like every other puzzle — so the
  change makes challenges *more* consistent, not less.

## Consequences

- The Kilominx now matches the site-wide `/solver` vs `/play` split; no puzzle
  is a special case anymore.
- Any external link or bookmark to `/solver/kilominx` expecting the 3D game now
  lands on the solver instead. The game is one tap away at `/play/kilominx`.
  Internal references (`/solve`, `app/challenge/[id]`) were updated or verified.
- No database, schema, auth, or configuration changes. Rollback is a branch
  revert; the game component was never modified.

## Required follow-up

- Mobile/browser QA of both routes (solver paint UX + playback, and the moved
  game) before this is treated as production-verified.
- Consider a dedicated 3D `KilominxSolverCube3D` so the solver can play the
  solution back on a 3D puzzle rather than the flat net.
