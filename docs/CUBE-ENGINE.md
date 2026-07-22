# Cube Labs 3D — Cube Engine

**Last reviewed:** 2026-07-22

This document defines the permanent cube-engine architecture and records recovered branch findings without treating unmerged work as shipped.

## Canonical engines on `main`

- `app/NxNCubeGame.tsx` — playable NxN engine used by larger cube routes.
- `components/NotationCube.tsx` — notation/explainer cube.
- `app/PyraminxGame.tsx` and `lib/pyraminx-engine.ts` — Pyraminx renderer, state model, and solver.
- `CUBE-ENGINE-NOTES.md` — detailed implementation and bug-analysis journal.
- `CUBE-PERSPECTIVE-NOTES.md` — camera, framing, viewport, and visual positioning notes.

## Required engine boundaries

- Puzzle logic should be renderer-independent where practical.
- Renderers may animate state but must not become the only durable representation of challenge or solver state.
- Move notation, scramble state, player history, timing, solved status, and assistance flags must be separable.
- Shared challenge payloads must be versioned and independent of camera position and Three.js object identity.
- Mobile touch behavior is a first-class requirement.
- Homepage behavior must not be changed indirectly through shared engine work without explicit approval and verification.

## Verified fixes already documented on `main`

- Animation-frame cleanup when a puzzle unmounts during a turn.
- NxN scramble selection across inner and outer layers.
- High-DPI canvas sizing and viewport correction.
- Pyraminx geometry winding and interior-surface corrections.
- Pyraminx logical/visual piece-selection correction.
- Pyraminx timer, undo, scramble history, solved-state behavior, and swipe-to-turn interaction.

The detailed causes and implementation notes remain in `CUBE-ENGINE-NOTES.md`.

## Recovered branch-only NxN tracked-state work

The branch `claude/cube-engine-centering-zb2e9m` contains an additional section that is not present in the canonical `main` copy of `CUBE-ENGINE-NOTES.md`. It describes code intended to bring the NxN engine to the same tracked-state shape as the Pyraminx:

- solved-state detection using each cubie's current `grid`, `home`, and orientation quaternion;
- a timer using a long-lived interval plus refs;
- scramble moves excluded from the player's move history and undo stack;
- a displayed scramble sequence;
- reset behavior that also clears timing and solved-state fields.

### Status

- [x] Technical design recovered and preserved here.
- [ ] Confirm whether the corresponding branch code should be rebased or manually ported.
- [ ] Inspect current `main` for equivalent later implementation before copying code.
- [ ] Run build, tests, and real-device checks after any port.
- [ ] Update `CUBE-ENGINE-NOTES.md` only when the implementation is canonical.

This distinction is intentional: documentation recovery does not mark branch-only code as production-complete.

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

## Solver status rule

A playable puzzle, reset function, or move-history reversal is not automatically a general-purpose solver. A solver may be marked complete only when arbitrary supported input states are validated, solvability is checked, generated moves are verified, and regression fixtures pass.

## Recovery source

Recovered from the branch version of `CUBE-ENGINE-NOTES.md` on `claude/cube-engine-centering-zb2e9m`. The original branch remains historical evidence.