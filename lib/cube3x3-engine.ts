/**
 * Cubie-level 3x3x3 model: facelet string <-> (corner perm/orient, edge
 * perm/orient) state, plus move composition. This is the state layer that
 * lib/cube3x3-solver.ts searches over.
 *
 * Vendored and rewritten from cubejs (github.com/ldez/cubejs, MIT License,
 * Copyright 2013-2017 Petri Lehtinen, 2018 Ludovic Fernandez) to drop its
 * accidental runtime dependency on the `npm` package (see docs/ROADMAP.md)
 * and its auto-compiled CoffeeScript output. The underlying cube math
 * (corner/edge indices, move permutation tables, facelet layout) is standard
 * group-theory fact about the Rubik's cube and is unchanged from the
 * original; only the code shape is new.
 *
 * Facelet string layout: 54 characters, U(9) R(9) F(9) D(9) L(9) B(9) blocks,
 * row-major within each face — matches lib/nxn-cube.ts's toFacelets() order,
 * so a reduced NxN cube can be sampled straight into this format.
 */

export const FACE_LETTERS = ["U", "R", "F", "D", "L", "B"] as const;
export type FaceLetter = (typeof FACE_LETTERS)[number];

export const CORNER = { URF: 0, UFL: 1, ULB: 2, UBR: 3, DFR: 4, DLF: 5, DBL: 6, DRB: 7 } as const;
export const EDGE = { UR: 0, UF: 1, UL: 2, UB: 3, DR: 4, DF: 5, DL: 6, DB: 7, FR: 8, FL: 9, BL: 10, BR: 11 } as const;

const CORNER_COLOR: readonly [FaceLetter, FaceLetter, FaceLetter][] = [
  ["U", "R", "F"], ["U", "F", "L"], ["U", "L", "B"], ["U", "B", "R"],
  ["D", "F", "R"], ["D", "L", "F"], ["D", "B", "L"], ["D", "R", "B"],
];
const EDGE_COLOR: readonly [FaceLetter, FaceLetter][] = [
  ["U", "R"], ["U", "F"], ["U", "L"], ["U", "B"], ["D", "R"], ["D", "F"], ["D", "L"], ["D", "B"],
  ["F", "R"], ["F", "L"], ["B", "L"], ["B", "R"],
];

// Facelet index of each face's center, and of each corner/edge's stickers, in
// the U/R/F/D/L/B, 9-per-face, row-major layout described above.
const CENTER_FACELET = [4, 13, 22, 31, 40, 49];
const CORNER_FACELET: readonly [number, number, number][] = [
  [8, 9, 20], [6, 18, 38], [0, 36, 47], [2, 45, 11],
  [29, 26, 15], [27, 44, 24], [33, 53, 42], [35, 17, 51],
];
const EDGE_FACELET: readonly [number, number][] = [
  [5, 10], [7, 19], [3, 37], [1, 46], [32, 16], [28, 25], [30, 43], [34, 52],
  [23, 12], [21, 41], [50, 39], [48, 14],
];

export type MoveDef = { cp: number[]; co: number[]; ep: number[]; eo: number[] };

// The six quarter-turn generators. Applying one of these to a coordinate
// cube up to three times in a row yields the single/double/prime turn of
// that face — see buildMoveTable in cube3x3-solver.ts.
export const BASE_MOVES: readonly MoveDef[] = [
  { // U
    cp: [CORNER.UBR, CORNER.URF, CORNER.UFL, CORNER.ULB, CORNER.DFR, CORNER.DLF, CORNER.DBL, CORNER.DRB],
    co: [0, 0, 0, 0, 0, 0, 0, 0],
    ep: [EDGE.UB, EDGE.UR, EDGE.UF, EDGE.UL, EDGE.DR, EDGE.DF, EDGE.DL, EDGE.DB, EDGE.FR, EDGE.FL, EDGE.BL, EDGE.BR],
    eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  { // R
    cp: [CORNER.DFR, CORNER.UFL, CORNER.ULB, CORNER.URF, CORNER.DRB, CORNER.DLF, CORNER.DBL, CORNER.UBR],
    co: [2, 0, 0, 1, 1, 0, 0, 2],
    ep: [EDGE.FR, EDGE.UF, EDGE.UL, EDGE.UB, EDGE.BR, EDGE.DF, EDGE.DL, EDGE.DB, EDGE.DR, EDGE.FL, EDGE.BL, EDGE.UR],
    eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  { // F
    cp: [CORNER.UFL, CORNER.DLF, CORNER.ULB, CORNER.UBR, CORNER.URF, CORNER.DFR, CORNER.DBL, CORNER.DRB],
    co: [1, 2, 0, 0, 2, 1, 0, 0],
    ep: [EDGE.UR, EDGE.FL, EDGE.UL, EDGE.UB, EDGE.DR, EDGE.FR, EDGE.DL, EDGE.DB, EDGE.UF, EDGE.DF, EDGE.BL, EDGE.BR],
    eo: [0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0],
  },
  { // D
    cp: [CORNER.URF, CORNER.UFL, CORNER.ULB, CORNER.UBR, CORNER.DLF, CORNER.DBL, CORNER.DRB, CORNER.DFR],
    co: [0, 0, 0, 0, 0, 0, 0, 0],
    ep: [EDGE.UR, EDGE.UF, EDGE.UL, EDGE.UB, EDGE.DF, EDGE.DL, EDGE.DB, EDGE.DR, EDGE.FR, EDGE.FL, EDGE.BL, EDGE.BR],
    eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  { // L
    cp: [CORNER.URF, CORNER.ULB, CORNER.DBL, CORNER.UBR, CORNER.DFR, CORNER.UFL, CORNER.DLF, CORNER.DRB],
    co: [0, 1, 2, 0, 0, 2, 1, 0],
    ep: [EDGE.UR, EDGE.UF, EDGE.BL, EDGE.UB, EDGE.DR, EDGE.DF, EDGE.FL, EDGE.DB, EDGE.FR, EDGE.UL, EDGE.DL, EDGE.BR],
    eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  { // B
    cp: [CORNER.URF, CORNER.UFL, CORNER.UBR, CORNER.DRB, CORNER.DFR, CORNER.DLF, CORNER.ULB, CORNER.DBL],
    co: [0, 0, 1, 2, 0, 0, 2, 1],
    ep: [EDGE.UR, EDGE.UF, EDGE.UL, EDGE.BR, EDGE.DR, EDGE.DF, EDGE.DL, EDGE.BL, EDGE.FR, EDGE.FL, EDGE.UB, EDGE.DB],
    eo: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1],
  },
];

export class Cube3x3 {
  cp: number[] = [0, 1, 2, 3, 4, 5, 6, 7];
  co: number[] = [0, 0, 0, 0, 0, 0, 0, 0];
  ep: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  eo: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  /**
   * Parse a 54-char facelet string into cubie state. Centers are expected in
   * canonical U/R/F/D/L/B order (true for every facelet string this app
   * builds — see lib/nxn-cube.ts) and are checked defensively rather than
   * corrected for, since a mis-oriented input would otherwise solve silently
   * wrong.
   */
  static fromString(facelets: string): Cube3x3 {
    if (facelets.length !== 54) throw new Error(`Cube3x3.fromString: expected 54 facelets, got ${facelets.length}`);
    for (let face = 0; face < 6; face++) {
      if (facelets[CENTER_FACELET[face]] !== FACE_LETTERS[face]) {
        throw new Error("Cube3x3.fromString: centers must be in canonical U/R/F/D/L/B order");
      }
    }

    const cube = new Cube3x3();
    for (let i = 0; i < 8; i++) {
      let ori = 0;
      for (; ori < 3; ori++) {
        const ch = facelets[CORNER_FACELET[i][ori]];
        if (ch === "U" || ch === "D") break;
      }
      const col1 = facelets[CORNER_FACELET[i][(ori + 1) % 3]];
      const col2 = facelets[CORNER_FACELET[i][(ori + 2) % 3]];
      for (let j = 0; j < 8; j++) {
        if (col1 === CORNER_COLOR[j][1] && col2 === CORNER_COLOR[j][2]) {
          cube.cp[i] = j;
          cube.co[i] = ori % 3;
          break;
        }
      }
    }
    for (let i = 0; i < 12; i++) {
      for (let j = 0; j < 12; j++) {
        if (facelets[EDGE_FACELET[i][0]] === EDGE_COLOR[j][0] && facelets[EDGE_FACELET[i][1]] === EDGE_COLOR[j][1]) {
          cube.ep[i] = j;
          cube.eo[i] = 0;
          break;
        }
        if (facelets[EDGE_FACELET[i][0]] === EDGE_COLOR[j][1] && facelets[EDGE_FACELET[i][1]] === EDGE_COLOR[j][0]) {
          cube.ep[i] = j;
          cube.eo[i] = 1;
          break;
        }
      }
    }
    return cube;
  }

  isSolved(): boolean {
    for (let i = 0; i < 8; i++) if (this.cp[i] !== i || this.co[i] !== 0) return false;
    for (let i = 0; i < 12; i++) if (this.ep[i] !== i || this.eo[i] !== 0) return false;
    return true;
  }

  /** Apply a space-separated sequence of plain face turns (U, U2, U', ...). */
  move(alg: string): this {
    for (const token of alg.trim().split(/\s+/).filter(Boolean)) {
      const match = token.match(/^([URFDLB])(2|')?$/);
      if (!match) throw new Error(`Cube3x3.move: unsupported move token "${token}"`);
      const face = FACE_LETTERS.indexOf(match[1] as FaceLetter);
      const turns = match[2] === "2" ? 2 : match[2] === "'" ? 3 : 1;
      for (let i = 0; i < turns; i++) {
        cornerMultiply(this.cp, this.co, BASE_MOVES[face]);
        edgeMultiply(this.ep, this.eo, BASE_MOVES[face]);
      }
    }
    return this;
  }
}

/** Compose (cp, co) with a move generator, in place. */
export function cornerMultiply(cp: number[], co: number[], move: MoveDef): void {
  const nextCp = new Array<number>(8);
  const nextCo = new Array<number>(8);
  for (let to = 0; to < 8; to++) {
    const from = move.cp[to];
    nextCp[to] = cp[from];
    nextCo[to] = (co[from] + move.co[to]) % 3;
  }
  for (let i = 0; i < 8; i++) { cp[i] = nextCp[i]; co[i] = nextCo[i]; }
}

/** Compose (ep, eo) with a move generator, in place. */
export function edgeMultiply(ep: number[], eo: number[], move: MoveDef): void {
  const nextEp = new Array<number>(12);
  const nextEo = new Array<number>(12);
  for (let to = 0; to < 12; to++) {
    const from = move.ep[to];
    nextEp[to] = ep[from];
    nextEo[to] = (eo[from] + move.eo[to]) % 2;
  }
  for (let i = 0; i < 12; i++) { ep[i] = nextEp[i]; eo[i] = nextEo[i]; }
}

/** Standard inversion-count parity of a permutation array. */
export function permutationParity(perm: number[]): number {
  let parity = 0;
  for (let i = perm.length - 1; i >= 1; i--) {
    for (let j = i - 1; j >= 0; j--) {
      if (perm[j] > perm[i]) parity++;
    }
  }
  return parity % 2;
}
