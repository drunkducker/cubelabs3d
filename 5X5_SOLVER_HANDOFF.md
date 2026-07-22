# 5×5 Solver — Engineering Handoff

_Last updated: 2026-07-22. Branch: `claude/new-session-euaf6s`._

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
