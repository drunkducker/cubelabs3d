/// <reference lib="webworker" />
/**
 * Off-main-thread 5x5 solver. Reduction builds a set of commutator 3-cycle
 * banks the first time it runs (a one-time cost of a few seconds); the UI sends
 * a `warmup` message as soon as the worker spawns so that build happens in the
 * background while the user is still scrambling, and every real solve afterwards
 * is fast. The UI posts a 150-entry facelet state; the worker replies with a
 * verified solution or an error. cubejs's pruning tables are built once, lazily.
 */
import Cube from "cubejs";
import { solveState, warmup } from "../lib/cube5-solver";

let solverReady = false;
function ensureSolver() {
  if (!solverReady) {
    Cube.initSolver();
    solverReady = true;
  }
}

let warmed = false;

self.onmessage = (event: MessageEvent<{ id: number; facelets?: number[]; warmup?: boolean }>) => {
  const { id, facelets, warmup: doWarmup } = event.data;
  try {
    ensureSolver();
    if (doWarmup) {
      if (!warmed) { warmup(); warmed = true; }
      (self as unknown as Worker).postMessage({ id, ok: true, ready: true });
      return;
    }
    const result = solveState(Uint8Array.from(facelets!));
    warmed = true;
    (self as unknown as Worker).postMessage({ id, ok: true, ...result });
  } catch (error) {
    (self as unknown as Worker).postMessage({ id, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};
