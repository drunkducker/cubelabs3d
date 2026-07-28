# Cube Labs 3D — Learn Engine

**Last reviewed:** 2026-07-28

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

Required behavior:

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

The branch currently contains a separate `components/KilominxNotationModel.tsx`. It uses `lib/kilominx-engine.ts`, but still duplicates Three.js construction, move animation, move queueing, glow handling, scramble, reset, and solve playback from `app/KilominxGame.tsx`.

The private Learn swipe resolver has now been removed. Learn imports the shared Kilominx interaction authority instead. The separate renderer remains a transitional prototype and must still be replaced with the canonical renderer plus Learn overlays.

## Refactor implementation status

### Phase 1 — playable touch contract active in Learn

`lib/kilominx-interaction.ts` is the shared renderer-facing interaction authority. It owns:

- current spatial-face resolution from a sticker's transformed world normal;
- screen-space positive-turn direction projection;
- drag-to-move resolution;
- the playable 16 px preview distance;
- the playable 34 px commit distance;
- the shared commit-threshold helper.

Current implementation commits:

- `02b3b58` — centralizes the playable preview and commit distances;
- `e25dada` — replaces the Learn model's private resolver and 12/24 thresholds with the shared 16/34 contract;
- `c43fb5c` — tests the playable distances and shared interaction behavior.

The active Learn interaction now follows the playable contract:

1. touch a sticker;
2. disable camera rotation for that pointer;
3. select a move only after 16 px;
4. let the matrix observe and display that selected move;
5. commit one fixed 72° turn only after release at 34 px or more;
6. cancel below threshold or on `pointercancel`;
7. restore OrbitControls when the last pointer exits;
8. use the playable 250 ms manual turn duration.

There is no velocity, flick, custom resistance, partial-layer tracking, spring-back, or snap-forward logic in the active path.

The next consolidation step is to make `app/KilominxGame.tsx` import the same shared module and then expose its pointer and move lifecycle to a Learn adapter. That removes the remaining possibility of implementation drift while preserving the playable behavior.

### Video regression reference

The uploaded phone videos captured the failures the refactor must remove:

- glow washing the sticker nearly white and hiding its label/color;
- touch matrix reading as a viewport overlay instead of a surface-local guide;
- guide appearing after movement without a clear physical start point;
- displayed direction and committed layer feeling disconnected;
- state jumps instead of canonical movement feedback;
- highlighted labels losing contrast;
- touch behavior feeling different from the playable 3×3, 4×4, and Kilominx.

Keep this list as a hosted mobile acceptance test, not merely a visual preference list.

## Parked gesture-physics experiment

The velocity/flick/direct-manipulation prototype is preserved outside the active Learn branch behavior:

- branch: `experiment/kilominx-gesture-physics`;
- preserved commit: `b7699c9e996c24e70f26fafc30159a4087ad3fec`;
- design and re-entry notes: `docs/experiments/KILOMINX-GESTURE-PHYSICS.md`.

The experiment includes pointer velocity, flick-to-commit, partial layer tracking, snap-forward completion, spring-back cancellation, and custom resistance. These are useful future ideas, but they are not the current product gesture and must remain disabled.

Any future revival must use a shared, disabled-by-default interaction profile with bounded server-authorized settings and an administrator kill switch. It must not be copied back into a single puzzle renderer.

## Kilominx refactor plan

1. Audit `app/KilominxGame.tsx` and identify the smallest stable adapter surface for Learn mode. **Complete.**
2. Extract the shared spatial-face, drag-resolution, preview, and commit contract. **Complete and active in Learn; canonical renderer import remains.**
3. Make `app/KilominxGame.tsx` consume the shared interaction authority without changing playable behavior.
4. Add optional label and Learn-overlay hooks to the canonical renderer.
5. Move target sticker glow, contrast label, touch matrix, drag guide, and direction arrow into a Learn overlay/controller.
6. Drive the flat flower from direct logical state or move events.
7. Replace `/learn/kilominx-notation` use of `KilominxNotationModel` with the canonical Kilominx renderer in Learn mode.
8. Remove the duplicate renderer after parity tests pass.

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
