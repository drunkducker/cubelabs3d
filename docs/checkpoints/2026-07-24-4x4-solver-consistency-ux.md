# 4x4 Solver — Consistency & UX Follow-up

Date: 2026-07-24
Status: idea list only, not started — revisit and pick items to implement

## Context

The 4x4 solve runs fully client-side: `components/FourSolver.tsx` spawns
`components/solver4.worker.ts`, which calls `solveState()` in
`lib/cube4-solver.ts`, which runs the reduction search in
`lib/cube4-reduction.ts` (centers → edge pairing → parity fix → hand off
reduced 3x3 to `cubejs`). No server involved in the actual solve.

## Root causes identified for inconsistency / weak UX

1. **Cold-start variance.** `Cube.initSolver()` and the first reduction
   search only run on the user's first "Solve" click, so the first solve
   is noticeably slower than later ones. Nothing pre-warms the worker.
2. **No progress feedback during the search.** `solveByProgress()` in
   `lib/cube4-reduction.ts` escalates through six search tiers (conjugate →
   commutator → deeper conjugate → wide-wrapped-core → last-edge algorithm →
   full IDA* fallback) silently. The UI only shows a static string
   ("Solving 4×4… reducing centers and pairing edges") for anywhere from
   under a second up to the 60s timeout (`SOLVE_TIMEOUT_MS` in
   `FourSolver.tsx`), with no indication of progress.

## Candidate fixes (not yet implemented)

- Pre-warm the solver: build pruning tables / do a throwaway solve in the
  worker right after spawn (idle time), not on first click.
  - Tradeoff: costs CPU/battery on every page load even if the user never
    solves.
- Stream phase progress from the worker via `postMessage` (e.g. "Centers
  18/24" → "Edges 7/12" → "Fixing parity" → "Verifying") instead of one
  static status string.
  - Tradeoff: adds complexity to the reduction loop; needs to emit
    progress instead of running heads-down.
- Consider capping/tuning the worst-case IDA* tier so solve-time variance
  shrinks, or surfacing an estimated time.
- Consider caching a scramble → solution result so re-solving an identical
  state doesn't redo the search.
- Manual-entry mode: consider earlier/inline validation feedback beyond
  the color-count badges shown today.

## Next step

Pick one or two of the above (pre-warming + progress streaming are the
highest-leverage pair) and implement + test in the browser before
reporting done.
