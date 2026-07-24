/**
 * Full arbitrary-state 5x5 solver.
 *
 * Pipeline mirrors the 4x4: reduce (solve the 3x3 centers, pair the edge
 * triplets) → fix any 5x5 edge parity so the reduced state is a legal 3x3 →
 * hand off to cubejs → concatenate and verify the whole solution on the real
 * 5x5 before returning it.
 */
import Cube from "./cube3x3-solver";
import { MODEL_5, reduce5 } from "./cube5-reduction";
import {
  applyFastSeq,
  centerProgressFast,
  edgeProgressFast,
  isSolvedFast,
  reducedFaceletStringFast,
  stateFromFaces,
} from "./nxn-fast";
import { toFacelets, tokenizeSequence, type Cubie } from "./nxn-cube";

const SIZE = 5;

// Verified reduction-preserving 5x5 parity fixes (see parity verification).
// OLL flips a single edge triplet's orientation (odd cubes can produce this);
// PLL swaps two edge triplets. Confirmed to keep centers solved and edges
// paired and to toggle only their own parity.
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

function reducedParity(faceletString: string): { oll: boolean; pll: boolean } {
  const c = Cube.fromString(faceletString);
  const oll = c.eo.reduce((a: number, b: number) => a + b, 0) % 2 === 1;
  const pll = (permutationParity(c.cp) + permutationParity(c.ep)) % 2 === 1;
  return { oll, pll };
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

  const { state: reduced, moves: reductionMoves } = reduce5(start);
  if (centerProgressFast(MODEL_5, reduced) !== 54 || edgeProgressFast(MODEL_5, reduced) !== 12) {
    throw new Error("Reduction did not complete");
  }

  const parityMoves: string[] = [];
  let afterParity = reduced;
  const { oll, pll } = reducedParity(reducedFaceletStringFast(MODEL_5, afterParity));
  if (oll) {
    const seq = tokenizeSequence(OLL_PARITY);
    parityMoves.push(...seq);
    afterParity = applyFastSeq(MODEL_5, afterParity, seq);
  }
  if (pll) {
    const seq = tokenizeSequence(PLL_PARITY);
    parityMoves.push(...seq);
    afterParity = applyFastSeq(MODEL_5, afterParity, seq);
  }

  const faceletString = reducedFaceletStringFast(MODEL_5, afterParity);
  const cubeMoves = Cube.fromString(faceletString).solve().trim();
  const cubeMoveList = cubeMoves ? cubeMoves.split(/\s+/) : [];

  const full = simplifyMoves([...reductionMoves, ...parityMoves, ...cubeMoveList]);
  const verified = isSolvedFast(applyFastSeq(MODEL_5, start, full), MODEL_5);

  return {
    solution: full,
    reductionMoves: reductionMoves.length,
    parityMoves: parityMoves.length,
    cubeMoves: cubeMoveList.length,
    verified,
  };
}

export function solveCubies(cubies: Cubie[]): SolveResult {
  return solveState(stateFromFaces(toFacelets(cubies, SIZE)));
}
