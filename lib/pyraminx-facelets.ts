/**
 * Facelet adapter for the renderer-independent Pyraminx engine.
 *
 * The engine stores six edge pieces and four tip rotations. A manual solver,
 * however, needs the 36 visible stickers. This module is the only translation
 * boundary between those representations. The facelet descriptors are derived
 * from the same tetrahedron geometry used by the renderer and move tables, so
 * manual entry, flat-net playback, and the solver share one source of truth.
 */
import {
  EDGE_PAIRS,
  FACE_COLORS,
  FACE_VERTICES,
  FACES_AT_EDGE,
  FACES_AT_VERTEX,
  VERTICES,
  applySequence,
  faceOutward,
  isSolved,
  rotateAroundAxis,
  solve,
  type PyraState,
  type Vec3,
} from "./pyraminx-engine";

export const PYRAMINX_FACELET_COUNT = 36;
export const PYRAMINX_FACELETS_PER_FACE = 9;
export const PYRAMINX_FACELETS_PER_COLOR = 9;
export const PYRAMINX_COLORS = FACE_COLORS as readonly string[];

type PyraFaceletKind =
  | { kind: "tip"; vertex: number }
  | { kind: "edge"; edge: number }
  | { kind: "center" };

export type PyraFaceletTarget = PyraFaceletKind & { face: number; local: number };

type Bary = [number, number, number];

function classifyCell(verts: readonly number[], corners: readonly Bary[]): PyraFaceletKind {
  for (const corner of corners) {
    const vertexPosition = corner.indexOf(3);
    if (vertexPosition >= 0) return { kind: "tip", vertex: verts[vertexPosition] };
  }

  for (let zeroPosition = 0; zeroPosition < 3; zeroPosition++) {
    if (corners.filter((corner) => corner[zeroPosition] === 0).length < 2) continue;
    const [a, b] = [0, 1, 2].filter((position) => position !== zeroPosition).map((position) => verts[position]).sort((x, y) => x - y);
    const edge = EDGE_PAIRS.findIndex(([i, j]) => i === a && j === b);
    if (edge < 0) throw new Error(`Unable to classify Pyraminx edge ${a}-${b}`);
    return { kind: "edge", edge };
  }

  return { kind: "center" };
}

function targetsForFace(face: number): PyraFaceletTarget[] {
  const verts = FACE_VERTICES[face];
  const targets: PyraFaceletTarget[] = [];
  const push = (corners: Bary[]) => {
    const local = targets.length;
    targets.push({ face, local, ...classifyCell(verts, corners) } as PyraFaceletTarget);
  };

  // Six upward cells in the standard three-row triangular subdivision.
  for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2 - i; j++) {
    const k = 2 - i - j;
    push([[i + 1, j, k], [i, j + 1, k], [i, j, k + 1]]);
  }

  // Three downward cells. Their winding differs in the 3D renderer, but the
  // semantic classification and facelet order are identical here.
  for (let i = 0; i <= 1; i++) for (let j = 0; j <= 1 - i; j++) {
    const k = 1 - i - j;
    push([[i + 1, j + 1, k], [i + 1, j, k + 1], [i, j + 1, k + 1]]);
  }

  return targets;
}

export const PYRAMINX_FACELETS: readonly PyraFaceletTarget[] = [0, 1, 2, 3].flatMap(targetsForFace);

if (PYRAMINX_FACELETS.length !== PYRAMINX_FACELET_COUNT) {
  throw new Error(`Expected ${PYRAMINX_FACELET_COUNT} Pyraminx facelets, got ${PYRAMINX_FACELETS.length}`);
}

const TWO_PI_3 = (2 * Math.PI) / 3;
const distanceSq = (a: readonly number[], b: readonly number[]) => a.reduce((sum, value, i) => sum + (value - b[i]) ** 2, 0);

/** For one positive 120° tip rotation, map each native adjacent face to the face it reaches. */
const TIP_FACE_PLUS: ReadonlyArray<ReadonlyMap<number, number>> = [0, 1, 2, 3].map((vertex) => {
  const axis = (() => {
    const [x, y, z] = VERTICES[vertex];
    const length = Math.hypot(x, y, z);
    return [x / length, y / length, z / length] as Vec3;
  })();
  const adjacentFaces = FACES_AT_VERTEX[vertex];
  const pairs = adjacentFaces.map((fromFace) => {
    const rotated = rotateAroundAxis(faceOutward(fromFace), axis, TWO_PI_3);
    const toFace = adjacentFaces.reduce((best, candidate) =>
      distanceSq(rotated, faceOutward(candidate)) < distanceSq(rotated, faceOutward(best)) ? candidate : best,
    adjacentFaces[0]);
    return [fromFace, toFace] as const;
  });
  return new Map(pairs);
});

/** Native sticker colour visible on `destinationFace` at the requested tip rotation. */
export function tipColorAtFace(vertex: number, destinationFace: number, orientation: number): number {
  for (const nativeFace of FACES_AT_VERTEX[vertex]) {
    let face = nativeFace;
    for (let turn = 0; turn < orientation; turn++) face = TIP_FACE_PLUS[vertex].get(face) ?? face;
    if (face === destinationFace) return nativeFace;
  }
  throw new Error(`Invalid tip face lookup for vertex ${vertex}, face ${destinationFace}, orientation ${orientation}`);
}

export function emptyManualPyraminxFacelets(): number[] {
  return PYRAMINX_FACELETS.map((target) => target.kind === "center" ? target.face : -1);
}

export function stateToPyraminxFacelets(state: PyraState): number[] {
  return PYRAMINX_FACELETS.map((target) => {
    if (target.kind === "center") return target.face;
    if (target.kind === "tip") return tipColorAtFace(target.vertex, target.face, state.to[target.vertex]);

    const slot = target.edge;
    const piece = state.ep[slot];
    const slotFaces = FACES_AT_EDGE[slot];
    const pieceFaces = FACES_AT_EDGE[piece];
    const firstDestination = target.face === slotFaces[0];
    if (state.eo[slot] === 0) return firstDestination ? pieceFaces[0] : pieceFaces[1];
    return firstDestination ? pieceFaces[1] : pieceFaces[0];
  });
}

function validColor(value: number) {
  return Number.isInteger(value) && value >= 0 && value < PYRAMINX_COLORS.length;
}

function sameUnorderedPair(a: number, b: number, c: number, d: number) {
  return (a === c && b === d) || (a === d && b === c);
}

/**
 * Reconstruct a discrete engine state from all 36 visible stickers.
 * Returns null when centers, colour counts, pieces, or orientations are invalid.
 * Reachability is a separate check because a sticker-perfect piece inventory can
 * still describe an impossible odd edge swap.
 */
export function pyraminxFaceletsToState(facelets: readonly number[]): PyraState | null {
  if (facelets.length !== PYRAMINX_FACELET_COUNT || facelets.some((value) => !validColor(value))) return null;
  for (let color = 0; color < PYRAMINX_COLORS.length; color++) {
    if (facelets.filter((value) => value === color).length !== PYRAMINX_FACELETS_PER_COLOR) return null;
  }

  const state: PyraState = { ep: new Array(6).fill(-1), eo: new Array(6).fill(0), to: new Array(4).fill(0) };

  for (const target of PYRAMINX_FACELETS) {
    if (target.kind === "center") {
      const index = target.face * PYRAMINX_FACELETS_PER_FACE + target.local;
      if (facelets[index] !== target.face) return null;
    }
  }

  for (let vertex = 0; vertex < 4; vertex++) {
    const adjacentFaces = FACES_AT_VERTEX[vertex];
    const colorsByFace = new Map<number, number>();
    for (const face of adjacentFaces) {
      const index = PYRAMINX_FACELETS.findIndex((target) => target.kind === "tip" && target.vertex === vertex && target.face === face);
      if (index < 0) return null;
      colorsByFace.set(face, facelets[index]);
    }
    const colors = [...colorsByFace.values()].sort((a, b) => a - b);
    if (colors.some((color, i) => color !== [...adjacentFaces].sort((a, b) => a - b)[i])) return null;

    const orientation = [0, 1, 2].find((candidate) =>
      adjacentFaces.every((face) => tipColorAtFace(vertex, face, candidate) === colorsByFace.get(face)));
    if (orientation === undefined) return null;
    state.to[vertex] = orientation;
  }

  const usedPieces = new Set<number>();
  for (let slot = 0; slot < EDGE_PAIRS.length; slot++) {
    const [faceA, faceB] = FACES_AT_EDGE[slot];
    const indexA = PYRAMINX_FACELETS.findIndex((target) => target.kind === "edge" && target.edge === slot && target.face === faceA);
    const indexB = PYRAMINX_FACELETS.findIndex((target) => target.kind === "edge" && target.edge === slot && target.face === faceB);
    if (indexA < 0 || indexB < 0) return null;
    const colorA = facelets[indexA], colorB = facelets[indexB];

    const piece = FACES_AT_EDGE.findIndex(([pieceA, pieceB]) => sameUnorderedPair(colorA, colorB, pieceA, pieceB));
    if (piece < 0 || usedPieces.has(piece)) return null;
    usedPieces.add(piece);

    const [pieceA, pieceB] = FACES_AT_EDGE[piece];
    if (colorA === pieceA && colorB === pieceB) state.eo[slot] = 0;
    else if (colorA === pieceB && colorB === pieceA) state.eo[slot] = 1;
    else return null;
    state.ep[slot] = piece;
  }

  return state.ep.some((piece) => piece < 0) ? null : state;
}

function structurallyValidState(state: PyraState) {
  return state.ep.length === 6 && [...state.ep].sort((a, b) => a - b).every((piece, i) => piece === i)
    && state.eo.length === 6 && state.eo.every((value) => value === 0 || value === 1)
    && state.to.length === 4 && state.to.every((value) => Number.isInteger(value) && value >= 0 && value <= 2);
}

/** Exact reachability check using the engine's already-verified solver table. */
export function isSolvablePyraminxState(state: PyraState): boolean {
  if (!structurallyValidState(state)) return false;
  try {
    const solution = solve(state);
    return isSolved(applySequence(state, solution.join(" ")));
  } catch {
    return false;
  }
}
