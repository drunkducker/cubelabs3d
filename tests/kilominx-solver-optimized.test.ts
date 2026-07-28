import { describe, expect, it } from "vitest";
import {
  MOVE_COUNT,
  applyMoves,
  faceOfMove,
  isSolved,
  simplify,
  solved,
} from "@/lib/kilominx-engine";
import { solve as optimizedSolve } from "../lib/kilominx-solver-optimized";
import { solve as legacySolve } from "../lib/kilominx-engine";

function seededScramble(seed: number, count = 60): number[] {
  let value = seed >>> 0;
  const sequence: number[] = [];
  let lastFace = -1;
  for (let i = 0; i < count; i++) {
    let move: number;
    do {
      value = (Math.imul(value, 1_664_525) + 1_013_904_223) >>> 0;
      move = value % MOVE_COUNT;
    } while (faceOfMove(move) === lastFace);
    lastFace = faceOfMove(move);
    sequence.push(move);
  }
  return sequence;
}

describe("optimized Kilominx solver", () => {
  it("solves a deterministic regression corpus", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const scrambled = applyMoves(solved(), seededScramble(seed * 7_919));
      const solution = optimizedSolve(scrambled);
      expect(isSolved(applyMoves(scrambled, solution))).toBe(true);
      expect(simplify(solution)).toEqual(solution);
    }
  });

  it("reduces aggregate move count versus the legacy target-by-target planner", () => {
    let legacyMoves = 0;
    let optimizedMoves = 0;
    for (let seed = 1; seed <= 24; seed++) {
      const scrambled = applyMoves(solved(), seededScramble(seed * 7_919));
      legacyMoves += legacySolve(scrambled).length;
      optimizedMoves += optimizedSolve(scrambled).length;
    }

    // The corpus has a comfortable margin; keep the threshold loose enough that
    // harmless table-order changes do not make the regression test flaky.
    expect(optimizedMoves).toBeLessThan(legacyMoves * 0.85);
  });

  it("rejects unreachable states before building or searching solver tables", () => {
    const impossible = solved();
    [impossible.cp[0], impossible.cp[1]] = [impossible.cp[1], impossible.cp[0]];
    expect(() => optimizedSolve(impossible)).toThrow(/unreachable state/);
  });
});
