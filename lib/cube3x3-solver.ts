/**
 * Kociemba two-phase solver for the 3x3x3 cube: move/pruning tables built
 * lazily over lib/cube3x3-engine.ts's cubie state, then an IDA* search in
 * two coordinate phases (reach the G1 subgroup, then solve within it).
 *
 * Vendored and rewritten from cubejs (github.com/ldez/cubejs, MIT License,
 * Copyright 2013-2017 Petri Lehtinen, 2018 Ludovic Fernandez) to drop its
 * accidental runtime dependency on the `npm` package and its auto-compiled
 * CoffeeScript output (see docs/ROADMAP.md and
 * docs/checkpoints/2026-07-24-4x4-solver-consistency-ux.md). The coordinate
 * scheme, move/pruning table construction, and phase move restrictions are
 * the standard two-phase algorithm and are ported faithfully; two things are
 * new here:
 *
 *  - typed arrays (Uint16Array move tables, Uint8Array pruning tables,
 *    unpacked rather than 4-bit-packed) instead of plain-array-of-arrays,
 *  - phase 1 no longer stops at the first solution found at the minimal
 *    depth. It enumerates every phase-1 endpoint at that depth (bounded by
 *    time/count) and keeps the shortest phase-2 completion across all of
 *    them, which the original never attempted (see solveCoordinates below).
 */
import { BASE_MOVES, CORNER, EDGE, Cube3x3, cornerMultiply, edgeMultiply, permutationParity, FACE_LETTERS } from "./cube3x3-engine";

// ---- combinatorics helpers --------------------------------------------

function factorial(n: number): number {
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}

function choose(n: number, k: number): number {
  if (n < k) return 0;
  if (k > n / 2) k = n - k;
  let s = 1;
  for (let i = n, j = 1; i !== n - k; i--, j++) { s *= i; s /= j; }
  return s;
}

function rotateLeft(arr: number[], l: number, r: number): void {
  const tmp = arr[l];
  for (let i = l; i < r; i++) arr[i] = arr[i + 1];
  arr[r] = tmp;
}

function rotateRight(arr: number[], l: number, r: number): void {
  const tmp = arr[r];
  for (let i = r; i > l; i--) arr[i] = arr[i - 1];
  arr[l] = tmp;
}

/**
 * A permutation coordinate encodes which (maxOur+1)-subset of the 0..maxAll
 * cubies occupies the tracked slots (the "combination") and in what order
 * (the "permutation"), as combination * (maxOur+1)! + permutation. Used for
 * URFtoDLF / URtoUL / UBtoDF / URtoDF / FRtoBR — all four are this same
 * shape with different (kind, start, end, fromEnd) parameters.
 */
function makePermCoord(kind: "corner" | "edge", start: number, end: number, fromEnd = false) {
  const maxOur = end - start;
  const maxB = factorial(maxOur + 1);
  const maxAll = kind === "corner" ? 7 : 11;
  const scratch = new Array<number>(maxOur + 1);

  return {
    set(perm: number[], index: number): void {
      for (let i = 0; i <= maxOur; i++) scratch[i] = i + start;
      let b = index % maxB;
      let a = Math.floor(index / maxB);
      for (let i = 0; i <= maxAll; i++) perm[i] = -1;
      for (let j = 1; j <= maxOur; j++) {
        let k = b % (j + 1);
        b = Math.floor(b / (j + 1));
        while (k > 0) { rotateRight(scratch, 0, j); k--; }
      }
      let x = maxOur;
      if (fromEnd) {
        for (let j = 0; j <= maxAll; j++) {
          const c = choose(maxAll - j, x + 1);
          if (a - c >= 0) { perm[j] = scratch[maxOur - x]; a -= c; x--; }
        }
      } else {
        for (let j = maxAll; j >= 0; j--) {
          const c = choose(j, x + 1);
          if (a - c >= 0) { perm[j] = scratch[x]; a -= c; x--; }
        }
      }
    },
    get(perm: number[]): number {
      for (let i = 0; i <= maxOur; i++) scratch[i] = -1;
      let a = 0, x = 0;
      if (fromEnd) {
        for (let j = maxAll; j >= 0; j--) {
          if (perm[j] >= start && perm[j] <= end) { a += choose(maxAll - j, x + 1); scratch[maxOur - x] = perm[j]; x++; }
        }
      } else {
        for (let j = 0; j <= maxAll; j++) {
          if (perm[j] >= start && perm[j] <= end) { a += choose(j, x + 1); scratch[x] = perm[j]; x++; }
        }
      }
      let b = 0;
      for (let j = maxOur; j >= 0; j--) {
        let k = 0;
        while (scratch[j] !== start + j) { rotateLeft(scratch, 0, j); k++; }
        b = (j + 1) * b + k;
      }
      return a * maxB + b;
    },
  };
}

function getTwist(co: number[]): number {
  let v = 0;
  for (let i = 0; i < 7; i++) v = 3 * v + co[i];
  return v;
}
function setTwist(co: number[], twist: number): void {
  let parity = 0;
  for (let i = 6; i >= 0; i--) { const ori = twist % 3; twist = Math.floor(twist / 3); co[i] = ori; parity += ori; }
  co[7] = (3 - (parity % 3)) % 3;
}

function getFlip(eo: number[]): number {
  let v = 0;
  for (let i = 0; i < 11; i++) v = 2 * v + eo[i];
  return v;
}
function setFlip(eo: number[], flip: number): void {
  let parity = 0;
  for (let i = 10; i >= 0; i--) { const ori = flip % 2; flip = Math.floor(flip / 2); eo[i] = ori; parity += ori; }
  eo[11] = (2 - (parity % 2)) % 2;
}

const urfToDlf = makePermCoord("corner", CORNER.URF, CORNER.DLF);
const urToUl = makePermCoord("edge", EDGE.UR, EDGE.UL);
const ubToDf = makePermCoord("edge", EDGE.UB, EDGE.DF);
const urToDf = makePermCoord("edge", EDGE.UR, EDGE.DF);
const frToBr = makePermCoord("edge", EDGE.FR, EDGE.BR, true);

// ---- move & pruning table sizes ---------------------------------------

const N_TWIST = 2187; // 3^7 corner-orientation states
const N_FLIP = 2048; // 2^11 edge-orientation states
const N_FRtoBR = 11880; // 12P4 positions of the 4 slice edges
const N_SLICE1 = 495; // 12C4 — FRtoBR ignoring order, phase-1 target
const N_SLICE2 = 24; // 4! — order of the 4 slice edges, phase-2 target
const N_URFtoDLF = 20160; // 8P6
const N_URtoDF = 20160; // 8P6, computed only over phase 2's move set
const N_URtoUL = 1320; // 12P3
const N_UBtoDF = 1320; // 12P3

class CoordCube {
  cp = [0, 1, 2, 3, 4, 5, 6, 7];
  co = [0, 0, 0, 0, 0, 0, 0, 0];
  ep = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  eo = new Array(12).fill(0);
}

/**
 * Table of `coordinate after applying move m`, indexed [coordinateValue*18 +
 * m]. Built by resetting a coordinate cube to each possible value and
 * applying each of the 6 base moves up to 3 times (single/double/prime).
 */
function buildMoveTable(
  kind: "corner" | "edge",
  size: number,
  setCoord: (state: CoordCube, value: number) => void,
  getCoord: (state: CoordCube) => number
): Uint16Array {
  const table = new Uint16Array(size * 18);
  const state = new CoordCube();
  for (let index = 0; index < size; index++) {
    let col = 0;
    for (const move of BASE_MOVES) {
      setCoord(state, index);
      for (let power = 0; power < 3; power++) {
        if (kind === "corner") cornerMultiply(state.cp, state.co, move);
        else edgeMultiply(state.ep, state.eo, move);
        table[index * 18 + col] = getCoord(state);
        col++;
      }
    }
  }
  return table;
}

type MoveTables = {
  twist: Uint16Array;
  flip: Uint16Array;
  frToBr: Uint16Array;
  urfToDlf: Uint16Array;
  urToDf: Uint16Array;
  urToUl: Uint16Array;
  ubToDf: Uint16Array;
  mergeUrToDf: Int16Array; // [urToUl*336 + ubToDf] -> urToDf, or -1 if the two collide
  parity: readonly [readonly number[], readonly number[]];
};

// Every move's effect on corner-permutation parity: two states (even/odd),
// tiny enough to hardcode rather than derive via a coordinate cube.
const PARITY_MOVE_TABLE: readonly [readonly number[], readonly number[]] = [
  [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1],
  [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
];

function buildMoveTables(): MoveTables {
  const mergeUrToDf = new Int16Array(336 * 336);
  const a = new CoordCube();
  const b = new CoordCube();
  for (let ul = 0; ul < 336; ul++) {
    for (let df = 0; df < 336; df++) {
      urToUl.set(a.ep, ul);
      ubToDf.set(b.ep, df);
      let collision = false;
      for (let i = 0; i < 8 && !collision; i++) {
        if (a.ep[i] !== -1) {
          if (b.ep[i] !== -1) collision = true;
          else b.ep[i] = a.ep[i];
        }
      }
      mergeUrToDf[ul * 336 + df] = collision ? -1 : urToDf.get(b.ep);
    }
  }

  return {
    twist: buildMoveTable("corner", N_TWIST, (s, v) => setTwist(s.co, v), (s) => getTwist(s.co)),
    flip: buildMoveTable("edge", N_FLIP, (s, v) => setFlip(s.eo, v), (s) => getFlip(s.eo)),
    frToBr: buildMoveTable("edge", N_FRtoBR, (s, v) => frToBr.set(s.ep, v), (s) => frToBr.get(s.ep)),
    urfToDlf: buildMoveTable("corner", N_URFtoDLF, (s, v) => urfToDlf.set(s.cp, v), (s) => urfToDlf.get(s.cp)),
    urToDf: buildMoveTable("edge", N_URtoDF, (s, v) => urToDf.set(s.ep, v), (s) => urToDf.get(s.ep)),
    urToUl: buildMoveTable("edge", N_URtoUL, (s, v) => urToUl.set(s.ep, v), (s) => urToUl.get(s.ep)),
    ubToDf: buildMoveTable("edge", N_UBtoDF, (s, v) => ubToDf.set(s.ep, v), (s) => ubToDf.get(s.ep)),
    mergeUrToDf,
    parity: PARITY_MOVE_TABLE,
  };
}

// Phase 1: all 18 moves are legal. Phase 2: double turns of every face, plus
// quarter turns of U/D only (the moves that keep the cube inside G1).
const ALL_MOVES_1 = Array.from({ length: 18 }, (_, i) => i);
const ALL_MOVES_2 = [0, 1, 2, 4, 7, 9, 10, 11, 13, 16];

/** Legal next moves given the last move's face — no repeating a face, and
 * opposite faces (U/D, R/L, F/B) only in a fixed order, since U D and D U
 * commute and searching both wastes half the branching factor. Row index 6
 * is the "no move yet" case (start of search), where every move is legal. */
function nextMovesFor(allowed: number[]): number[][] {
  const rows = Array.from({ length: 6 }, (_, lastFace) =>
    allowed.filter((move) => {
      const face = Math.floor(move / 3);
      return face !== lastFace && face !== lastFace - 3;
    })
  );
  rows.push(allowed);
  return rows;
}
const NEXT_MOVES_1 = nextMovesFor(ALL_MOVES_1);
const NEXT_MOVES_2 = nextMovesFor(ALL_MOVES_2);

function buildPruningTable(size: number, moves: number[], nextIndex: (index: number, move: number) => number): Uint8Array {
  const table = new Uint8Array(size).fill(0xff);
  table[0] = 0;
  let filled = 1;
  let depth = 0;
  while (filled < size) {
    for (let index = 0; index < size; index++) {
      if (table[index] !== depth) continue;
      for (const move of moves) {
        const next = nextIndex(index, move);
        if (table[next] === 0xff) { table[next] = depth + 1; filled++; }
      }
    }
    depth++;
  }
  return table;
}

type PruningTables = {
  sliceTwist: Uint8Array;
  sliceFlip: Uint8Array;
  sliceUrfToDlfParity: Uint8Array;
  sliceUrToDfParity: Uint8Array;
};

function buildPruningTables(moveTables: MoveTables): PruningTables {
  const sliceTwist = buildPruningTable(N_SLICE1 * N_TWIST, ALL_MOVES_1, (index, move) => {
    const slice = index % N_SLICE1, twist = Math.floor(index / N_SLICE1);
    const newSlice = Math.floor(moveTables.frToBr[slice * 24 * 18 + move] / 24);
    const newTwist = moveTables.twist[twist * 18 + move];
    return newTwist * N_SLICE1 + newSlice;
  });
  const sliceFlip = buildPruningTable(N_SLICE1 * N_FLIP, ALL_MOVES_1, (index, move) => {
    const slice = index % N_SLICE1, flip = Math.floor(index / N_SLICE1);
    const newSlice = Math.floor(moveTables.frToBr[slice * 24 * 18 + move] / 24);
    const newFlip = moveTables.flip[flip * 18 + move];
    return newFlip * N_SLICE1 + newSlice;
  });
  const sliceUrfToDlfParity = buildPruningTable(N_SLICE2 * N_URFtoDLF * 2, ALL_MOVES_2, (index, move) => {
    const parity = index % 2, slice = Math.floor(index / 2) % N_SLICE2, urfToDlfV = Math.floor(Math.floor(index / 2) / N_SLICE2);
    const newParity = moveTables.parity[parity][move];
    const newSlice = moveTables.frToBr[slice * 18 + move];
    const newUrfToDlf = moveTables.urfToDlf[urfToDlfV * 18 + move];
    return (newUrfToDlf * N_SLICE2 + newSlice) * 2 + newParity;
  });
  const sliceUrToDfParity = buildPruningTable(N_SLICE2 * N_URtoDF * 2, ALL_MOVES_2, (index, move) => {
    const parity = index % 2, slice = Math.floor(index / 2) % N_SLICE2, urToDfV = Math.floor(Math.floor(index / 2) / N_SLICE2);
    const newParity = moveTables.parity[parity][move];
    const newSlice = moveTables.frToBr[slice * 18 + move];
    const newUrToDf = moveTables.urToDf[urToDfV * 18 + move];
    return (newUrToDf * N_SLICE2 + newSlice) * 2 + newParity;
  });
  return { sliceTwist, sliceFlip, sliceUrfToDlfParity, sliceUrToDfParity };
}

// ---- lazy table init ---------------------------------------------------

let moveTables: MoveTables | null = null;
let pruningTables: PruningTables | null = null;

export function initSolver(): void {
  if (moveTables && pruningTables) return;
  moveTables = buildMoveTables();
  pruningTables = buildPruningTables(moveTables);
}

function requireTables(): { moves: MoveTables; pruning: PruningTables } {
  if (!moveTables || !pruningTables) throw new Error("Cube3x3 solver used before initSolver()");
  return { moves: moveTables, pruning: pruningTables };
}

// ---- two-phase IDA* search ---------------------------------------------

class SearchState {
  lastMove = -1;
  // phase 1 coordinates
  flip = 0; twist = 0; slice = 0;
  // phase 2 coordinates
  parity = 0; urfToDlfV = 0; frToBrV = 0; urToUlV = 0; ubToDfV = 0; urToDfV = 0;
}

export type SolveOptions = {
  /** Hard ceiling on total move count. Two-phase can need up to ~24 in rare
   * cases; 24 leaves headroom without letting a pathological input run long. */
  maxDepth?: number;
  /** Extra wall-clock budget, after the first valid solution is found, spent
   * trying alternate phase-1 endpoints for a shorter total. 0 disables the
   * search-for-a-shorter-solution pass and returns the first solution found
   * (cubejs's original behavior). */
  improveBudgetMs?: number;
  /** Cap on how many phase-1 endpoints to try during the improvement pass,
   * independent of the time budget — keeps a pathological branching case
   * from spinning even if the clock check lands infrequently. */
  maxEndpoints?: number;
};

const DEFAULT_OPTIONS: Required<SolveOptions> = { maxDepth: 22, improveBudgetMs: 200, maxEndpoints: 200 };

function stepPhase1(mv: MoveTables, s: SearchState, move: number): SearchState {
  const next = new SearchState();
  next.lastMove = move;
  next.flip = mv.flip[s.flip * 18 + move];
  next.twist = mv.twist[s.twist * 18 + move];
  next.frToBrV = mv.frToBr[s.frToBrV * 18 + move];
  next.slice = Math.floor(next.frToBrV / 24);
  next.urToUlV = mv.urToUl[s.urToUlV * 18 + move];
  next.ubToDfV = mv.ubToDf[s.ubToDfV * 18 + move];
  next.urfToDlfV = mv.urfToDlf[s.urfToDlfV * 18 + move];
  next.parity = mv.parity[s.parity][move];
  return next;
}

function stepPhase2(mv: MoveTables, s: SearchState, move: number): SearchState {
  const next = new SearchState();
  next.lastMove = move;
  next.urfToDlfV = mv.urfToDlf[s.urfToDlfV * 18 + move];
  next.frToBrV = mv.frToBr[s.frToBrV * 18 + move];
  next.parity = mv.parity[s.parity][move];
  next.urToDfV = mv.urToDf[s.urToDfV * 18 + move];
  return next;
}

/**
 * IDA* over both phases. `path` is a single reused stack (indexed by depth,
 * never spread/copied per node) so that exploring many phase-1 endpoints —
 * the improvement over cubejs's original single-endpoint search — doesn't
 * cost an allocation per node on top of the search itself.
 */
function solveCoordinates(start: SearchState, options: Required<SolveOptions>): number[] {
  const { moves: mv, pruning: pr } = requireTables();
  const deadline = performance.now() + options.improveBudgetMs;
  const path: number[] = [];
  let best: number[] | null = null;
  let endpointsTried = 0;

  const minDist1 = (s: SearchState) =>
    Math.max(pr.sliceFlip[N_SLICE1 * s.flip + s.slice], pr.sliceTwist[N_SLICE1 * s.twist + s.slice]);
  const minDist2 = (s: SearchState) => {
    const i1 = (N_SLICE2 * s.urToDfV + s.frToBrV) * 2 + s.parity;
    const i2 = (N_SLICE2 * s.urfToDlfV + s.frToBrV) * 2 + s.parity;
    return Math.max(pr.sliceUrToDfParity[i1], pr.sliceUrfToDlfParity[i2]);
  };
  const outOfBudget = () => endpointsTried >= options.maxEndpoints || performance.now() > deadline;

  const phase2 = (s: SearchState, remaining: number): number[] | null => {
    if (remaining === 0) return minDist2(s) === 0 ? [] : null;
    if (minDist2(s) > remaining) return null;
    for (const move of NEXT_MOVES_2[s.lastMove < 0 ? 6 : Math.floor(s.lastMove / 3)]) {
      const rest = phase2(stepPhase2(mv, s, move), remaining - 1);
      if (rest) return [move, ...rest];
    }
    return null;
  };

  const tryEndpoint = (s: SearchState, depth1: number) => {
    endpointsTried++;
    // Phase 2's URtoDF coordinate only exists once phase 1 has landed in G1;
    // derive it here by merging the URtoUL/UBtoDF coordinates tracked so far.
    const merged = mv.mergeUrToDf[s.urToUlV * 336 + s.ubToDfV];
    if (merged < 0) return; // unreachable combination (cubejs's own solver treats this the same way)
    s.urToDfV = merged;
    const cap = best ? best.length - depth1 - 1 : options.maxDepth - depth1;
    if (cap < 0) return;
    const completion = phase2(s, cap);
    if (completion && (!best || depth1 + completion.length < best.length)) {
      best = [...path.slice(0, depth1), ...completion];
    }
  };

  const phase1 = (s: SearchState, remaining: number, depth1: number) => {
    if (best && outOfBudget()) return;
    if (remaining === 0) {
      if (minDist1(s) === 0 && (s.lastMove < 0 || !ALL_MOVES_2.includes(s.lastMove))) tryEndpoint(s, depth1);
      return;
    }
    if (minDist1(s) > remaining) return;
    for (const move of NEXT_MOVES_1[s.lastMove < 0 ? 6 : Math.floor(s.lastMove / 3)]) {
      path[depth1] = move;
      phase1(stepPhase1(mv, s, move), remaining - 1, depth1 + 1);
      if (best && outOfBudget()) return;
    }
  };

  for (let depth1 = 0; depth1 <= options.maxDepth; depth1++) {
    phase1(start, depth1, 0);
    if (best) break;
  }
  if (!best) throw new Error("Cube3x3 solver: no solution found within maxDepth");
  return best;
}

function moveName(move: number): string {
  const face = Math.floor(move / 3);
  const power = move % 3;
  return FACE_LETTERS[face] + (power === 1 ? "2" : power === 2 ? "'" : "");
}

export function solve(cube: Cube3x3, options?: SolveOptions): string {
  if (cube.isSolved()) return "";
  const opts = { ...DEFAULT_OPTIONS, ...options };
  requireTables();
  const state = new SearchState();
  state.twist = getTwist(cube.co);
  state.flip = getFlip(cube.eo);
  state.frToBrV = frToBr.get(cube.ep);
  state.slice = Math.floor(state.frToBrV / 24);
  state.urToUlV = urToUl.get(cube.ep);
  state.ubToDfV = ubToDf.get(cube.ep);
  state.urfToDlfV = urfToDlf.get(cube.cp);
  state.parity = permutationParity(cube.cp);

  const moves = solveCoordinates(state, opts);
  return moves.map(moveName).join(" ");
}

export type { Cube3x3 };

/** Drop-in-shaped default export: `Cube.initSolver(); Cube.fromString(s).solve()`. */
const Cube = {
  initSolver,
  fromString(facelets: string) {
    const cube = Cube3x3.fromString(facelets);
    return Object.assign(cube, { solve: (options?: SolveOptions) => solve(cube, options) });
  },
};
export default Cube;
