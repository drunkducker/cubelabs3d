import { describe, expect, it } from "vitest";
import { applyMove, applySequence, isSolved, randomScramble, solved, tokenize } from "@/lib/cube-engine";
import { faceOfToken, inverseSequence, inverseToken, simplify, toQuarterTurns, turnsOf } from "@/lib/cube-notation";

describe("cube-notation token algebra", () => {
  it("inverts single tokens", () => {
    expect(inverseToken("R")).toBe("R'");
    expect(inverseToken("R'")).toBe("R");
    expect(inverseToken("R2")).toBe("R2");
    expect(inverseToken("U")).toBe("U'");
  });

  it("inverts a sequence by reversing and inverting each move", () => {
    expect(inverseSequence(["R", "U", "F'"])).toEqual(["F", "U'", "R'"]);
  });

  it("collapses adjacent same-face turns", () => {
    expect(simplify(["R", "R"])).toEqual(["R2"]);
    expect(simplify(["R", "R'"])).toEqual([]);
    expect(simplify(["R2", "R"])).toEqual(["R'"]);
    expect(simplify(["R2", "R2"])).toEqual([]);
    expect(simplify(["U", "R", "R", "U'"])).toEqual(["U", "R2", "U'"]);
  });

  it("expands half turns into two quarter turns without changing state", () => {
    expect(toQuarterTurns(["R2", "U", "F'"])).toEqual(["R", "R", "U", "F'"]);
    const tokens = tokenize(randomScramble(18));
    const route = toQuarterTurns(simplify(inverseSequence(tokens)));
    expect(route.every((t) => t.length <= 2 && !t.endsWith("2"))).toBe(true);
    const scrambled = applySequence(solved(), tokens.join(" "));
    expect(isSolved(applySequence(scrambled, route.join(" ")))).toBe(true);
  });

  it("reads quarter-turn counts and faces", () => {
    expect(turnsOf("R")).toBe(1);
    expect(turnsOf("R2")).toBe(2);
    expect(turnsOf("R'")).toBe(3);
    expect(faceOfToken("F'")).toBe("F");
  });
});

describe("guided route invariant", () => {
  it("the inverse-scramble route always solves the scrambled state", () => {
    for (let trial = 0; trial < 40; trial++) {
      const tokens = tokenize(randomScramble(18));
      const scrambled = applySequence(solved(), tokens.join(" "));
      const route = simplify(inverseSequence(tokens));
      expect(isSolved(applySequence(scrambled, route.join(" ")))).toBe(true);
    }
  });

  it("following the guide move-by-move reaches solved", () => {
    const tokens = tokenize(randomScramble(18));
    let state = applySequence(solved(), tokens.join(" "));
    let route = simplify(inverseSequence(tokens));
    let guard = 0;
    while (route.length > 0 && guard++ < 200) {
      const move = route[0]!;
      state = applyMove(state, move);
      route = route.slice(1); // followed the guide → pop the first step
    }
    expect(isSolved(state)).toBe(true);
  });

  it("an off-route exploration keeps a valid route via shortest recovery", () => {
    const tokens = tokenize(randomScramble(18));
    let state = applySequence(solved(), tokens.join(" "));
    let route = simplify(inverseSequence(tokens));

    // Do a move that is NOT the guided one.
    const wrong = route[0] === "U" ? "R" : "U";
    state = applyMove(state, wrong);
    route = simplify([inverseToken(wrong), ...route]);

    expect(isSolved(applySequence(state, route.join(" ")))).toBe(true);
  });
});
