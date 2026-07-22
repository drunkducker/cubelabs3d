# Cube Engine Notes

Last updated: 2026-07-22, America/New_York (added mobile-first
timer/undo/scramble-history/swipe-to-turn section)

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

## Pyraminx: mobile-first interaction — timer, undo, scramble history, swipe-to-turn

Once the Pyraminx rendered and turned correctly, it was brought up to parity
with the concepts a "shareable challenge" needs to eventually track across
every puzzle in this repo: how many moves a solve took, how long it took,
whether it's been solved, what scramble produced the current state, and the
ability to undo a mistake. `app/PyraminxGame.tsx` tracks all five today;
`app/NxNCubeGame.tsx` currently only tracks moves and undo (no timer,
solved-state check, or recorded scramble sequence) — worth revisiting for
parity if the challenge layer needs the same shape of data from every engine.

**Timer — single long-lived interval plus two refs, not effect-driven
restarts.** A naive React timer (`useEffect` that starts/stops a
`setInterval` based on some "is running" state) tends to fight itself: every
state change that should merely *display* differently ends up re-running the
effect, which resets timing precision and adds churn. Instead there's one
`setInterval` created once in an effect with an empty dependency array and
never torn down until unmount; it ticks every 100ms but only pushes a new
`elapsedMs` when `segmentStartRef.current` is non-null. `startTimer`/
`stopTimer`/`resetTimer` are plain functions that mutate `accumulatedMsRef`
(total time banked from finished segments) and `segmentStartRef` (when the
*current* running segment began, or `null` if paused) — no state, no effect
dependencies, so calling them from deep inside the turn-queue's completion
callback (`runNext`, well outside React's render cycle) needs no special
handling. A turn's completion callback calls `stopTimer()` the instant
`pyraIsSolved()` is true and `startTimer()` otherwise, so the displayed time
is exactly "time spent between scrambled and solved," freezing the instant
the last move of a solve lands.

**Undo and move-count — mirrors `NxNCubeGame.tsx`'s history-length model.**
A `history` array (not React state — a queue-scoped array, same as
`NxNCubeGame.tsx`'s) collects every move that completes with `record !== false`.
`moves` displayed to the player is just `history.length`; `undo()` pops the
last entry, computes its inverse (`direction` flipped, same `vertex`/`depth`),
and queues that inverse move with `record: false` so undoing doesn't itself
count as a move or become re-undoable in the wrong direction. Scramble setup
and "Reset Puzzle" (which is implemented as "solve, but discard the
attempt" — see below) both queue their moves with `record: false` and clear
`history` immediately, since neither represents the player's own solving
effort.

**Scramble history display.** `randomScramble(9)` already returns a
human-readable notation string (the same one `queueSequence` consumes after
splitting on spaces); `scramble()` just also stashes that string in
`scrambleSequence` state and renders it under a "SCRAMBLE" heading. This
gives a player (or, eventually, a shared-challenge link) the exact sequence
that produced the current puzzle state, not just a "scrambled" flag.

**"Reset Puzzle" reuses the solver instead of snapping transforms.**
Rather than a second, untested code path that resets each piece group's
transform directly, `resetPuzzle()` calls `pyraSolve(logicalState)` — the
same verified BFS solver `solveNow()` uses — and queues its moves with
`record: false`, animating back to solved through the exact same turn
machinery as every other move. One fewer thing to get subtly wrong, at the
cost of reset taking a few animated turns instead of being instant; judged
worth it given how much scrutiny bug 4 above needed to get turning correct
in the first place.

**Swipe-to-turn — a screen-space tangent-projection generalization of
`NxNCubeGame.tsx`'s `resolveGesture`.** `NxNCubeGame.tsx` only ever turns
around world-aligned x/y/z axes, so it can score "which axis does this drag
mean" against a small fixed table of screen-projected axis directions. A
Pyraminx turn axis passes through one of 4 *vertices* of a tetrahedron —
there's no fixed table, since the axis depends on which vertex the player
actually touched. The general form both cases are really doing: for a
candidate axis, the instantaneous world-space direction a point at the
touched location would move under a small *positive* rotation about that
axis is the cross product `axis × hitPoint` (the standard rotational-velocity
formula — since every Pyraminx axis passes through the origin, the touched
point's own position vector doubles as its offset from the axis). Projecting
that tangent direction into screen space and taking its dot product with the
actual on-screen drag vector scores how well each candidate axis explains
the drag the player made; the highest-magnitude score wins, and its sign
gives the turn direction. A tip sticker has exactly one candidate vertex
(itself, per `Pick.kind === "tip"`); an edge sticker straddles two
(`EDGE_PAIRS[edge]`, since an edge sticker's drag could plausibly mean either
of its two endpoint vertices) — mirroring how `NxNCubeGame.tsx`'s
`resolveGesture` picks among a small set of candidate axes rather than
assuming just one. Implemented via `resolveGesture`, `projectedScreenDirection`,
and `setPointerFromEvent` in `app/PyraminxGame.tsx`, using the Pointer
Events API (`pointerdown`/`pointermove`/`pointerup`/`pointercancel`, with
`touchAction:"none"` on the canvas) so mouse and touch share one code path.
A short drag (under 16px) does nothing yet; past that it live-previews the
resolved move by glowing the affected pieces (`highlightMove`) and updating
the status line; releasing past 34px commits the move, and releasing short
of that cancels back to camera-orbit behavior — the same two-threshold
"preview, then commit" shape `NxNCubeGame.tsx` uses for its own swipes.

## NxN cube: brought up to the same tracked-state shape as the Pyraminx

`app/NxNCubeGame.tsx` (both `/play/10x10` and `/solver/4x4` — one component,
different `size`/`variant` props) previously tracked only moves and undo.
The Pyraminx build above added a timer, solved-state detection, and a
displayed scramble sequence on top of those two; this retrofit brings the
NxN engine up to the same five concepts, so every puzzle in this repo now
exposes the same shape of state for the shareable-challenge layer being
built around them.

**Solved-state detection has no separate logical layer to check, unlike the
Pyraminx.** `lib/pyraminx-engine.ts` keeps its own abstract `PyraState` that
`isSolved()` can check directly. The NxN cube has no equivalent — `Cubie.grid`
*is* the ground truth, updated in place as pieces are reparented through each
turn's pivot group. So `isSolved()` here checks the physical state itself:
every cubie's `grid` must match its `home` position AND its `mesh.quaternion`
must be within a small epsilon of identity. Position alone isn't sufficient —
a cubie can cycle back through several turns to its own home slot while still
carrying a net 90°/180° rotation from turns that spun it in place along the
way, which would show correctly-colored stickers facing the wrong direction.
`mesh.quaternion` already holds exactly this net rotation for free: `attach()`
(used to reparent a cubie into and back out of each turn's pivot group)
preserves world transform across the reparent, so orientation state doesn't
need any separate bookkeeping — just reading it back out.

**Timer:** identical single-long-lived-`setInterval`-plus-two-refs pattern as
`app/PyraminxGame.tsx` (see that section above for the full rationale) —
`startTimer()`/`stopTimer()` called from `runNext()`'s move-completion
callback based on the freshly computed `isSolved()` result, so elapsed time
is exactly "time spent between scrambled and solved," freezing the instant
the last move of a manual solve lands.

**Scramble semantics changed to match the Pyraminx, not just gained a
timer.** Before this, `scramble()` queued its moves with `record: true` —
they counted toward the move total and were individually undoable, so a
player could technically "solve" a scrambled cube by undoing through the
entire scramble one move at a time rather than actually solving it, and the
move counter included moves the player never made. `scramble()` now queues
with `record: false` (identical to `app/PyraminxGame.tsx`'s scramble), clears
`history` immediately, and stores the generated sequence for display under a
"SCRAMBLE" section — same rationale as the Pyraminx: the move count and undo
stack should reflect the player's own solving effort, not the setup. This is
a deliberate behavior change from the NxN engine's prior semantics, made for
cross-engine consistency.

**Reset Cube stays a direct transform snap, unlike Pyraminx's animated
"Reset = Solve".** The Pyraminx's `resetPuzzle()` reuses its verified BFS
solver to animate back to solved. The NxN engine has no general solver (the
`/solve` hub is explicit that 4x4+ solving is "still in development"), so
there's nothing to animate through — `resetCube()` still snaps every cubie's
`mesh.position`/`quaternion`/`grid` back to `home` directly, instantly. It
now also resets the timer, scramble-sequence display, and solved-state flag,
and is guarded (function body and both Reset Cube buttons) against running
on an already-solved cube, matching the Pyraminx's equivalent guard on
`resetPuzzle()`.
