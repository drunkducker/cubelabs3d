import { describe, it, expect } from "vitest";
import {
  solved, isSolved, applyMove, applyMoves, invertMove, stateKey,
  MOVE_AXES, STICKER_COUNT, SLOTS, randomScramble, scrambledState, solve, verifySolution,
  type Move,
} from "@/lib/skewb3-engine";

describe("skewb3 engine", () => {
  it("has 30 stickers, 6 of each colour", () => {
    expect(STICKER_COUNT).toBe(30);
    const counts: Record<string, number> = {};
    for (const s of SLOTS) counts[s.color] = (counts[s.color] ?? 0) + 1;
    expect(Object.values(counts).every((c) => c === 5)).toBe(true); // 5 stickers per face
    expect(SLOTS.filter((s) => s.kind === "center").length).toBe(6);
    expect(SLOTS.filter((s) => s.kind === "corner").length).toBe(24);
  });

  it("every move has order 3", () => {
    for (const axis of MOVE_AXES) {
      const m: Move = { axis, dir: 1 };
      let s = solved();
      s = applyMove(s, m); expect(isSolved(s)).toBe(false);
      s = applyMove(s, m); expect(isSolved(s)).toBe(false);
      s = applyMove(s, m); expect(isSolved(s)).toBe(true);
    }
  });

  it("a move and its inverse cancel", () => {
    for (const axis of MOVE_AXES) {
      const m: Move = { axis, dir: 1 };
      expect(isSolved(applyMoves(solved(), [m, invertMove(m)]))).toBe(true);
      expect(isSolved(applyMoves(solved(), [invertMove(m), m]))).toBe(true);
    }
  });

  it("every move is a permutation (colour multiset preserved)", () => {
    for (const axis of MOVE_AXES) for (const dir of [1, -1] as const) {
      const s = applyMove(solved(), { axis, dir });
      const before = solved().slice().sort().join("");
      const after = s.slice().sort().join("");
      expect(after).toBe(before);
    }
  });

  it("scramble then inverse returns to solved (200 trials)", () => {
    for (let i = 0; i < 200; i++) {
      const moves = randomScramble(15);
      const scrambled = applyMoves(solved(), moves);
      const back = applyMoves(scrambled, [...moves].reverse().map(invertMove));
      expect(isSolved(back)).toBe(true);
    }
  });

  it("solves arbitrary scrambles optimally-ish and verifies (150 trials)", () => {
    let maxLen = 0;
    for (let i = 0; i < 150; i++) {
      const { state } = scrambledState(15);
      const solution = solve(state);
      maxLen = Math.max(maxLen, solution.length);
      expect(verifySolution(state, solution)).toBe(true);
    }
    // God's number for the Skewb is 11
    expect(maxLen).toBeLessThanOrEqual(11);
  });

  it("returns an empty solution for a solved cube", () => {
    expect(solve(solved())).toEqual([]);
  });

  it("state keys are stable and distinguish states", () => {
    const a = applyMove(solved(), { axis: "R", dir: 1 });
    const b = applyMove(solved(), { axis: "L", dir: 1 });
    expect(stateKey(a)).not.toBe(stateKey(b));
    expect(stateKey(a)).toBe(stateKey(applyMove(solved(), { axis: "R", dir: 1 })));
  });
});
