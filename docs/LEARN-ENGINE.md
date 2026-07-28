# Cube Labs 3D — Learn Engine

**Last reviewed:** 2026-07-27

This document defines the architecture for interactive Learn pages that teach puzzle notation, piece selection, move direction, algorithms, and step-by-step solving without creating a second puzzle engine.

## Core rule

A Learn page must extend the canonical playable puzzle implementation. It must not reimplement the renderer, swipe resolver, move queue, logical state, or solver in a parallel component.

The canonical puzzle remains responsible for:

- renderer-independent logical state;
- legal move parsing and application;
- current spatial piece and face resolution;
- touch and swipe interpretation;
- animation and move queues;
- scramble, reset, solve, and solved-state behavior;
- state snapshots and verification.

The Learn layer may add presentation and guidance only:

- sticker and piece labels;
- one active target sticker per lesson step;
- target-color glow attached to that physical sticker;
- high-contrast label treatment while highlighted;
- touch-start matrix and drag-path visualization;
- clockwise or counter-clockwise direction arrows;
- algorithm step controls and explanatory copy;
- synchronized flat references derived from the same logical state.

## Required component boundary

The target structure is:

```text
canonical puzzle engine + renderer
        ↓ exposes state and interaction events
Learn adapter / overlay controller
        ↓
labels, glow, arrows, touch matrix, flat reference, lesson UI
```

The Learn adapter must consume stable puzzle data rather than inspect page text or duplicate engine calculations. Preferred inputs include:

- current logical state;
- current rendered transform snapshot;
- active move and move direction;
- pointer-down sticker or piece identity;
- current spatial face or legal move candidates;
- move-start, move-progress, move-commit, move-cancel, reset, scramble, and solve events.

## Interaction invariants

1. A sticker keeps the same durable piece/sticker identity after every move.
2. Swipe resolution uses the sticker's current spatial position, never its original face number.
3. Camera rotation and puzzle turns must have an explicit, predictable gesture contract.
4. The Learn overlay must not intercept or alter the canonical gesture unless the lesson explicitly locks interaction.
5. Visual guides follow the physical sticker or moving layer through animation.
6. Canceling a gesture restores both puzzle transforms and Learn overlays.
7. Reset clears puzzle state, lesson state, highlights, arrows, touch guides, and playback state together.

## Highlight contract

Only one target sticker should glow per lesson step unless a lesson explicitly teaches a multi-piece relationship.

The highlight must:

- use the target sticker's associated color;
- be parented to the sticker or recomputed from its world transform every frame;
- remain visible while the sticker moves;
- preserve sticker boundaries rather than filling the viewport;
- switch the label to black or another tested high-contrast color against the glow;
- restore the original material and label texture when the target changes.

A full-face glow is not the default teaching state.

## Touch matrix and direction guide

The touch guide is an overlay generated from the canonical gesture resolver, not an independent move-decider.

Planned behavior:

- show a small matrix centered on the actual pointer-down location;
- mark the exact sticker used as the gesture origin;
- display the live drag vector;
- highlight the currently selected legal direction;
- show the move label before release;
- cancel cleanly below threshold or on pointer cancellation;
- commit the same move selected by the canonical puzzle resolver.

The direction arrow should be anchored to the active face/layer in 3D. It should communicate clockwise or counter-clockwise motion from the current camera view without becoming puzzle state.

## Flat reference contract

The flat net is a view of the same state, not a second state machine.

It must receive direct state snapshots or move events from the puzzle adapter. DOM text scraping and MutationObserver synchronization are temporary prototypes and must not be the final integration.

The flat reference should support:

- current sticker colors and durable labels;
- one matching target sticker highlight;
- playback synchronized move by move;
- reset and scramble synchronization;
- printable solved or current-state output where required.

## Kilominx notation branch status

Branch: `feature/kilominx-notation`

Current preview route: `/learn/kilominx-notation`

The branch currently contains a separate `components/KilominxNotationModel.tsx`. It uses `lib/kilominx-engine.ts`, but duplicates major behavior from `app/KilominxGame.tsx`, including Three.js construction, swipe resolution, move animation, move queueing, glow handling, scramble, reset, and solve playback.

This duplication caused visible divergence from the canonical Kilominx:

- swipe behavior drifted after pieces moved;
- glow logic required repeated fixes and at one point behaved like a viewport overlay;
- interaction pace and gesture semantics no longer matched the playable Kilominx;
- Learn-specific additions became coupled to a second renderer.

The separate model is a prototype and must not become the permanent Learn engine.

## Refactor implementation status

### Phase 1 — shared interaction authority (started)

Commit `6d3a114` adds `lib/kilominx-interaction.ts` as the shared, renderer-facing interaction authority for both Play and Learn.

It now owns:

- current spatial-face resolution from a sticker's transformed world normal;
- screen-space positive-turn direction projection;
- drag-to-move resolution;
- the shared commit threshold helper.

This is intentionally not a second state machine. It accepts canonical renderer data and returns an engine move index. The playable renderer and Learn overlay must both call this module so their move preview, floating arrow, touch matrix, and committed move cannot disagree.

The next code change is to replace the private resolver inside `app/KilominxGame.tsx` with this module and expose pointer/move lifecycle events to a Learn adapter. The prototype notation resolver must not receive additional independent gesture logic.

### Video regression reference

The uploaded phone video captured the failures the refactor must remove:

- glow washing the sticker nearly white and hiding its label/color;
- touch matrix reading as a viewport overlay instead of a surface-local guide;
- guide appearing after movement without a clear physical start point;
- displayed direction and committed layer feeling disconnected;
- state jumps instead of canonical continuous drag feedback;
- highlighted labels losing contrast.

Keep this list as a hosted mobile acceptance test, not merely a visual preference list.

## Kilominx refactor plan

1. Audit `app/KilominxGame.tsx` and identify the smallest stable adapter surface for Learn mode. **Complete.**
2. Extract or expose canonical move, pointer, spatial-face, and animation events without changing approved playable behavior. **Shared resolver extracted; renderer wiring next.**
3. Add optional label and Learn-overlay hooks to the canonical renderer.
4. Move target sticker glow, contrast label, touch matrix, drag guide, and direction arrow into a Learn overlay/controller.
5. Drive the flat flower from direct logical state or move events.
6. Replace `/learn/kilominx-notation` use of `KilominxNotationModel` with the canonical Kilominx renderer in Learn mode.
7. Remove the duplicate renderer after parity tests pass.

## Required regression coverage

Before removing the prototype, verify:

- canonical Kilominx behavior is unchanged outside Learn mode;
- arbitrary scrambles still allow correct sticker selection and swipes;
- the same gesture resolves to the same move in Play and Learn modes;
- target glow remains attached during camera rotation and layer turns;
- highlighted label remains readable for every puzzle color;
- touch guide commits and cancels through the canonical gesture path;
- flat and 3D views match after scramble, manual moves, playback, and reset;
- reduced-motion mode remains usable;
- mobile pointer capture does not leave OrbitControls disabled;
- cleanup removes animation frames, listeners, textures, and overlay objects.

## Development rule

Do not add another puzzle-specific Learn renderer when a canonical renderer already exists. Add an adapter or optional overlay contract, then reuse it for 3×3, 4×4, Kilominx, Skewb, Pyraminx, and later puzzles.

Feature work remains on its feature branch until parity, tests, hosted mobile verification, and owner approval are complete.
