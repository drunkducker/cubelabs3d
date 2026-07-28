/** Typed entrypoint for the move-count-optimized Kilominx planner. */
import { solveOptimized } from "./kilominx-solver-optimized-impl.js";
import type { KiloState } from "./kilominx-engine";

export function solve(state: KiloState): number[] {
  return solveOptimized(state) as number[];
}
