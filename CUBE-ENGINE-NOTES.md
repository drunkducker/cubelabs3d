# Cube Engine Notes

Last updated: 2026-07-22, America/New_York

This file tracks internals of the hand-rolled three.js cube engines —
`app/NxNCubeGame.tsx` (the playable NxN engine behind `/play/10x10` and
`/solver/4x4`), `components/NotationCube.tsx` (the homepage explainer
cube), and `app/PyraminxGame.tsx` + `lib/pyraminx-engine.ts` (the Pyraminx
at `/solver/pyraminx`) — which share the same low-level pattern: a manual
`THREE.WebGLRenderer` plus `OrbitControls`, rather than `@react-three/fiber`.
For visual framing (camera distance, centering, sticker look) see
`CUBE-PERSPECTIVE-NOTES.md`. This file is for engine correctness/behavior
bugs that aren't about how the cube looks, but about how it runs.

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

## Pyraminx: four separate bugs behind one visual symptom

The Pyraminx (`app/PyraminxGame.tsx` for rendering/turning,
`lib/pyraminx-engine.ts` for the discrete move/solve logic) is a genuinely
different puzzle from the cubes above — a tetrahedron with 4 vertex axes
instead of a cube's 3 face axes — built from scratch this session. Getting
it right took catching four independent bugs that all happened to look like
"the cube renders wrong," which is worth recording so a future "it looks
broken again" report starts from the right mental model instead of
re-diagnosing from zero.

**Architecture, briefly:** `lib/pyraminx-engine.ts` is framework-agnostic
(no three.js import) and owns the puzzle's combinatorics: 4 tips (each
stays at its home vertex forever, only ever needs a 0/1/2 rotation offset),
6 edges (permute and flip between 6 fixed slots), 4 centers (permanently
fixed, never touched by any move, not even tracked in the state). Both the
discrete move tables and the edge-only BFS solver (46,080 reachable
states — small enough to fully explore once and cache) were derived
programmatically from the same tetrahedron vertex geometry rather than
hand-typed from a mental picture of the puzzle — see the file's top comment
and `deriveVertexMove`. `app/PyraminxGame.tsx` builds the 3D scene, and
deliberately does *not* track its own copy of piece state beyond mirroring
`lib/pyraminx-engine.ts`'s `PyraState` — it turns physical `THREE.Group`s via
the same pivot-and-reparent technique as `NxNCubeGame.tsx`, just rotating
by quaternion around an arbitrary vertex axis instead of `pivot.rotation.x`.

**Bug 1 — two of the four faces had inverted triangle winding.**
`FACE_VERTICES[k]` (the tetrahedron's 4 vertices minus vertex `k`, in
ascending index order) does not wind consistently counter-clockwise as
seen from outside — it alternates by parity of `k`. Two faces' sticker
triangles ended up wound backwards, so their computed normals pointed
*into* the tetrahedron. Symptom: those faces (which should be hidden, since
they're the far side of the puzzle) got treated by the renderer as
"facing the camera" and bled through the correct near faces as large,
wrong-colored blocks. Confirmed by switching to `THREE.FrontSide` (culling
disabled it briefly showed one wrongly-wound face dominating the whole
view) and by computing each face's winding-implied normal against its true
outward direction directly. Fixed in `faceCells()` by checking the winding
and swapping two vertices when it's backwards, rather than hardcoding which
two faces need it.

**Bug 2 — "downward" cells wind opposite to "upward" cells, on every face.**
Even after fixing bug 1, thin colored streaks persisted along the grid
lines. The barycentric subdivision that splits a face into its 9 cells
produces 6 "upward" cells and 3 "downward" cells (the 3 downward ones are
always the center piece's stickers) via two different corner-order
formulas — and those two formulas wind opposite to each other *regardless*
of which face they're on. Confirmed by computing both cell types' winding
normals against the same reference on a flat 2D test triangle. Fixed by
swapping the last two corners for downward cells only, in `faceCells()`.

**Bug 3 — `THREE.DoubleSide` let the interior show through the sticker
gaps.** With both windings fixed, a fainter version of the streaks was
*still* there. Pure ambient lighting (no directional lights at all) made
them vanish completely, which narrowed it to something direction-dependent
at the geometry's edges. The stickers use `side: THREE.DoubleSide` as a
safety net, which meant the tetrahedron's *interior-facing* triangle
surfaces — normally invisible, since nothing looks at the inside of a
convex solid from outside — also rendered. The intentional gaps between
stickers (there to create the visible black sticker borders) are literally
empty space with no near-side geometry blocking the view through them, so
a camera ray straight through a gap could hit and render the inside of a
far-side sticker, lit from a very different angle than the puzzle's outer
surface. Once winding was verified fully correct (bugs 1 and 2), `DoubleSide`
was no longer needed for anything and removing it (back to the default
`FrontSide`) culls those interior surfaces properly.

**Bug 4 — turning grabbed pieces by home identity instead of current
position (the big one).** After bugs 1–3 were fixed, the puzzle *rendered*
cleanly, but scrambling and then hitting "Solve" left it visibly still
scrambled even though the status correctly said "Solved!" — the logical
`PyraState` really was solved (verified independently against
`lib/pyraminx-engine.ts`'s own test suite), but the 3D pieces weren't back
in place. Root cause: `edgeGroups[p]` is a fixed `THREE.Group` reference
indexed by each edge piece's *home* slot — correct, since a piece's colored
stickers are baked in once and never reassigned, so the group itself is what
physically moves between slots as the puzzle turns. But `groupsForMove()`
was selecting which groups to rotate via `EDGES_AT_VERTEX[move.vertex]` —
the 3 slots that are physically near this vertex *right now* — and using
those slot numbers directly as indices into `edgeGroups`. That only happens
to be correct when every piece is still at its home slot, i.e. on a freshly
solved puzzle. After the first scramble move shuffles pieces around, "the
groups whose home is near this vertex" and "the groups actually sitting
near this vertex" diverge, and every subsequent move rotates the wrong
physical pieces while the logical engine — which was never wrong — keeps
correctly tracking an entirely different, purely abstract puzzle. This is
the exact same class of bug `NxNCubeGame.tsx` avoids by filtering cubies on
their *current* `grid` position rather than their original index; the fix
here is the same idea applied to piece groups: resolve
`edgeGroups[logicalState.ep[slot]]` (look up which piece is currently at
each nearby slot) instead of `edgeGroups[slot]`, using the state as of
*before* the move being applied. Verified with 3000+ scramble/solve round
trips at the logic layer (`lib/pyraminx-engine.ts`) and repeated
scramble→solve→visually-check-solved cycles in the browser after the fix.
