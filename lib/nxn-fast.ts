/**
 * Fast NxN state layer for the reduction search.
 *
 * The geometric engine in nxn-cube.ts is the verified source of truth, but it
 * rebuilds an array of cubie objects on every move — far too slow for a search
 * that probes hundreds of thousands of candidates. This layer precomputes, for
 * each move token, a facelet permutation over a flat Uint8Array, so applying a
 * move is a single gather. Every permutation and index table here is derived
 * from the geometric engine at load time (and cross-checked against it in
 * tests), so the fast layer can never silently diverge from the real cube.
 *
 * State = Uint8Array of length 6*size*size, face colors 0..5 in U,R,F,D,L,B
 * row-major order — the exact ordering nxn-cube.toFacelets produces.
 */
import {
  FACES,
  applyMove,
  faceGridCoordinate,
  solvedCube,
  type Cubie,
  type Face,
} from "./nxn-cube";

const FACE_INDEX: Record<Face, number> = { U: 0, R: 1, F: 2, D: 3, L: 4, B: 5 };
const FACE_DIR: Record<Face, readonly [number, number, number]> = {
  U: [0, 1, 0], D: [0, -1, 0], R: [1, 0, 0], L: [-1, 0, 0], F: [0, 0, 1], B: [0, 0, -1],
};
const dirKey = (d: readonly [number, number, number]) => d.join(",");

type TaggedSticker = { dir: readonly [number, number, number]; color: Face; tag: number };
type TaggedCubie = { grid: readonly [number, number, number]; stickers: TaggedSticker[] };

export type FastModel = {
  size: number;
  faceletCount: number;
  /** movePerm[token][i] = source slot; next[i] = prev[movePerm[token][i]]. */
  movePerm: Record<string, Int32Array>;
  tokens: string[];
  singles: string[];
  wides: string[];
  /** expected color for each center slot, or -1 for non-center slots. */
  centerExpected: Int8Array;
  centerSlots: Int32Array;
  /** per edge location: per face, the wing slots that must all agree. */
  edgeGroups: number[][][];
  solvedState: Uint8Array;
};

function taggedSolved(size: number): { cubies: TaggedCubie[]; slotAt: (face: Face, row: number, col: number) => number } {
  const cubies = solvedCube(size) as unknown as TaggedCubie[];
  const byGrid = new Map(cubies.map((c) => [c.grid.join(","), c]));
  const slotAt = (face: Face, row: number, col: number) => FACE_INDEX[face] * size * size + row * size + col;
  // tag each sticker with its solved facelet slot index
  for (const face of FACES) {
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const grid = faceGridCoordinate(size, face, row, col);
        const cubie = byGrid.get(grid.join(","));
        const sticker = cubie?.stickers.find((s) => dirKey(s.dir) === dirKey(FACE_DIR[face]));
        if (sticker) sticker.tag = slotAt(face, row, col);
      }
    }
  }
  return { cubies, slotAt };
}

function derivePerm(size: number, token: string): Int32Array {
  const { cubies } = taggedSolved(size);
  const moved = applyMove(cubies as unknown as Cubie[], token, size) as unknown as TaggedCubie[];
  const byGrid = new Map(moved.map((c) => [c.grid.join(","), c]));
  const count = 6 * size * size;
  const perm = new Int32Array(count);
  for (const face of FACES) {
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const grid = faceGridCoordinate(size, face, row, col);
        const cubie = byGrid.get(grid.join(","));
        const sticker = cubie?.stickers.find((s) => dirKey(s.dir) === dirKey(FACE_DIR[face]));
        const dest = FACE_INDEX[face] * size * size + row * size + col;
        perm[dest] = sticker ? sticker.tag : dest;
      }
    }
  }
  return perm;
}

export function buildFastModel(size: number): FastModel {
  const faceletCount = 6 * size * size;
  const singles = FACES.flatMap((f) => [f as string, `${f}'`]);
  const wides = FACES.flatMap((f) => [`${f}w`, `${f}w'`]);
  // Search vocabulary is quarter turns only (doubles come from chaining), but
  // the perm table must cover every token an applied sequence can contain —
  // scrambles and cubejs solutions both use `2` moves.
  const tokens = [...singles, ...wides];
  const allTokens = FACES.flatMap((f) =>
    ["", "w"].flatMap((w) => ["", "'", "2"].map((s) => `${f}${w}${s}`))
  );
  const movePerm: Record<string, Int32Array> = {};
  for (const t of allTokens) movePerm[t] = derivePerm(size, t);

  // solved color state
  const solvedState = new Uint8Array(faceletCount);
  for (let f = 0; f < 6; f++) for (let i = 0; i < size * size; i++) solvedState[f * size * size + i] = f;

  // center slots (inner (size-2)^2 of each face) + expected colors
  const centerExpected = new Int8Array(faceletCount).fill(-1);
  const centerSlots: number[] = [];
  for (let f = 0; f < 6; f++) {
    for (let row = 1; row < size - 1; row++) {
      for (let col = 1; col < size - 1; col++) {
        const slot = f * size * size + row * size + col;
        centerExpected[slot] = f;
        centerSlots.push(slot);
      }
    }
  }

  // edge groups: for each physical edge location, the wing slots per adjacent
  // face that must all agree. Derived from the tagged solved geometry.
  const { cubies } = taggedSolved(size);
  const edge = (size - 1) / 2;
  const byLocation = new Map<string, Map<number, number[]>>(); // loc -> face -> slots
  for (const cubie of cubies) {
    if (cubie.stickers.length !== 2) continue;
    const fixed = [0, 1, 2].filter((i) => Math.abs(cubie.grid[i]) === edge);
    const loc = fixed.map((i) => `${i}:${Math.sign(cubie.grid[i])}`).join(",");
    if (!byLocation.has(loc)) byLocation.set(loc, new Map());
    const faceMap = byLocation.get(loc)!;
    for (const s of cubie.stickers) {
      const faceIdx = Math.floor(s.tag / (size * size));
      if (!faceMap.has(faceIdx)) faceMap.set(faceIdx, []);
      faceMap.get(faceIdx)!.push(s.tag);
    }
  }
  const edgeGroups: number[][][] = [];
  for (const faceMap of Array.from(byLocation.values())) {
    edgeGroups.push(Array.from(faceMap.values()));
  }

  return {
    size, faceletCount, movePerm, tokens, singles, wides,
    centerExpected, centerSlots: Int32Array.from(centerSlots), edgeGroups, solvedState,
  };
}

// ---- fast operations -------------------------------------------------

export function applyFast(state: Uint8Array, perm: Int32Array): Uint8Array {
  const next = new Uint8Array(state.length);
  for (let i = 0; i < perm.length; i++) next[i] = state[perm[i]];
  return next;
}

export function applyFastSeq(model: FastModel, state: Uint8Array, tokens: string[]): Uint8Array {
  let s = state;
  for (const t of tokens) s = applyFast(s, model.movePerm[t]);
  return s;
}

export function centerProgressFast(model: FastModel, state: Uint8Array): number {
  let n = 0;
  for (let k = 0; k < model.centerSlots.length; k++) {
    const slot = model.centerSlots[k];
    if (state[slot] === model.centerExpected[slot]) n++;
  }
  return n;
}

export function edgeProgressFast(model: FastModel, state: Uint8Array): number {
  let paired = 0;
  for (const location of model.edgeGroups) {
    let allAgree = true;
    for (const slots of location) {
      const first = state[slots[0]];
      for (let i = 1; i < slots.length; i++) {
        if (state[slots[i]] !== first) { allAgree = false; break; }
      }
      if (!allAgree) break;
    }
    if (allAgree) paired++;
  }
  return paired;
}

export function isSolvedFast(state: Uint8Array, model: FastModel): boolean {
  for (let i = 0; i < state.length; i++) if (state[i] !== model.solvedState[i]) return false;
  return true;
}

/** Full-state key for search dedup. */
export function stateKey(state: Uint8Array): string {
  return String.fromCharCode.apply(null, state as unknown as number[]);
}

/** Convert a facelet array (from nxn-cube.toFacelets) to a fast state. */
export function stateFromFaces(faces: (Face | "?")[]): Uint8Array {
  const out = new Uint8Array(faces.length);
  for (let i = 0; i < faces.length; i++) {
    const f = faces[i];
    out[i] = f === "?" ? 0 : FACE_INDEX[f];
  }
  return out;
}

const FACE_LETTERS: Face[] = ["U", "R", "F", "D", "L", "B"];

/**
 * Sample a reduced fast state down to the 54-char 3x3 facelet string cubejs
 * expects. The fast state already IS the full facelet array in U,R,F,D,L,B
 * row-major order, so this just reads the corner / inner-representative /
 * corner lattice of each face.
 */
export function reducedFaceletStringFast(model: FastModel, state: Uint8Array): string {
  const n = model.size;
  const mid = Math.floor((n - 1) / 2);
  const samples = [0, mid, n - 1];
  let out = "";
  for (let f = 0; f < 6; f++) {
    for (const row of samples) {
      for (const col of samples) {
        out += FACE_LETTERS[state[f * n * n + row * n + col]];
      }
    }
  }
  return out;
}
