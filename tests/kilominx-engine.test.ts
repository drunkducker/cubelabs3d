import { describe, it, expect } from "vitest";
import {
  VERTICES, FACE_NORMALS, FACE_CORNERS, CORNER_FACES, MOVES, MOVE_COUNT,
  solved, isSolved, equal, applyMoveIndex, applyMoves, inverseMoveIndex,
  inverseSequence, randomScramble, simplify, solve, faceOfMove,
} from "@/lib/kilominx-engine";

describe("kilominx geometry", () => {
  it("has 20 corners and 12 faces", () => {
    expect(VERTICES.length).toBe(20);
    expect(FACE_NORMALS.length).toBe(12);
  });

  it("every face is a clean pentagon of 5 corners", () => {
    FACE_CORNERS.forEach(fc => expect(new Set(fc).size).toBe(5));
  });

  it("every corner touches exactly 3 faces, consistent with FACE_CORNERS", () => {
    const count = new Array(20).fill(0);
    FACE_CORNERS.forEach(fc => fc.forEach(c => count[c]++));
    expect(count.every(c => c === 3)).toBe(true);
    CORNER_FACES.forEach((faces, c) => {
      expect(faces.length).toBe(3);
      faces.forEach(f => expect(FACE_CORNERS[f]).toContain(c));
    });
  });
});

describe("kilominx moves", () => {
  it("each of the 24 moves is a clean permutation of its face ring", () => {
    MOVES.forEach(mv => {
      const froms = mv.map(x => x.from).sort((a, b) => a - b);
      const tos = mv.map(x => x.to).sort((a, b) => a - b);
      expect(tos).toEqual(froms);
    });
  });

  it("applying any face turn 5 times returns to solved (order 5)", () => {
    for (let mi = 0; mi < MOVE_COUNT; mi++) {
      let s = solved();
      for (let i = 0; i < 5; i++) s = applyMoveIndex(s, mi);
      expect(isSolved(s)).toBe(true);
    }
  });

  it("a move followed by its inverse is the identity", () => {
    for (let mi = 0; mi < MOVE_COUNT; mi++) {
      expect(isSolved(applyMoves(solved(), [mi, inverseMoveIndex(mi)]))).toBe(true);
    }
  });

  it("corner-orientation sum is invariant mod 3", () => {
    let s = solved();
    for (let i = 0; i < 500; i++) s = applyMoveIndex(s, Math.floor(Math.random() * MOVE_COUNT));
    expect(s.co.reduce((a, b) => a + b, 0) % 3).toBe(0);
    expect(new Set(s.cp).size).toBe(20); // cp stays a valid permutation
  });

  it("a scramble followed by its exact inverse solves", () => {
    for (let trial = 0; trial < 20; trial++) {
      const scr = randomScramble(60);
      const s = applyMoves(solved(), scr);
      expect(isSolved(applyMoves(s, inverseSequence(scr)))).toBe(true);
    }
  });
});

describe("kilominx simplify", () => {
  it("never changes the effect of a sequence", () => {
    for (let trial = 0; trial < 20; trial++) {
      const scr = randomScramble(40);
      expect(equal(applyMoves(solved(), scr), applyMoves(solved(), simplify(scr)))).toBe(true);
    }
  });

  it("consecutive opposite turns on a face cancel", () => {
    expect(simplify([0, 1]).length).toBe(0);
    expect(simplify([2, 2, 2, 2, 2]).length).toBe(0); // five same turns = identity
  });
});

describe("kilominx solver", () => {
  it("solves random scrambles and the solution is verified against the engine", () => {
    for (let trial = 0; trial < 50; trial++) {
      const scr = randomScramble(60);
      const scrambled = applyMoves(solved(), scr);
      const solution = solve(scrambled);
      expect(isSolved(applyMoves(scrambled, solution))).toBe(true);
    }
  });

  it("returns an empty solution for an already-solved cube", () => {
    expect(solve(solved()).length).toBe(0);
  });

  it("returns an already-simplified solution (simplify is idempotent on it)", () => {
    const scr = randomScramble(50);
    const solution = solve(applyMoves(solved(), scr));
    expect(simplify(solution).length).toBe(solution.length);
  });
});
