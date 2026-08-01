import { describe, it, expect, beforeAll } from "vitest";
import Cube from "cubejs";
import { solveState } from "@/lib/cube5-solver";
import { MODEL_5, reduce5 } from "@/lib/cube5-reduction";
import {
  applyFastSeq,
  centerProgressFast,
  edgeProgressFast,
  isSolvedFast,
} from "@/lib/nxn-fast";

const FACES = ["U", "R", "F", "D", "L", "B"];
const SUFFIX = ["", "'", "2"];

function fullScramble(count: number): string[] {
  const faces = FACES.flatMap((f) => [f, `${f}w`]);
  const out: string[] = [];
  let last = "";
  while (out.length < count) {
    const base = faces[Math.floor(Math.random() * faces.length)];
    if (base[0] === last) continue;
    last = base[0];
    out.push(`${base}${SUFFIX[Math.floor(Math.random() * SUFFIX.length)]}`);
  }
  return out;
}

const scrambledState = () => applyFastSeq(MODEL_5, MODEL_5.solvedState.slice(), fullScramble(60));

describe("5x5 deterministic solver", () => {
  beforeAll(() => {
    Cube.initSolver();
  });

  it("reduces arbitrary scrambles to solved centers and paired edges", () => {
    for (let i = 0; i < 6; i++) {
      const start = scrambledState();
      const { state, moves } = reduce5(start);
      expect(centerProgressFast(MODEL_5, state)).toBe(54);
      expect(edgeProgressFast(MODEL_5, state)).toBe(12);
      // the emitted moves actually produce that reduced state
      expect(isSolvedFast(applyFastSeq(MODEL_5, start, moves), MODEL_5)).toBe(false);
    }
  }, 120000);

  it("produces verified full solutions for random 5x5 states", () => {
    for (let i = 0; i < 8; i++) {
      const start = scrambledState();
      const result = solveState(start);
      expect(result.verified).toBe(true);
      // replay the solution independently
      expect(isSolvedFast(applyFastSeq(MODEL_5, start, result.solution), MODEL_5)).toBe(true);
    }
  }, 120000);

  it("returns an empty solution for an already-solved cube", () => {
    const result = solveState(MODEL_5.solvedState.slice());
    expect(result.solution).toEqual([]);
    expect(result.verified).toBe(true);
  });
});
