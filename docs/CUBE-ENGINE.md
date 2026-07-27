# Cube Labs 3D — Cube Engine

**Last reviewed:** 2026-07-27

This document defines the permanent cube-engine architecture and records recovered branch findings without treating unmerged work as shipped.

## Canonical engines on `main`

- `app/NxNCubeGame.tsx` — playable NxN engine used by larger cube routes.
- `components/NotationCube.tsx` — notation/explainer cube.
- `app/PyraminxGame.tsx` and `lib/pyraminx-engine.ts` — Pyraminx renderer, state model, and solver.
- `app/KilominxGame.tsx` and `lib/kilominx-engine.ts` — Kilominx renderer,
  state model, verified reduction solver, and saved-scramble integration.
- `CUBE-ENGINE-NOTES.md` — detailed implementation and bug-analysis journal.
- `CUBE-PERSPECTIVE-NOTES.md` — camera, framing, viewport, and visual positioning notes.

## Required engine boundaries

- Puzzle logic should be renderer-independent where practical.
- Renderers may animate state but must not become the only durable representation of challenge or solver state.
- Move notation, scramble state, player history, timing, solved status, and assistance flags must be separable.
- Shared challenge payloads must be versioned and independent of camera position and Three.js object identity.
- Mobile touch behavior is a first-class requirement.
- Homepage behavior must not be changed indirectly through shared engine work without explicit approval and verification.

## Skewb review implementation on `feature/skewb-puzzle`

Draft PR #9 now follows the same renderer, interaction, and result-tracking
contract required for 3×3, 4×4, Pyraminx, and Kilominx:

- `lib/skewb-engine.ts` owns exact corner/center transforms, notation, scramble
  generation, inverses, solved-state detection, and verified bidirectional
  state search.
- `app/SkewbGame.tsx` renders eight corner bodies and six center bodies. A legal
  turn moves exactly four corners and three centers, then snaps every transform
  back to the engine's discrete state.
- All eight physical corner pivots remain available after arbitrary move
  sequences. This replaces the four-fixed-half model that made swipe selection
  inconsistent after roughly three moves.
- Every colored corner and center sticker can start a layer gesture. The
  selected layer follows the pointer continuously before completing or
  canceling the 120° turn.
- Turn Pieces and Rotate View are explicit modes. Camera gestures no longer
  compete silently with piece gestures.
- Manual turns use the Cube Labs 460 ms pace instead of the earlier 280 ms
  version.
- Scramble/setup moves are excluded from player count and undo history; reset
  clears renderer, logical, timing, attempt, and assistance state together.
- The solver uses the exact current state rather than session-history reversal,
  verifies its solution before playback, and marks auto-solved attempts as
  assisted.
- Saved, shared, and challenged Skewb notation loads through the native game
  callback so the exact start state is visible before play.
- The inline action card exposes Save Start, Share Link, Save Result, and Send
  to Friend. Completed manual attempts carry time, moves, undo/touch/button
  counts, and move history; a friend challenge attaches that saved result.
  Unsolved starts can still be sent, while auto-solved runs cannot be saved as
  legitimate results.

Current evidence:

- local verified commit: `15faac9`;
- GitHub PR head with the same verified tree: `c3b5502`;
- PR #9 is open, draft, mergeable, nine commits ahead of `main`, and zero
  behind;
- Vercel status for `c3b5502` is successful;
- 64/64 tests pass across nine files, including engine, renderer-transform, and
  shared attempt-contract coverage;
- TypeScript passes, lint exits 0 with existing unrelated warnings only, and
  the production build succeeds with `/solver/skewb` prerendered.

This remains branch-only until merged. Hosted phone drag feel/direction, native
share or clipboard behavior, signed-in save, and a two-account friend challenge
remain unverified.

## Verified fixes already documented on `main`

- Animation-frame cleanup when a puzzle unmounts during a turn.
- NxN scramble selection across inner and outer layers.
- High-DPI canvas sizing and viewport correction.
- Pyraminx geometry winding and interior-surface corrections.
- Pyraminx logical/visual piece-selection correction.
- Pyraminx timer, undo, scramble history, solved-state behavior, and swipe-to-turn interaction.

The detailed causes and implementation notes remain in `CUBE-ENGINE-NOTES.md`.

## Recovered NxN tracked-state work

The design was originally recovered from `claude/cube-engine-centering-zb2e9m`.
Equivalent tracked-state behavior was later merged into canonical
`app/NxNCubeGame.tsx`:

- solved-state detection using each cubie's current `grid`, `home`, and orientation quaternion;
- a timer using a long-lived interval plus refs;
- scramble moves excluded from the player's move history and undo stack;
- a displayed scramble sequence;
- reset behavior that also clears timing and solved-state fields.

### Status

- [x] Technical design recovered and preserved here.
- [x] Current `main` contains equivalent solved detection, timer, setup-history
      exclusion, scramble display, and reset tracking.
- [x] The canonical implementation is documented in `CUBE-ENGINE-NOTES.md`.
- [ ] Cross-puzzle result payloads and real-device release checks still need
      consistent coverage.

The original branch remains historical evidence and does not need a wholesale
port.

## Cross-engine challenge-state target

Each supported puzzle should expose a consistent logical result shape:

- puzzle type and size;
- state schema version;
- starting state or reproducible scramble;
- elapsed time;
- player move count;
- solved status;
- undo count;
- hints or solver assistance;
- control/device classification;
- validation metadata.

## Solver memory target

Logged-in users should be able to recover recent solver work. Paid users should
receive deeper retained history and cross-device organization. The Supabase
table, `/api/solver-memory`, and shared Save & Friend Play panel now exist.
Kilominx has merged native memory UI; Skewb has native start/result actions on
draft PR #9. Other solver pages still need complete native load/resume behavior,
and paid-tier enforcement remains open.

The durable solver-memory shape should include:

- user id and access tier;
- puzzle type and size;
- state schema version;
- entered facelets or renderer-independent state;
- scramble or setup history;
- generated solution and verification status;
- current playback step or resume point;
- notes, title, and last-opened time;
- privacy, export, and deletion support.

Solver pages must use application services such as `getSolverMemory()` and `saveSolverSnapshot()` rather than calling Supabase directly. Guest/local memory may exist for convenience, but account memory and paid retention must be server-authorized.

## Solver status rule

A playable puzzle, reset function, or move-history reversal is not automatically a general-purpose solver. A solver may be marked complete only when arbitrary supported input states are validated, solvability is checked, generated moves are verified, and regression fixtures pass.

## Recovery source

Recovered from the branch version of `CUBE-ENGINE-NOTES.md` on `claude/cube-engine-centering-zb2e9m`. The original branch remains historical evidence.
