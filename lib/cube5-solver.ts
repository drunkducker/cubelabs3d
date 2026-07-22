/**
 * Full arbitrary-state 5x5 solver (deterministic).
 *
 * Pipeline: solve centers (commutator bank) → if the wing permutation is odd,
 * apply one slice quarter turn and re-solve centers (a slice turn is odd on
 * wings, every bank cycle is even, so this is the entire parity story) →
 * solve corners+midges with a single cubejs call applied as outer turns →
 * solve wings (clean 3-cycle bank) → verify the concatenated solution on the
 * real cube before returning it.
 */
import Cube from "cubejs";
import {
  MODEL_5,
  expandLabels,
  solveCenters,
  solveWings,
  wingParityOdd,
  validateCenterAndWingState,
} from "./cube5-reduction";
import {
  applyFastSeq,
  isSolvedFast,
  reducedFaceletStringFast,
  stateFromFaces,
} from "./nxn-fast";
import { toFacelets, type Cubie } from "./nxn-cube";

const SIZE = 5;

let solverReady = false;
function ensureSolver() {
  if (!solverReady) {
    Cube.initSolver();
    solverReady = true;
  }
}

/** Collapse consecutive same-layer turns (R R' cancels, R R = R2, …). */
export function simplifyMoves(tokens: string[]): string[] {
  const out: string[] = [];
  const amount = (t: string) => (t.endsWith("2") ? 2 : t.endsWith("'") ? 3 : 1);
  const baseOf = (t: string) => t.replace(/['2]$/, "");
  for (const token of tokens) {
    const base = baseOf(token);
    if (out.length && baseOf(out[out.length - 1]) === base) {
      const merged = (amount(out[out.length - 1]) + amount(token)) % 4;
      out.pop();
      if (merged === 1) out.push(base);
      else if (merged === 2) out.push(`${base}2`);
      else if (merged === 3) out.push(`${base}'`);
    } else {
      out.push(token);
    }
  }
  return out.length === tokens.length ? out : simplifyMoves(out);
}

export type SolveResult = {
  solution: string[];
  reductionMoves: number;
  parityMoves: number;
  cubeMoves: number;
  verified: boolean;
};

export function solveState(start: Uint8Array): SolveResult {
  if (isSolvedFast(start, MODEL_5)) {
    return { solution: [], reductionMoves: 0, parityMoves: 0, cubeMoves: 0, verified: true };
  }
  const invalid = validateCenterAndWingState(start);
  if (invalid) throw new Error(invalid);

  const labels: string[] = [];
  let state = start;

  // Stage 1: centers.
  const centers = solveCenters(state);
  state = centers.state;
  labels.push(...centers.moves);

  // Parity: an odd wing permutation cannot be finished by 3-cycles. One slice
  // quarter turn flips it to even; re-solving the centers it disturbed costs
  // only even wing cycles, so the parity stays fixed.
  let parityLabelCount = 0;
  if (wingParityOdd(state)) {
    const fix = ["Rs"];
    state = applyFastSeq(MODEL_5, state, expandLabels(fix));
    const refix = solveCenters(state);
    state = refix.state;
    labels.push(...fix, ...refix.moves);
    parityLabelCount = fix.length + refix.moves.length;
  }

  // Stage 2: corners + midges via cubejs, applied as outer turns. With
  // centers solved this substate is always a legal 3x3 (corner and midge
  // permutation parities are locked together on a 5x5, midge orientation sum
  // stays even, corner twist follows 3x3 rules).
  ensureSolver();
  const faceletString = reducedFaceletStringFast(MODEL_5, state);
  const cubeSolution = Cube.fromString(faceletString).solve().trim();
  const cubeMoveList: string[] = cubeSolution ? cubeSolution.split(/\s+/) : [];
  state = applyFastSeq(MODEL_5, state, cubeMoveList);

  // Stage 3: wings.
  const wings = solveWings(state);
  state = wings.state;

  const full = simplifyMoves([
    ...expandLabels(labels),
    ...cubeMoveList,
    ...expandLabels(wings.moves),
  ]);
  const verified = isSolvedFast(applyFastSeq(MODEL_5, start, full), MODEL_5);

  return {
    solution: full,
    reductionMoves: expandLabels(labels).length - parityLabelCount,
    parityMoves: parityLabelCount,
    cubeMoves: cubeMoveList.length,
    verified,
  };
}

export function solveCubies(cubies: Cubie[]): SolveResult {
  return solveState(stateFromFaces(toFacelets(cubies, SIZE)));
}
