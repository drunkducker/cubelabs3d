import { describe, expect, it } from "vitest";
import {
  AXES,
  type LayerSide,
  type SkewbMove,
  applyMove,
  applyMoves,
  equal,
  inverseMove,
  inverseSequence,
  isPositionInLayer,
  isSolved,
  layersForPosition,
  moveLabel,
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
      for (const layer of [1, -1] as LayerSide[]) {
        for (const direction of [1, -1] as const) {
          const matrix = rotationMatrix(axis, direction, layer);
          expect(matrix.every(value => [-1, 0, 1].includes(value))).toBe(true);
          for (let row = 0; row < 3; row++) {
            expect(matrix.slice(row * 3, row * 3 + 3).filter(Boolean)).toHaveLength(1);
          }
        }
      }
    }
  });

  it("each corner turn has order three", () => {
    for (const axis of Object.keys(AXES) as Array<keyof typeof AXES>) {
      for (const layer of [1, -1] as LayerSide[]) {
        let state = solved();
        for (let i = 0; i < 3; i++) state = applyMove(state, { axis, layer, direction: 1 });
        expect(isSolved(state)).toBe(true);
      }
    }
  });

  it("a move followed by its inverse is the identity", () => {
    for (const axis of Object.keys(AXES) as Array<keyof typeof AXES>) {
      for (const layer of [1, -1] as LayerSide[]) {
        const move = { axis, layer, direction: 1 as const };
        expect(isSolved(applyMoves(solved(), [move, inverseMove(move)]))).toBe(true);
      }
    }
  });

  it("exposes every sticker's legal swipe layers", () => {
    const state = solved();

    for (const corner of state.corners) {
      expect(layersForPosition(corner.position)).toHaveLength(4);
    }
    for (const center of state.centers) {
      expect(layersForPosition(center.position)).toHaveLength(4);
    }

    for (const axis of Object.keys(AXES) as Array<keyof typeof AXES>) {
      for (const layer of [1, -1] as LayerSide[]) {
        const movingCorners = state.corners.filter(piece => isPositionInLayer(piece.position, axis, layer));
        const movingCenters = state.centers.filter(piece => isPositionInLayer(piece.position, axis, layer));
        expect(movingCorners).toHaveLength(4);
        expect(movingCenters).toHaveLength(3);
      }
    }
  });

  it("keeps all eight corner layers playable through the tutorial sequence", () => {
    const moves = parseSequence("R' U R U'");
    let state = solved();

    for (const move of [...moves, ...moves]) {
      state = applyMove(state, move);
      for (const piece of [...state.corners, ...state.centers]) {
        expect(layersForPosition(piece.position)).toHaveLength(4);
      }
    }

    expect(isSolved(applyMoves(state, inverseSequence([...moves, ...moves])))).toBe(true);
  });
});

describe("skewb sequences", () => {
  it("round-trips canonical and opposite-layer notation", () => {
    const moves = parseSequence("U R' l b'");
    expect(moves).toHaveLength(4);
    expect(moves.map(moveLabel).join(" ")).toBe("U R' l b'");
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

  it("solves states made by direct turns on opposite corner layers", () => {
    const directMoves: SkewbMove[] = [
      { axis: "U", layer: -1, direction: 1 },
      { axis: "R", layer: -1, direction: -1 },
      { axis: "L", layer: -1, direction: 1 },
    ];
    const state = applyMoves(solved(), directMoves);
    const solution = solveSkewb(state, directMoves);
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
