import { describe, it, expect } from "vitest";
import {
  VERTICES, FACE_VERTICES, EDGE_PAIRS, EDGES_AT_VERTEX,
  solved, isSolved, applyMove, applySequence, inverseSequence,
  randomScramble, parseMove, moveLabel, solve,
  type PyraMove,
} from "@/lib/pyraminx-engine";

const DEEP = ["U", "L", "R", "B"];
const TIPS = ["u", "l", "r", "b"];

describe("pyraminx geometry", () => {
  it("has 4 vertices, 4 faces, 6 edges", () => {
    expect(VERTICES.length).toBe(4);
    expect(FACE_VERTICES.length).toBe(4);
    expect(EDGE_PAIRS.length).toBe(6);
  });

  it("each vertex touches exactly 3 edges, consistent with EDGE_PAIRS", () => {
    EDGES_AT_VERTEX.forEach((edges, v) => {
      expect(edges.length).toBe(3);
      edges.forEach(e => expect(EDGE_PAIRS[e]).toContain(v));
    });
  });
});

describe("pyraminx moves", () => {
  it("moveLabel/parseMove round-trip for every generator", () => {
    for (const t of [...DEEP, ...DEEP.map(d => `${d}'`), ...TIPS, ...TIPS.map(t => `${t}'`)]) {
      expect(moveLabel(parseMove(t))).toBe(t);
    }
  });

  it("any turn done 3 times is the identity (order 3)", () => {
    for (const t of [...DEEP, ...TIPS]) {
      let s = solved();
      for (let i = 0; i < 3; i++) s = applyMove(s, parseMove(t));
      expect(isSolved(s), `token ${t}`).toBe(true);
    }
  });

  it("a turn followed by its inverse is the identity", () => {
    for (const t of [...DEEP, ...TIPS]) {
      let s = applyMove(solved(), parseMove(t));
      expect(isSolved(s)).toBe(false);
      s = applyMove(s, parseMove(`${t}'`));
      expect(isSolved(s), `token ${t}`).toBe(true);
    }
  });

  it("a shallow tip twist moves only the tip, leaving edges AND center alone", () => {
    const s = applyMove(solved(), parseMove("u"));
    expect(s.to.some(t => t !== 0)).toBe(true);   // a tip turned
    expect(s.co.every(c => c === 0)).toBe(true);  // no center moved
    expect(s.ep.every((p, i) => p === i) && s.eo.every(o => o === 0)).toBe(true); // no edge moved
  });

  it("a deep turn rotates the vertex's center along with its tip", () => {
    const move: PyraMove = { vertex: 0, direction: 1, depth: "deep" };
    const s = applyMove(solved(), move);
    expect(s.co[0]).toBe(1); // that vertex's center rotated
    expect(s.to[0]).toBe(1); // and its tip
    expect(s.co.slice(1).every(c => c === 0)).toBe(true); // other centers untouched
  });

  it("a scramble followed by its exact inverse solves", () => {
    for (let trial = 0; trial < 50; trial++) {
      const scr = randomScramble(20);
      const s = applySequence(solved(), scr);
      expect(isSolved(applySequence(s, inverseSequence(scr)))).toBe(true);
    }
  });
});

describe("pyraminx solver (edges + centers + tips)", () => {
  it("solves random scrambles and the solution is verified against the engine", () => {
    for (let trial = 0; trial < 300; trial++) {
      const scrambled = applySequence(solved(), randomScramble(15));
      const solution = solve(scrambled);
      expect(isSolved(applySequence(scrambled, solution.join(" ")))).toBe(true);
    }
  });

  it("returns an empty solution for an already-solved puzzle", () => {
    expect(solve(solved()).length).toBe(0);
  });

  it("actually solves the centers, not just edges (centers do get scrambled)", () => {
    let sawScrambledCenter = false;
    for (let trial = 0; trial < 100; trial++) {
      const scrambled = applySequence(solved(), randomScramble(15));
      if (!scrambled.co.every(c => c === 0)) sawScrambledCenter = true;
      const solved2 = applySequence(scrambled, solve(scrambled).join(" "));
      expect(solved2.co.every(c => c === 0)).toBe(true);
    }
    expect(sawScrambledCenter).toBe(true);
  });
});
