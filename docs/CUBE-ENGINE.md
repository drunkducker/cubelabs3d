# Cube Labs 3D — Cube Engine

**Last reviewed:** 2026-07-27

This document defines the permanent cube-engine architecture and records recovered branch findings without treating unmerged work as shipped.

## Canonical engines on `main`

- `app/NxNCubeGame.tsx` — playable NxN engine used by larger cube routes.
- `components/NotationCube.tsx` — notation/explainer cube.
- `app/PyraminxGame.tsx` and `lib/pyraminx-engine.ts` — Pyraminx renderer, state model, and solver.
- `app/KilominxGame.tsx` and `lib/kilominx-engine.ts` — Kilominx renderer,
  state model, verified reduction solver, and saved-scramble integration.
- Detailed implementation, bug-analysis, camera, framing, viewport, and visual
  positioning references are consolidated later in this file.

## Required engine boundaries

- Puzzle logic should be renderer-independent where practical.
- Renderers may animate state but must not become the only durable representation of challenge or solver state.
- Move notation, scramble state, player history, timing, solved status, and assistance flags must be separable.
- Shared challenge payloads must be versioned and independent of camera position and Three.js object identity.
- Mobile touch behavior is a first-class requirement.
- Homepage behavior must not be changed indirectly through shared engine work without explicit approval and verification.

## Pyraminx physical-state solver (draft PR #11)

`agent/pyraminx-manual-solver` corrects the earlier simplified model and applies the solver/play route boundary from ADR 0005:

- `PyraState` owns six edge identities/orientations, four axial-center orientations (`co`), and four absolute tip orientations (`to`).
- A shallow lowercase move changes one tip only. A deep uppercase move changes that tip and axial center and cycles/flips the three touching edges.
- `solveCore()` uses exact bidirectional search against the renderer-independent edge + axial-center state; `solveTips()` then cleans up the four independent tips. `solve()` applies the result back to the input and throws unless the full state is solved.
- `lib/pyraminx-facelets.ts` maps the physical state to all 36 visible stickers (12 tip, 12 center, 12 edge), reconstructs legal pieces, and rejects unreachable states through the exact solver.
- `lib/pyraminx-net-layout.ts` unfolds a tetrahedron net from the same geometry and preserves the facelet order; `components/PyraminxSolver.tsx` provides scramble and manual-entry modes plus verified flat-net playback.
- `/solver/pyraminx` is the real solver and `/play/pyraminx` is the interactive game. `app/PyraminxGame.tsx` assigns the three center stickers around each vertex to one moving axial-center group so visual turns match the state model.
- Branch evidence: strict type checks, randomized state/facelet/solve round trips, exhaustive reachable-core traversal, impossible-state fixtures, and PR CI. Hosted phone/browser evidence remains required before `[x]` status.

## Kilominx solver: engine vs optimized planner (branch)

`lib/kilominx-engine.ts` stays the source of truth — geometry, moves, validation,
verification, and a correct but not move-optimal reduction `solve()`. A
move-count-optimized planner (`lib/kilominx-solver-optimized-impl.js` +
`lib/kilominx-solver-optimized.ts`) emits ~19% shorter solutions by picking
3-cycles that fix the most corners and orientation primitives by boundary cost.
`lib/kilominx-engine-public.ts` is the application entrypoint: it re-exports the
engine and overrides `solve` with the optimized one.

Per ADR 0007, application code reaches the optimized `solve()` through a tsconfig
`paths` redirect of `@/lib/kilominx-engine` to the public entrypoint. That
redirect must use an **extensionless** value — with a `.ts` extension Next.js
silently ignores it and ships the legacy solver — so any change here is verified
by confirming the built bundle contains the optimized planner, not just by tests
(Vitest ignores tsconfig `paths` and resolves `@` to the repo root). Branch
`claude/kilominx-solver-3d-page-wbyyay`; not yet on `main`.

## Solver 3D playback pattern (cookie-cutter)

Every `/solver/<puzzle>` page shares one shape: choose a state (scramble or
manual entry), get a verified solution, and watch it play back. The playback
renderer is facelet-driven and engine-tracked — it is not a second state model:

- The 3D cube starts geometrically **solved** and every sticker is coloured from
  the state's facelet snapshot, so a scramble renders as its scramble.
- Solution moves physically animate; move/layer selection tracks a logical state
  seeded at `solved()` and advanced by the engine's own move application, so the
  3D view and the flat net show the same state at every step.
- Single-step changes animate; multi-step scrubs rebuild instantly.

`components/NxNSolverCube3D.tsx` is the reference implementation (4×4/5×5).
`components/KilominxSolverCube3D.tsx` is the corners-only dodecahedron analogue
(branch `claude/kilominx-solver-3d-page-wbyyay`, not yet on `main`); it reuses
the play page's geometry and CCW kite ordering (`FACE_CORNERS_CCW`) so colouring
aligns by construction. Per ADR 0006 a solver playback cube may add inspect-only
swipe-to-turn plus a camera-only "Lock rotation" toggle; manual turns are
non-authoritative and resync to the solution step on the next playback change.
Do not give a solver playback a second, renderer-owned state path.

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

This is now merged to `main` via the 2026-07-27 Skewb + documentation
reconciliation merge. Hosted phone drag feel/direction, native share or
clipboard behavior, signed-in save, and a two-account friend challenge remain
unverified.

## Verified fixes already documented on `main`

- Animation-frame cleanup when a puzzle unmounts during a turn.
- NxN scramble selection across inner and outer layers.
- High-DPI canvas sizing and viewport correction.
- Pyraminx geometry winding and interior-surface corrections.
- Pyraminx logical/visual piece-selection correction.
- Pyraminx timer, undo, scramble history, solved-state behavior, and swipe-to-turn interaction.

The detailed causes and implementation notes remain in the engine journal
section below.

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
- [x] The canonical implementation is documented in the engine journal below.
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

Recovered from the former root engine notes on
`claude/cube-engine-centering-zb2e9m`. The original branch remains historical
evidence.

## Detailed engine reference and active handoffs

Engine bug analyses, camera recipes, and the unfinished deterministic 5×5
handoff are consolidated below. Read only the section relevant to the active
puzzle; search this file by puzzle name, symptom, or source filename.

---

## Engine implementation journal

> Consolidated from `CUBE-ENGINE-NOTES.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: CUBE-ENGINE-NOTES.md -->
# Cube Engine Notes

Last updated: 2026-07-27, America/New_York (added final Skewb renderer,
gesture, solver, result-save, and friend-send architecture)

This file tracks internals of the hand-rolled three.js cube engines —
`app/NxNCubeGame.tsx` (the playable NxN engine behind `/play/10x10` and
`/solver/4x4`), `components/NotationCube.tsx` (the homepage explainer
cube), `app/PyraminxGame.tsx` + `lib/pyraminx-engine.ts` (the Pyraminx
at `/solver/pyraminx`), and `app/SkewbGame.tsx` + `lib/skewb-engine.ts`
(the Skewb at `/solver/skewb`) — which share the same low-level pattern: a manual
`THREE.WebGLRenderer` plus `OrbitControls`, rather than `@react-three/fiber`.
For visual framing (camera distance, centering, sticker look), see the camera
and perspective section later in this document. This section is for engine
correctness and behavior bugs that are not about how the puzzle looks.

## Skewb: final PR #9 engine and interaction model

The first Skewb implementation went through several visibly different repairs.
The final review version is draft PR #9, remote head `c3b5502` (local
verification equivalent `15faac9`). Earlier 52/55/56/59-test records in the
repository describe intermediate states and do not supersede this section.

**Renderer/state split.** `lib/skewb-engine.ts` is the durable source of truth
for corner and center positions, legal 120° turns, parsing, inverses, scramble
generation, solved detection, and state search. `app/SkewbGame.tsx` owns Three.js
objects and animation only. After each animation, the renderer snaps to the
engine's exact discrete state so floating-point transforms cannot become puzzle
truth.

**Fourteen real moving bodies.** The renderer uses eight corner bodies and six
center bodies rather than colored decals moving over a stationary black box.
A legal turn moves exactly seven bodies: four corners and three centers. The
black plastic gaps travel with those bodies, so the moving layer reads like the
3×3, 4×4, and Kilominx instead of a sticker overlay.

**All eight corner pivots are interaction targets.** The intermediate version
exposed only four fixed corner halves. After several turns, a sticker could have
one, two, or three candidate layers depending on where it moved, which caused
the reported “breaks after about three moves” behavior. The final model exposes
both directions of all four body diagonals—eight physical corner pivots—so
every colored sticker keeps four valid turn choices after any legal sequence.

**Direct drag preview.** In Turn Pieces mode, a raycast may start on any colored
corner or center sticker. Candidate legal layers are resolved from the touched
piece, their tangents are projected into screen space, and the closest legal
120° direction follows the pointer continuously. Releasing commits the same
engine move; canceling restores the layer. Rotate View mode gives OrbitControls
the gesture instead. This explicit mode split avoids ambiguous camera/layer
drags on phones.

**Pace and regression sequence.** Normal turns use the shared Cube Labs
460 ms pace, replacing the too-fast 280 ms version. The renderer regression
runs the tutorial sequence `R' F R F'` twice and checks that each move still
selects seven bodies and leaves exact transforms. This catches the original
third/fourth-move failure at the visual layer, not only in the logical engine.

**State-based solver.** Solve uses bidirectional search from the exact current
engine state, prunes redundant same-axis turns, and verifies the returned
sequence before playback. It does not rely on reversing session history.
Auto-solve marks the attempt assisted, so it cannot be saved as a legitimate
completed result.

**Save and send contract.** The inline `UniversalPuzzleActions` instance
receives the current Skewb scramble and a `PuzzleAttemptSnapshot`.
`lib/puzzle-attempt.ts` validates completed unassisted attempts and builds the
same tracked-result envelope used by the 3×3 flow: elapsed time, move count,
undo count, touch/button counts, assistance flags, and move history. The visible
actions are:

- Save Start — stores the exact start state in solver memory;
- Share Link — native share sheet with clipboard fallback;
- Save Result — writes a completed unassisted timed result;
- Send to Friend — sends the exact start state and attaches the saved result
  when one is available.

Unsolved starts can still be sent. A changed scramble invalidates a stale result
fingerprint. Signed-in save/send and a two-account challenge remain hosted
verification gates; the branch tests validate the request contract but do not
replace production database/RLS proof.

**Verification at the current review head.** 64 Vitest tests pass across nine
files, including Skewb engine, Three.js renderer transforms, and shared puzzle
attempt payloads. TypeScript is clean, lint exits successfully with existing
unrelated warnings, the production build succeeds, `/solver/skewb` prerenders,
and Vercel reports success for `c3b5502`. The branch is not merged into `main`.

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
<!-- END CONSOLIDATED SOURCE: CUBE-ENGINE-NOTES.md -->

---

## Camera and perspective reference

> Consolidated from `CUBE-PERSPECTIVE-NOTES.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: CUBE-PERSPECTIVE-NOTES.md -->
# Cube Perspective Notes

Last updated: 2026-07-27, America/New_York

For engine-internals bugs (not visual framing), including animation-frame
cleanup and scramble behavior, see the engine implementation journal earlier in
this document.

## Goal

Future playable cube blocks should open with the same visual feel as the good 3x3 hero cube: a real object sitting in the card, not a flat solver panel and not a giant cropped wall.

The best-looking reference is the view where the cube's lower point sits near the lower center of the viewport. The cube should feel slightly above and behind that point, with the front/right/top faces visible and enough room around the object to read the full shape.

## Current 4x4 Focus Recipe

Use this as the baseline when recreating the current 4x4 perspective:

- Keep the cube at the scene origin and keep the orbit target at the origin,
  the same as the hero/3x3/2x2 cubes. Do not translate the cube's root group
  away from `(0,0,0)` to fake an off-center composition — that decouples the
  visual position from the orbit pivot, so the cube swings away from camera
  center as soon as it's rotated, and any camera-distance error gets read as
  "stuck in a corner" instead of "too small/too far".
- Pick the camera distance from the cube's actual half-extent so it fills the
  frame at the same ratio as the hero cube: `distance = 5.02 * (edge + 0.468)`
  where `edge = (size - 1) / 2`. A flat `size * constant` multiplier drifts
  out of proportion as `size` changes.
- Keep the canvas transparent so the cube card background does the visual framing.
- Do not add a platform ring or decorative circle under the cube.

## Skewb parity recipe

Draft PR #9 establishes the Skewb visual contract used for review:

- Use the same dark stage, neutral camera, restrained lighting, and compact
  control-card density as the 3×3, 4×4, and Kilominx.
- Render eight corner bodies plus six center bodies. Do not return to a
  stationary cube with colored decals sliding over it.
- Preserve visible black plastic between pieces and let the black borders move
  with the selected seven-piece layer.
- Keep the puzzle large enough for phone raycasting without cropping it.
- Use explicit **Turn Pieces** and **Rotate View** modes; the selected layer
  follows the finger in Turn Pieces mode.
- Use the shared 460 ms normal turn pace. Faster 280 ms turns were judged too
  abrupt and made the puzzle feel unlike the other Cube Labs engines.
- Accept drags from every colored sticker, including center diamonds. A
  sticker-only corner hotspot is too small and does not match the established
  puzzle interactions.
- Keep Save Start, Share Link, Save Result, and Send to Friend in a compact
  in-page card below the puzzle instead of floating outside the application
  shell.

This is review-branch guidance until PR #9 is merged. Phone drag feel, turn
direction, orientation changes, and native share-sheet layout still need a
recorded hosted-device pass.

## High-DPI Canvas Overflow (root cause of the 2026-07-22 centering bug)

The manual three.js cubes (`app/NxNCubeGame.tsx`, `components/NotationCube.tsx`)
build their own `THREE.WebGLRenderer` instead of using `@react-three/fiber`'s
`<Canvas>`. Their resize handler called:

```
renderer.setSize(w, h, false);
```

The third argument (`updateStyle`) is `false`, so three.js sets the canvas's
`width`/`height` HTML attributes to the drawing-buffer resolution
(`container size * devicePixelRatio`) but never touches `canvas.style.width` /
`canvas.style.height`. A `<canvas>` with no CSS constraining it renders its
box at those attribute values interpreted as CSS pixels.

On desktop testing (`devicePixelRatio` 1) the attribute values equal the
container size, so the bug is invisible — the cube looks centered. On a real
phone (`devicePixelRatio` ~2-2.75), the canvas box balloons to 1.5-2.75x the
card size, overflows it, and gets clipped by the card's `overflow-hidden`
rounded corner. Because that clip anchors top-left, the visible slice shows
the cube pushed toward the bottom-right and cropped, even though the camera
math underneath is centering it correctly.

This is why the first centering fix (removing the `focusOffset` root-position
hack, see below) looked right in desktop screenshots but the user still saw a
cropped, bottom-right-shifted cube on their actual Android phone — two
separate bugs stacked on the same symptom description ("won't center").

**Diagnosis method:** desktop Playwright screenshots didn't reproduce it;
emulating a real phone's pixel ratio did — `newPage({ deviceScaleFactor: 2.75,
viewport: { width: 412, height: 892 } })` reproduced the exact bottom-right
crop from the user's phone screenshots, confirming the theory before touching
code.

**Fix:** explicitly set the canvas's CSS box right after creating the
renderer, independent of `setSize`'s `updateStyle` flag:

```
renderer.domElement.style.display = "block";
renderer.domElement.style.width = "100%";
renderer.domElement.style.height = "100%";
```

`@react-three/fiber`'s `<Canvas>` (used by `RubiksCube.tsx`, `PocketCube3D.tsx`,
`SolverCube3D.tsx`, `InteractiveHeroCube.tsx`) does this internally, which is
why those cubes never showed the bug. Any future hand-rolled three.js cube in
this repo needs the same explicit canvas sizing, or should just use
`@react-three/fiber` instead.

## Visual Anchor

When checking the view by eye:

- The cube should not default to the far lower-right corner.
- The cube should not be cropped by the card.
- The bottom point/corner of the cube should sit near the lower center of the card.
- The top face should be clearly visible, but not so dominant that the front face feels short.
- The side face should show depth without turning the cube into a side-view tool.

## Sticker Look

The preferred cube style is the 3D sticker look from the good 3x3:

- Cubies use a dark/black body.
- Stickers are separate raised pieces, not just flat face colors painted onto the cubie.
- Stickers should have small gaps between them so each mini square is readable.
- Stickers should be slightly rounded or beveled when possible.
- Highlight effects should hit the raised stickers, not the black cubie body.

## Controls

For public-facing solver/play pages:

- Touch/swipe should be the main interaction.
- Buttons should be hidden, collapsed, or treated as backup controls.
- Avoid playback-style controls on playable cube pages unless the page is specifically a replay/demo view.
- Avoid large control panels above the cube. The first read should be the cube itself.

## Reuse Guidance

For future cube blocks, start from this order:

1. Use the playable cube engine.
2. Apply the hero/focus camera framing.
3. Apply the lower-center cube-point anchor.
4. Use raised sticker geometry.
5. Hide backup controls until needed.
6. Check the first default view before tuning touch mechanics.

This note exists because the correct feel was found visually: the cube needs to look like the clean 3x3/hero card first, then become playable underneath.
<!-- END CONSOLIDATED SOURCE: CUBE-PERSPECTIVE-NOTES.md -->

---

## Deterministic 5×5 solver handoff

> Consolidated from `5X5_SOLVER_HANDOFF.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: 5X5_SOLVER_HANDOFF.md -->
# 5×5 Solver — Engineering Handoff

_Last updated: 2026-07-22. Branch: `claude/new-session-euaf6s`._

> **Historical, feature-specific handoff.** Reviewed on 2026-07-27. This file
> remains the detailed record of the deterministic 5×5 blocker, but it is not
> the current whole-project status or the active Skewb handoff. Use
> [`docs/CURRENT_STATUS.md`](./CURRENT_STATUS.md) and
> [`docs/ROADMAP.md`](./ROADMAP.md) for current priorities. Re-verify this
> branch against `main` before reusing any implementation detail.

This document explains the current state of the 4×4 and 5×5 solver work so
another engineer or AI can continue without re-deriving everything.

## TL;DR

- **4×4 full solver: DONE, verified, shipped.** Works like the 3×3 page
  (scramble or hand-enter → Solve → verified 3D playback). Do not touch unless
  improving it.
- **5×5: engine solid, full solver NOT working yet.** The reduction search
  (both centers and edges) has a bad worst-case: the full pipeline **times out
  (>90 s) on every cube sampled**. The shared engine, fast model, and the
  reduced→cubejs→verify handoff are all verified. The blind-search reduction is
  the problem.
- **Recommended fix:** replace the blind-search 5×5 reduction with the
  **deterministic commutator method** (explicit piece tracking + known
  insertion algorithms), for both centers and edge triplets. Details below.

## What ships NOW (interim): reduced-state + manual 5×5

Because the full arbitrary 5×5 solver isn't dependable yet (see below), the
**shipped** 5×5 experience is an honest **reduced-state solver with manual
entry**, built on the verified engine — the exact slice the original review
handoff recommended starting with.

`components/FiveSolver.tsx` + `app/solver/5x5/page.tsx`:
- **Reduced scramble** demo: outer-move-only scrambles stay reduced (centers
  54/54, edges 12/12), so they solve fully via the 3×3 handoff and play back
  verified. This is a real 5×5 solve.
- **Full scramble** / **manual entry**: the net accepts any 5×5 state; the app
  scores reduction (centers X/54, edge bars Y/12). If the state is reduced it
  solves + verifies; if not, it says so honestly ("full center/edge reduction
  is in development") rather than pretending. Manual entry validates 25 stickers
  per color and runs the same reduced→cubejs→verify path.
- Runs on the main thread (the reduced solve is just a fast 3×3 `cubejs` call —
  no heavy search, no worker). Uses `NxNSolverCube3D size={5}` for playback.
- Hub status is **"REDUCED READY"**, not "READY", to stay honest.

The full-solver work below (`cube5-reduction.ts` / `cube5-solver.ts`) remains in
the tree, unwired, for whoever picks up the deterministic rewrite.

## Commit map (branch `claude/new-session-euaf6s`)

- `0a97c36` — 4×4 full solver (complete, verified).
- `6d0923b` — initial in-progress 5×5 engine.
- `79f6559` — WIP staged 5×5 center reduction (correct, timing unreliable).
- `f86cb84` — gitignore local package-lock.json.

Base of this branch is the feature branch `claude/cube-engine-centering-zb2e9m`
(manual-entry 3×3, legality guard, net layout), chosen so the new solvers match
the 3×3 UX.

---

## What is DONE and verified

### Shared NxN engine — `lib/nxn-cube.ts`
Geometric cubie model (grid position + colored stickers), size-parameterized.
Provides `solvedCube(size)`, `applyMove`/`applySequence`, `inverseMove`,
`toFacelets`, `toReducedFaceletString` (samples a reduced NxN down to a 54-char
3×3 string for cubejs), `centerProgress`, `edgeReductionProgress`,
`reductionSummary`, `randomScramble`, `faceGridCoordinate`.

Verified: 500 scramble+inverse round trips per size (4 and 5), order-4 per move,
`(R U R' U')^6 == identity` (chirality consistency), and — critically — 40
reduced-scramble → `toReducedFaceletString` → `cubejs.solve()` → apply-back →
**solved** round trips for BOTH sizes. **The reduced→3×3 handoff is proven for
5×5.**

### Fast facelet layer — `lib/nxn-fast.ts`
The geometric engine rebuilds object arrays per move — ~100× too slow for
search. This layer precomputes, per move token, a facelet permutation over a
`Uint8Array` (colors 0–5, U,R,F,D,L,B row-major), derived from the geometric
engine and **cross-checked against it** (300 random sequences/size, facelets +
every metric identical). Key exports: `buildFastModel(size)`, `applyFast`,
`applyFastSeq`, `sequencePerm` (compose multi-token moves into one perm),
`centerProgressFast`, `edgeProgressFast`, `isSolvedFast`, `stateKey`,
`reducedFaceletStringFast`, `stateFromFaces`.

### 4×4 full solver
- `lib/cube4-reduction.ts` — centers + edge-pairing search (conjugate,
  commutator, wide-wrapped-core, last-edge bank, IDA\* backstop). On the fast
  model.
- `lib/cube4-solver.ts` — full pipeline: `reduce4` → fix 4×4 **OLL/PLL parity**
  (both algs empirically verified: stay reduced, toggle only their own parity,
  self-inverse) → cubejs on the reduced 3×3 → concatenate → **verify the whole
  solution on the real cube** before returning. Also `simplifyMoves` (cancels
  adjacent same-layer turns).
- `components/solver4.worker.ts` — runs the solve off the main thread.
- `components/NxNSolverCube3D.tsx` — facelet-driven NxN 3D playback (outer +
  wide turns), colored from the actual cube state; serves 4×4 now and 5×5 later.
- `components/FourSolver.tsx` — scramble + manual sticker entry, verified
  solution stepper, 3D playback, worker + solve-timeout guard.
- `lib/nxn-net.ts` — generalized NxN cross-net layout for manual entry.
- Routes: `/solver/4x4` = solver; `/play/4x4` = the playable game; hub updated.

**4×4 verification:** ~48 random cubes solved with zero failures (every
solution replayed to solved; all OLL/PLL parity cases handled). Browser test:
scramble → Solve → "Verified solution — 151 moves" with correct playback.

Typical 4×4 numbers: solve ~6–18 s in the worker, ~100–150 move solutions
(greedy reduction is correct but not short/fast). Acceptable but improvable.

---

## 5×5 — current state and exactly where it breaks

Files (committed, **not wired into any page**, so they don't affect the build
or the shipping 4×4):
- `lib/cube5-reduction.ts` — staged center solver + edge solver.
- `lib/cube5-solver.ts` — full pipeline (mirror of cube4-solver): `reduce5` →
  parity → cubejs → verify.

The 5×5 engine (sizes handled by nxn-cube / nxn-fast) is verified. The
**reduction search** is the blocker.

### Centers — staged, correct, timing unreliable
`solveCenters` (in `cube5-reduction.ts`) solves centers in the standard
reduction order, which is the right structure:
1. Stage 1: U face (unconstrained).
2. Stage 2: D face, preserving U.
3. Stage 3: the four belt faces together, preserving U and D.

Staging fixed the global-greedy stall (global search hit local minima with no
bounded escape — it got "stuck at 39–45/54"). Within each stage, most center
pieces place in **milliseconds** via cheap tiers.

**The problem:** a few "hard" insertion steps per solve fall through the cheap
tiers into expensive search. Timing is **highly variable** — some cubes ~250 ms,
others hang for minutes. Fixes already applied (all real improvements, keep
them):
- **Numeric FNV hash transposition table** in `tryIdaStar` — took endgame IDA
  from ~60 s to sub-second on the cases it hits. (String `stateKey` per node was
  the bottleneck.)
- **`tryDoubleFetchConjugate`** — two-move fetch so a piece on the *opposite*
  face (two slices away) can be inserted; a single-fetch conjugate can't reach
  across the cube and stranded last centers.
- **Rich framing set** (`frame`: outer + wide + slice) for the conjugate tiers —
  the endgame insertions are often *wide-move-framed* (e.g. the diagnostic found
  a stuck U=7 fix `Fw' Rw Dw' Fw` = conjugate of `Rw Dw'` by `Fw'`), which an
  outer-only frame can't express.
- **`tryConjugatedCommutator`** (slice × outer, both directions) — the canonical
  center 3-cycle `r U r' U'`; a fetch×fetch commutator never tries it and the
  endgame centers need it.
- Inner-slice moves (`Rs = Rw R'`) as search primitives that **expand back to
  standard outer/wide tokens** in the emitted solution (so playback/verification
  never see a non-standard move). See the `MOVES` map at the top of the file.

**Still not good enough:** the endgame insertions are varied 5–9 move sequences;
no fixed tier shape covers them all cheaply, and IDA at the needed depth has a
bad tail. **Result: some cubes' center solve alone exceeds 90 s.**

### Edges — UNVALIDATED (likely also needs 5×5-specific work)
`solveEdgePairs` currently reuses the 4×4 machinery (wide-wrapped-core +
4×4 last-edge bank). **This has not been shown to work for 5×5**, and 5×5 edges
are structurally different: each of the 12 edges is a **triplet** (2 wings + 1
middle "midge"), versus the 4×4's 2 wings. Pairing a triplet and handling the
last-two-edges/flipped-midge parity needs 5×5-specific algorithms.

**Testing caveat (learned the hard way):** to test edges you need a state with
centers **actually solved (54/54)** and edges unpaired. Do NOT assume
`[wide][outer core][wide']` preserves centers — it only does for *specific*
cores (the wrapped-core tier *searches* for center-preserving cores; it isn't
inherently preserving). A naive edge-scramble left centers at 38/54 and
`solveEdgePairs` (constraint: centers==54) then can never make progress and
hangs. Build test states by **filtering** random wrapped sequences to only those
that keep `centerProgressFast == 54` (see `c5edge2.mjs` in scratch). Edge
correctness/speed is still **unconfirmed** — validate this first.

### Parity — verified for 4×4, unverified for 5×5
`cube5-solver.ts` reuses the 4×4 OLL and PLL parity algs. On an odd cube (5×5)
PLL parity shouldn't occur, and the OLL (single-flip) alg may or may not behave
identically. **Verify empirically** once you can reach reduced 5×5 states (apply
alg to a solved-reduced 5×5, confirm it stays reduced and toggles only edge
orientation).

---

## Recommended path forward: deterministic reduction

Blind search is the wrong tool for 5×5 reduction. Real solvers use deterministic
piece-by-piece methods. Concretely:

### Centers (commutator insertion)
Solve centers in fixed order (first face, opposite, belt). For each unsolved
target slot: locate a correct-color piece, bring it to a fixed **buffer** slot
with a short setup, then apply a **known insertion commutator** that places it
onto the target face without disturbing already-placed centers. This is O(pieces)
and has no search tail. The hard part is correct piece tracking and a small table
of insertion algs per (buffer, target) relationship. The `nxn-fast` model already
gives you fast state + perms to build and verify these algs against.

### Edge triplets
Standard 5×5 edge pairing: pair the wings with the midge using slice/wide moves,
handle the last-two-edges case (including the flipped-midge parity) with the
known algorithm. Verify each alg preserves centers and improves edge count on the
fast model before trusting it (same discipline used for the 4×4 parity algs).

### Then reuse what already works
Once reduced: `reducedFaceletStringFast` → `cubejs.solve()` → apply 3×3 moves
(as 5×5 outer turns) → `isSolvedFast` verify. **This tail is proven** (40/40).
Fix 5×5 parity if the reduced 3×3 is illegal (reuse the cube4-solver structure).

### UI (straightforward once reduction is reliable)
Mirror `FourSolver.tsx` → a `FiveSolver.tsx`: 150-sticker manual net
(`nxnNet(5)`), 25/color validation, worker (`solver5.worker.ts` wrapping
`cube5-solver.solveState`), `NxNSolverCube3D size={5}`. Add `app/solver/5x5/`
page and a hub card. All these patterns exist for 4×4 — copy them.

---

## How to test (scratch harness)

Scratch dir: `/tmp/.../scratchpad/cubetest` (ephemeral — recreate if gone). It
has `cubejs@1.3.2` installed and copies of the lib files with `.ts` import
extensions added (Node ESM needs them; the repo uses extensionless for webpack).

Run with `node --experimental-strip-types <file>.mjs` (Node 22). Set `RS_DEBUG=1`
to get per-step tier/timing lines from `solveByProgress` and per-stage stamps
from `solveCenters`.

Useful existing scratch scripts: `engine-test.mjs` (engine cross-checks),
`fast-check.mjs` (fast vs geometric), `c5batch.mjs` (center timing),
`c5edge2.mjs` (edge isolation with *correct* state construction),
`c5one.mjs` (full pipeline single solve).

**Always run heavy searches with a per-cube subprocess timeout** (`timeout 25
node ...`) so one hang doesn't block the batch — that's how the >90 s tail was
measured.

## Gotchas / lessons

- `[wide][core][wide']` does **not** inherently preserve centers (see edge
  testing note). The wrapped-core tier *searches* for preserving cores.
- Outer face turns preserve every *other* face's center count (they only touch
  their own outer layer), but a face's own outer turn just permutes its own
  centers — fine for counts.
- Restricting a constrained stage to only "preservation-safe single moves"
  **fails**: you can't move a piece to the opposite/belt face without a slice
  that transiently disturbs a solved face; you need preserving *sequences*
  (commutators / wrapped cores) checked at sequence end.
- IDA\* with a per-node string key is far too slow; use the numeric hash.
- The greedy `solveByProgress` produces long solutions (100–150 moves for 4×4).
  A better move-cancellation / optimization pass would help playback length.
<!-- END CONSOLIDATED SOURCE: 5X5_SOLVER_HANDOFF.md -->

---

## Archived 5×5 continuation brief

> Consolidated from `AI_CONTINUATION_PROMPT.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: AI_CONTINUATION_PROMPT.md -->
# Task: finish the full arbitrary-state 5×5 Rubik's Cube solver

> **Archived task brief, reviewed 2026-07-27.** This prompt is intentionally
> scoped to the unfinished deterministic 5×5 solver and must not be treated as
> the general Cube Labs continuation prompt. Start any new session with
> `docs/README.md`, `docs/GOVERNANCE.md`, `docs/CURRENT_STATUS.md`, and the
> active branch/PR state. The currently active puzzle review is Skewb PR #9;
> the 5×5 work described below remains a separate unmerged workstream.

You're picking up a partially-built cube-solver web app (Next.js 14 + React +
Three.js + TypeScript). A 4×4 full solver is done and shipped. Your job is the
**full arbitrary-state 5×5 solver**, which is blocked on one hard piece.

## Repo / branch
- Repo: `drunkducker/cubelabs3d`
- Work branch: `claude/new-session-euaf6s` (base it on this; it has everything below)
- Read the deterministic 5×5 solver handoff section immediately above first;
  this archived prompt is only the summary.

## The overall solving strategy (reduction method)
An NxN cube is solved by "reduction": solve the 6 centers, pair the edge pieces
so each edge behaves as one, then the cube acts like a 3×3 and is handed to the
`cubejs` library. This whole tail (reduced NxN → 54-char 3×3 facelet string →
`cubejs.solve()` → apply moves back → verify solved) is **already built and
proven for 5×5** (40/40 random reduced states verified). You do NOT need to
touch it. You need to make the **reduction** (centers + edge pairing) reliable.

## What already works (verified — reuse, don't rebuild)
- `lib/nxn-cube.ts` — geometric NxN cube engine (moves, facelets, metrics).
  Verified via 500 round-trips/size, chirality checks, reduced→cubejs→solved.
- `lib/nxn-fast.ts` — fast `Uint8Array` facelet model with precomputed move
  permutations, cross-checked against the geometric engine (identical on 300
  random sequences). Use this for all search — the geometric engine is ~100×
  too slow. Key fns: `buildFastModel(size)`, `applyFast`, `applyFastSeq`,
  `sequencePerm`, `centerProgressFast`, `edgeProgressFast`, `isSolvedFast`,
  `reducedFaceletStringFast`, `stateFromFaces`.
- The full 4×4 solver (`lib/cube4-*.ts`, `components/FourSolver.tsx`, worker,
  `components/NxNSolverCube3D.tsx`) — a working template to copy.
- A shipped **reduced-state** 5×5 solver + manual entry (`components/
  FiveSolver.tsx`, `/solver/5x5`) — solves already-reduced cubes only.

## What's broken (your job)
- `lib/cube5-reduction.ts` and `lib/cube5-solver.ts` exist but are **unwired**
  and **not dependable**: the blind-search reduction times out (>90 s) on every
  full scramble sampled.
  - **Centers**: correctly *staged* (first face → opposite face preserving the
    first → 4-face belt preserving both), and most center pieces place in
    milliseconds. But a few "hard" endgame insertions per solve fall into
    expensive search and blow up the worst case. Many good optimizations are
    already in (numeric-hash IDA transposition table, two-move fetch conjugate,
    wide-move-framed conjugates, slice×outer center commutators, inner-slice
    move primitives that expand to standard tokens) — keep them.
  - **Edges**: 5×5 edges are **triplets** (2 wings + 1 middle "midge"), unlike
    the 4×4's 2 wings. The current code reuses 4×4 edge machinery and is
    **unvalidated** — it likely needs 5×5-specific triplet-pairing + last-two-
    edges/flipped-midge parity algorithms.

## Recommended fix: deterministic reduction (not blind search)
Real solvers don't search — they place pieces deterministically:
- **Centers**: fixed-order commutator insertion. For each unsolved target slot,
  find a correct-color piece, bring it to a fixed buffer slot with a short
  setup, then apply a known insertion commutator that places it without
  disturbing already-solved centers. O(pieces), no search tail.
- **Edges**: standard 5×5 triplet pairing (flip/align midge with its wings) +
  the known last-two-edges parity algorithm.
- Verify every algorithm empirically against `lib/nxn-fast` (apply to a solved
  state, confirm it preserves what it should and changes what it should) before
  trusting it — the 4×4 parity algs were validated exactly this way.
- Then reuse the existing reduced→cubejs→verify tail and the `FourSolver`/
  `NxNSolverCube3D` UI pattern (mirror it into a full-solve path + worker).

## How to test (critical)
- Use Node 22: `node --experimental-strip-types file.mjs`. Install `cubejs`.
  Node ESM needs `.ts` import extensions (the repo uses extensionless for
  webpack — add extensions in your test copies).
- **Always run heavy searches in a subprocess with a hard timeout**
  (`timeout 25 node ...`) so one hang doesn't block a batch.
- Set `RS_DEBUG=1` for per-step tier/timing logs from the reduction search.

## Gotchas (learned the hard way)
- `[wide][core][wide']` does NOT inherently preserve centers — only for
  specific cores. Don't assume it when building test states; filter to
  sequences that actually keep `centerProgressFast == 54`.
- You cannot build the opposite/belt faces using only "preservation-safe single
  moves" — reaching another face needs a slice that transiently disturbs a
  solved face, so you need preserving *sequences* (commutators/wrapped cores).
- Outer face turns preserve every *other* face's center count.
- IDA* with a per-node string state key is far too slow — hash to a number.

## Definition of done
Full 5×5: scramble or hand-enter any cube → reduce (centers + edges) → parity →
cubejs → **verified** solution → 3D playback, reliably within a few seconds,
wired at `/solver/5x5` (upgrade the current reduced-only solver), all off the
main thread in a Web Worker. Aim for >95% of random scrambles solved under ~10s.
<!-- END CONSOLIDATED SOURCE: AI_CONTINUATION_PROMPT.md -->
