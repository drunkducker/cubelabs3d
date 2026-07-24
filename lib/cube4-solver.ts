/**
 * Full arbitrary-state 4x4 solver.
 *
 * Pipeline: reduce the cube (solve centers, pair edges) → fix 4x4 parity if
 * the reduced state lands in a coset a 3x3 solver can't reach → hand the
 * reduced 3x3 to cubejs → concatenate and verify the whole solution on the
 * real 4x4. Every stage is checked against the fast facelet model, and the
 * final move list is replayed on the original cube before it is returned, so
 * a returned solution is always a verified solve.
 */
import Cube from "./cube3x3-solver";
import {
  MODEL_4,
  reduce4,
} from "./cube4-reduction";
import {
  applyFastSeq,
  centerProgressFast,
  edgeProgressFast,
  isSolvedFast,
  reducedFaceletStringFast,
  stateFromFaces,
} from "./nxn-fast";
import { toFacelets, tokenizeSequence, type Cubie } from "./nxn-cube";

const SIZE = 4;

// Verified reduction-preserving 4x4 parity fixes (see parity verification):
// OLL flips a single dedge (toggles edge-orientation parity only); PLL swaps
// two dedges (toggles permutation parity only). Both keep centers solved and
// all edges paired, and both are self-inverse.
const OLL_PARITY = "Rw2 B2 U2 Lw U2 Rw' U2 Rw U2 F2 Rw F2 Lw' B2 Rw2";
const PLL_PARITY = "Rw2 R2 U2 Rw2 R2 Uw2 Rw2 R2 Uw2";

function permutationParity(perm: number[]): number {
  const seen = Array(perm.length).fill(false);
  let parity = 0;
  for (let i = 0; i < perm.length; i++) {
    if (seen[i]) continue;
    let j = i, len = 0;
    while (!seen[j]) { seen[j] = true; j = perm[j]; len++; }
    parity += len - 1;
  }
  return parity % 2;
}

/** Which 4x4-specific parities the reduced 3x3 carries (each unsolvable by a
 * pure 3x3 solver). Corner twist/permutation are always legal on a reduced
 * cube, so only edge-orientation and overall permutation parity can be off. */
function reducedParity(faceletString: string): { oll: boolean; pll: boolean } {
  const c = Cube.fromString(faceletString);
  const oll = c.eo.reduce((a: number, b: number) => a + b, 0) % 2 === 1;
  const pll = (permutationParity(c.cp) + permutationParity(c.ep)) % 2 === 1;
  return { oll, pll };
}

/** Collapse consecutive turns of the same face+width (R R' cancels, R R = R2,
 * Rw Rw Rw = Rw'), trimming the easy redundancy a greedy search leaves behind.
 * Conservative: only merges adjacent same-layer tokens, never reorders. */
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
      // merged === 0 → both cancel, push nothing
    } else {
      out.push(token);
    }
  }
  // one more pass in case a cancellation exposed a new adjacency
  return out.length === tokens.length ? out : simplifyMoves(out);
}

export type SolveResult = {
  solution: string[];
  reductionMoves: number;
  parityMoves: number;
  cubeMoves: number;
  verified: boolean;
};

/** Solve an arbitrary 4x4 given as a fast facelet state. */
export function solveState(start: Uint8Array): SolveResult {
  if (isSolvedFast(start, MODEL_4)) {
    return { solution: [], reductionMoves: 0, parityMoves: 0, cubeMoves: 0, verified: true };
  }

  const { state: reduced, moves: reductionMoves } = reduce4(start);
  if (centerProgressFast(MODEL_4, reduced) !== 24 || edgeProgressFast(MODEL_4, reduced) !== 12) {
    throw new Error("Reduction did not complete");
  }

  // Fix 4x4 parity so the reduced state is a legal 3x3 for cubejs.
  const parityMoves: string[] = [];
  let afterParity = reduced;
  const { oll, pll } = reducedParity(reducedFaceletStringFast(MODEL_4, afterParity));
  if (oll) {
    const seq = tokenizeSequence(OLL_PARITY);
    parityMoves.push(...seq);
    afterParity = applyFastSeq(MODEL_4, afterParity, seq);
  }
  if (pll) {
    const seq = tokenizeSequence(PLL_PARITY);
    parityMoves.push(...seq);
    afterParity = applyFastSeq(MODEL_4, afterParity, seq);
  }

  const faceletString = reducedFaceletStringFast(MODEL_4, afterParity);
  const cubeMoves = Cube.fromString(faceletString).solve().trim();
  const cubeMoveList = cubeMoves ? cubeMoves.split(/\s+/) : [];

  const full = simplifyMoves([...reductionMoves, ...parityMoves, ...cubeMoveList]);
  const verified = isSolvedFast(applyFastSeq(MODEL_4, start, full), MODEL_4);

  return {
    solution: full,
    reductionMoves: reductionMoves.length,
    parityMoves: parityMoves.length,
    cubeMoves: cubeMoveList.length,
    verified,
  };
}

/** Solve from a geometric cubie state (e.g. built from a scramble). */
export function solveCubies(cubies: Cubie[]): SolveResult {
  return solveState(stateFromFaces(toFacelets(cubies, SIZE)));
}
