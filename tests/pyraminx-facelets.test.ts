import { describe, expect, it } from "vitest";
import { applySequence, isSolved, solve, solved, type PyraState } from "../lib/pyraminx-engine";
import {
  PYRAMINX_FACELETS,
  emptyManualPyraminxFacelets,
  isSolvablePyraminxState,
  pyraminxFaceletsToState,
  stateToPyraminxFacelets,
} from "../lib/pyraminx-facelets";

const fixtures = [
  "U R' L B u r'",
  "B L U' R B' l u b",
  "R U B' L R' U' r l'",
  "L' B R U' B' R' u u b",
];

describe("Pyraminx facelet adapter", () => {
  it("serializes the solved puzzle as nine stickers of each face colour", () => {
    const facelets = stateToPyraminxFacelets(solved());
    expect(facelets).toHaveLength(36);
    expect([0, 1, 2, 3].map((color) => facelets.filter((value) => value === color).length)).toEqual([9, 9, 9, 9]);
    expect(pyraminxFaceletsToState(facelets)).toEqual(solved());
  });

  it("round-trips legal scrambles without changing edge or tip state", () => {
    for (const sequence of fixtures) {
      const state = applySequence(solved(), sequence);
      const reconstructed = pyraminxFaceletsToState(stateToPyraminxFacelets(state));
      expect(reconstructed).toEqual(state);
      expect(reconstructed && isSolvablePyraminxState(reconstructed)).toBe(true);
    }
  });

  it("keeps the twelve fixed center stickers prefilled for manual entry", () => {
    const entry = emptyManualPyraminxFacelets();
    expect(entry.filter((value) => value >= 0)).toHaveLength(12);
    PYRAMINX_FACELETS.forEach((target, index) => {
      expect(entry[index]).toBe(target.kind === "center" ? target.face : -1);
    });
  });

  it("rejects a changed fixed center and duplicate physical pieces", () => {
    const changedCenter = stateToPyraminxFacelets(solved());
    const centerIndex = PYRAMINX_FACELETS.findIndex((target) => target.kind === "center" && target.face === 0);
    changedCenter[centerIndex] = 1;
    expect(pyraminxFaceletsToState(changedCenter)).toBeNull();

    const duplicateEdge = stateToPyraminxFacelets(solved());
    const edgeZero = PYRAMINX_FACELETS.findIndex((target) => target.kind === "edge" && target.edge === 0);
    const edgeOne = PYRAMINX_FACELETS.findIndex((target) => target.kind === "edge" && target.edge === 1);
    duplicateEdge[edgeOne] = duplicateEdge[edgeZero];
    expect(pyraminxFaceletsToState(duplicateEdge)).toBeNull();
  });

  it("recognizes a structurally real but unreachable single edge swap", () => {
    const impossible: PyraState = { ep: [1, 0, 2, 3, 4, 5], eo: [0, 0, 0, 0, 0, 0], to: [0, 0, 0, 0] };
    const reconstructed = pyraminxFaceletsToState(stateToPyraminxFacelets(impossible));
    expect(reconstructed).toEqual(impossible);
    expect(reconstructed && isSolvablePyraminxState(reconstructed)).toBe(false);
  });

  it("verifies every emitted solution against the exact entered state", () => {
    for (const sequence of fixtures) {
      const state = applySequence(solved(), sequence);
      const entered = pyraminxFaceletsToState(stateToPyraminxFacelets(state));
      expect(entered).not.toBeNull();
      const solution = solve(entered!);
      expect(isSolved(applySequence(entered!, solution.join(" ")))).toBe(true);
    }
  });
});
