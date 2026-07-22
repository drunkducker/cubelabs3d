# Task: finish the full arbitrary-state 5×5 Rubik's Cube solver

You're picking up a partially-built cube-solver web app (Next.js 14 + React +
Three.js + TypeScript). A 4×4 full solver is done and shipped. Your job is the
**full arbitrary-state 5×5 solver**, which is blocked on one hard piece.

## Repo / branch
- Repo: `drunkducker/cubelabs3d`
- Work branch: `claude/new-session-euaf6s` (base it on this; it has everything below)
- Read `5X5_SOLVER_HANDOFF.md` at the repo root first — it has the full detail.
  This prompt is the summary.

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
