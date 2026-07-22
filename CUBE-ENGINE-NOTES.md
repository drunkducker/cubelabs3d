# Cube Engine Notes

Last updated: 2026-07-22, America/New_York

This file tracks internals of the hand-rolled three.js cube engine —
`app/NxNCubeGame.tsx` (the playable NxN engine behind `/play/10x10` and
`/solver/4x4`) and `components/NotationCube.tsx` (the homepage explainer
cube), which share the same low-level pattern: a manual `THREE.WebGLRenderer`
plus `OrbitControls`, rather than `@react-three/fiber`. For visual framing
(camera distance, centering, sticker look) see `CUBE-PERSPECTIVE-NOTES.md`.
This file is for engine correctness/behavior bugs that aren't about how the
cube looks, but about how it runs.

## Animation-frame leak on unmount

**Symptom:** none visible in normal use — this was found by code review, not
a user report. It only shows up as a React warning ("Can't perform a React
state update on an unmounted component") and a lingering `requestAnimationFrame`
callback if a user navigates away while a turn or scramble is still animating.

**Root cause:** each layer turn animates itself with its own
`requestAnimationFrame` chain — `animate` in `NxNCubeGame.tsx`'s `runNext()`,
`animateTurn` in `NotationCube.tsx`'s `turnLayer()` — separate from the
component's main render loop (`frame` in both files). The effect's cleanup
function only ever cancelled the render loop's `frame`. If the component
unmounted mid-turn (e.g. tapping "← Solvers" while a scramble was still
running), the turn's own rAF chain kept scheduling itself indefinitely: still
mutating the (now-orphaned) cube's `THREE.Group` state and still calling the
component's React state setters (`setStatus`, `setCanUndo`, `setMoves` /
`setSelected`) after the component had already unmounted.

**Fix:** both files now track the turn animation's own rAF handle in a
variable scoped to the effect (`moveFrame` in `NxNCubeGame.tsx`, `turnFrame`
in `NotationCube.tsx`), and a `disposed` boolean set `true` at the top of the
effect's cleanup function. The animation callback checks `disposed` first
and bails out immediately if it's already torn down; cleanup also calls
`cancelAnimationFrame` on the tracked handle so a frame that's already been
requested but hasn't fired yet never fires at all. This mirrors the existing
`cancelAnimationFrame(frame)` handling for the render loop — the turn
animation just needed the same treatment.

**Why it matters at scale:** on a 10x10, an in-flight turn holds references
to up to ~100 cubie meshes being reparented into a pivot group. Without this
fix, navigating away mid-turn leaves those references (and the callback
closure itself) reachable from a pending rAF until it eventually fires and
exhausts itself — a real, if narrow, memory/CPU leak window, not just a
console warning.

## Scramble now covers every layer, not just the outer faces

**Symptom:** on a 4x4 or the 10x10, hitting "Scramble" looked far less
chaotic than a 3x3's scramble — most of the interior of each face stayed in
its original, tidy alignment relative to its neighbors, with only the
outermost ring of stickers near each edge looking shuffled.

**Root cause:** the old `scramble()` only ever queued the six outer-layer
face turns (`R`, `L`, `U`, `D`, `F`, `B` — always `layer = ±edge`). On a 3x3
that's the entire puzzle, so it scrambles fully. On anything bigger, a single
face turn rotates its whole layer as one rigid block: e.g. `F` spins the
entire front face's NxN stickers together, but never mixes them against a
different slice of the cube. The inner layers (any `layer` strictly between
`-edge` and `edge` — 8 of the 10 possible layers per axis on a 10x10) were
never selected by scramble, so the puzzle's actual complexity was almost
entirely unexercised by "Scramble."

**Fix:** `scramble()` now samples a random `axis` and a random `layer` from
*every* legal layer position for the cube's size (`layerValues`, built from
`edge`), not just the two outermost per axis. It also refuses to pick the
same axis+layer twice in a row, so consecutive scramble moves can't trivially
cancel each other out (`R` immediately followed by `R'`). Move count scales
with size (`Math.max(16, size * 4)`) since a bigger cube has more layers that
need a turn to get mixed in at all.

This reuses the exact same `turn()` / `runNext()` / arbitrary-layer selection
path that swipe-driven turns already use — a user could always reach any
layer by swiping the right row/column by hand; `scramble()` just wasn't
sampling from that same space. No new turning logic was introduced.

One side effect worth knowing: for an odd-sized cube (e.g. a 3x3, if ever
routed through this engine with `size={3}`), `layerValues` includes the
middle layer (`layer = 0`), so scrambles can now include true slice moves
(what standard notation calls M/E/S), which they never did before. This
engine is currently only used at `size={4}` and `size={10}`, both even, so
this doesn't change behavior for anything actually shipped today.
