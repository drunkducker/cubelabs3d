/// <reference lib="webworker" />
/**
 * Off-main-thread 4x4 solver. The reduction search probes hundreds of
 * thousands of candidates and can run for several seconds, so it must never
 * touch the render thread. The UI posts a 96-entry facelet state; the worker
 * replies with a verified solution or an error. cubejs's pruning tables are
 * built once, lazily, on the first solve.
 */
import Cube from "../lib/cube3x3-solver";
import { solveState } from "../lib/cube4-solver";

let ready = false;
function ensureReady() {
  if (!ready) {
    Cube.initSolver();
    ready = true;
  }
}

self.onmessage = (event: MessageEvent<{ id: number; facelets: number[] }>) => {
  const { id, facelets } = event.data;
  try {
    ensureReady();
    const result = solveState(Uint8Array.from(facelets));
    (self as unknown as Worker).postMessage({ id, ok: true, ...result });
  } catch (error) {
    (self as unknown as Worker).postMessage({ id, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};
