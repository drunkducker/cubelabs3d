import { describe, expect, it } from "vitest";
import {
  AXES,
  applyMove,
  applyMoves,
  axesForPosition,
  equal,
  inverseMove,
  inverseSequence,
  isPositionInLayer,
  isSolved,
  parseSequence,
  randomScramble,
  rotationMatrix,
  solve as solveSkewb,
  solved,
  stateKey,
  verifySolution,
} from "@/lib/skewb-engine";

describe("skewb move geometry", () => {
  it("uses exact signed-permutation matrices", () => {
    for (const axis of Object.keys(AXES) as Array<keyof typeof AXES>) {
      for (const direction of [1, -1] as const) {
        const matrix = rotationMatrix(axis, direction);
        expect(matrix.every(value => [-1, 0, 1].includes(value))).toBe(true);
        for (let row = 0; row < 3; row++) {
          expect(matrix.slice(row * 3, row * 3 + 3).filter(Boolean)).toHaveLength(1);
        }
      }
    }
  });

  it("each corner turn has order three", () => {
    for (const axis of Object.keys(AXES) as Array<keyof typeof AXES>) {
      let state = solved();
      for (let i = 0; i < 3; i++) state = applyMove(state, { axis, direction: 1 });
      expect(isSolved(state)).toBe(true);
    }
  });

  it("a move followed by its inverse is the identity", () => {
    for (const axis of Object.keys(AXES) as Array<keyof typeof AXES>) {
      const move = { axis, direction: 1 as const };
      expect(isSolved(applyMoves(solved(), [move, inverseMove(move)]))).toBe(true);
    }
  });

  it("exposes every sticker's legal swipe layers", () => {
    const state = solved();

    for (const corner of state.corners) {
      expect([1, 3]).toContain(axesForPosition(corner.position).length);
    }
    for (const center of state.centers) {
      expect(axesForPosition(center.position)).toHaveLength(2);
    }

    for (const axis of Object.keys(AXES) as Array<keyof typeof AXES>) {
      const movingCorners = state.corners.filter(piece => isPositionInLayer(piece.position, axis));
      const movingCenters = state.centers.filter(piece => isPositionInLayer(piece.position, axis));
      expect(movingCorners).toHaveLength(4);
      expect(movingCenters).toHaveLength(3);
    }
  });
});

describe("skewb sequences", () => {
  it("parses canonical U/R/L/B notation and rejects invalid moves", () => {
    expect(parseSequence("U R' L B'")).toHaveLength(4);
    expect(() => parseSequence("F")).toThrow("Invalid Skewb move");
    expect(() => parseSequence("U2")).toThrow("Invalid Skewb move");
  });

  it("a scramble changes state and its exact inverse solves", () => {
    for (let trial = 0; trial < 40; trial++) {
      const scramble = randomScramble(20);
      const scrambled = applyMoves(solved(), scramble);
      expect(isSolved(scrambled)).toBe(false);
      expect(isSolved(applyMoves(scrambled, inverseSequence(scramble)))).toBe(true);
    }
  });

  it("is deterministic for the same move sequence", () => {
    const moves = parseSequence("U R' L B U' R");
    expect(equal(applyMoves(solved(), moves), applyMoves(solved(), moves))).toBe(true);
  });

  it("creates a stable key for equivalent states", () => {
    const moves = parseSequence("U R' L B U' R");
    expect(stateKey(applyMoves(solved(), moves))).toBe(stateKey(applyMoves(solved(), moves)));
    expect(stateKey(applyMoves(solved(), moves))).not.toBe(stateKey(solved()));
  });
});

describe("skewb solver", () => {
  it("solves a state without needing its move history", () => {
    const state = applyMoves(solved(), parseSequence("U R' L B U' R L' B' U R"));
    const solution = solveSkewb(state);
    expect(solution.length).toBeGreaterThan(0);
    expect(verifySolution(state, solution)).toBe(true);
  });

  it("verifies solutions for varied long scrambles", () => {
    for (let trial = 0; trial < 12; trial++) {
      const state = applyMoves(solved(), randomScramble(24));
      const solution = solveSkewb(state);
      expect(solution.length).toBeLessThanOrEqual(11);
      expect(verifySolution(state, solution)).toBe(true);
    }
  });
});
