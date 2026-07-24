import { describe, it, expect, beforeAll } from "vitest";
import Cube, { initSolver, solve as solveCoords } from "@/lib/cube3x3-solver";
import { Cube3x3 } from "@/lib/cube3x3-engine";
import { applySequence, isSolvedCube, randomScramble, solvedCube, tokenizeSequence, toFacelets } from "@/lib/nxn-cube";

// Independent of the solver under test: builds scrambles and replays
// solutions using the geometric NxN cube engine (lib/nxn-cube.ts), which the
// 4x4/5x5 reduction solvers already depend on and which shares nothing with
// lib/cube3x3-solver.ts's coordinate math.
function faceletString(scrambleTokens: string[]): string {
  const cubies = applySequence(solvedCube(3), scrambleTokens, 3);
  const facelets = toFacelets(cubies, 3);
  if (facelets.includes("?")) throw new Error("incomplete facelet read");
  return facelets.join("");
}

function isSolutionValid(scrambleTokens: string[], solutionText: string): boolean {
  const solved = applySequence(applySequence(solvedCube(3), scrambleTokens, 3), tokenizeSequence(solutionText), 3);
  return isSolvedCube(solved);
}

describe("cube3x3-solver", () => {
  beforeAll(() => {
    initSolver();
  });

  it("returns an empty solution for an already-solved cube", () => {
    const text = faceletString([]);
    expect(Cube.fromString(text).solve()).toBe("");
  });

  it("solves 200 random scrambles and every solution actually solves the cube", () => {
    for (let i = 0; i < 200; i++) {
      const scramble = randomScramble(3, 25).filter((t) => !t.includes("w")); // 3x3 has no wide layer
      const text = faceletString(scramble);
      const solutionText = Cube.fromString(text).solve();
      expect(isSolutionValid(scramble, solutionText)).toBe(true);
    }
  });

  it("rejects a non-canonical center order rather than silently mis-solving", () => {
    const text = faceletString([]);
    const shuffled = text.slice(0, 4) + "R" + text.slice(5); // corrupt the U-center facelet (index 4)
    expect(() => Cube3x3.fromString(shuffled)).toThrow();
  });

  it("the improvement pass never returns a longer solution than the single-endpoint baseline", () => {
    for (let i = 0; i < 30; i++) {
      const scramble = randomScramble(3, 20).filter((t) => !t.includes("w"));
      const text = faceletString(scramble);
      const cube = Cube3x3.fromString(text);
      const fast = solveCoords(cube, { improveBudgetMs: 0, maxEndpoints: 1 });
      const improved = solveCoords(cube, { improveBudgetMs: 300, maxEndpoints: 200 });
      expect(isSolutionValid(scramble, fast)).toBe(true);
      expect(isSolutionValid(scramble, improved)).toBe(true);
      const fastLen = fast ? tokenizeSequence(fast).length : 0;
      const improvedLen = improved ? tokenizeSequence(improved).length : 0;
      expect(improvedLen).toBeLessThanOrEqual(fastLen);
    }
  });
});
