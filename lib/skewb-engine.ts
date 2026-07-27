/**
 * Portable Skewb state engine.
 *
 * The renderer animates the same rigid transforms modeled here, but solved-state
 * decisions never depend on floating-point Three.js objects. Each move is an
 * exact 120° signed-permutation matrix around one of the four playable body
 * diagonals. A turn moves four corners and three centers.
 */

export type AxisName = "U" | "R" | "L" | "B";
export type Direction = 1 | -1;
export type Vec3 = [number, number, number];
export type Mat3 = [number, number, number, number, number, number, number, number, number];
export type SkewbMove = { axis: AxisName; direction: Direction };
export type PieceTransform = { position: Vec3; orientation: Mat3 };
export type SkewbState = { corners: PieceTransform[]; centers: PieceTransform[] };

export const AXES: Record<AxisName, Vec3> = {
  U: [1, 1, 1],
  R: [1, -1, -1],
  L: [-1, 1, -1],
  B: [-1, -1, 1],
};

export const CORNER_POSITIONS: Vec3[] = [];
for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
  CORNER_POSITIONS.push([x, y, z]);
}

export const CENTER_POSITIONS: Vec3[] = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
];

const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const cloneVec = (v: Vec3): Vec3 => [...v] as Vec3;
const cloneMat = (m: Mat3): Mat3 => [...m] as Mat3;
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const multiply = (a: Mat3, b: Mat3): Mat3 => [
  a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
  a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
  a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
  a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
  a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
  a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
  a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
  a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
  a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
];

const transform = (m: Mat3, v: Vec3): Vec3 => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

/**
 * Rodrigues' formula rounded to {-1,0,1}. For a ±120° turn around a signed
 * cube diagonal, the result is always an exact signed-permutation matrix.
 */
export function rotationMatrix(axisName: AxisName, direction: Direction): Mat3 {
  const raw = AXES[axisName];
  const axis = raw.map(value => value / Math.sqrt(3)) as Vec3;
  const angle = direction * (2 * Math.PI / 3);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  const [x, y, z] = axis;
  return [
    Math.round(t * x * x + c),
    Math.round(t * x * y - s * z),
    Math.round(t * x * z + s * y),
    Math.round(t * x * y + s * z),
    Math.round(t * y * y + c),
    Math.round(t * y * z - s * x),
    Math.round(t * x * z - s * y),
    Math.round(t * y * z + s * x),
    Math.round(t * z * z + c),
  ];
}

export function solved(): SkewbState {
  const make = (position: Vec3): PieceTransform => ({
    position: cloneVec(position),
    orientation: cloneMat(IDENTITY),
  });
  return {
    corners: CORNER_POSITIONS.map(make),
    centers: CENTER_POSITIONS.map(make),
  };
}

export function clone(state: SkewbState): SkewbState {
  const copy = (piece: PieceTransform): PieceTransform => ({
    position: cloneVec(piece.position),
    orientation: cloneMat(piece.orientation),
  });
  return { corners: state.corners.map(copy), centers: state.centers.map(copy) };
}

export function applyMove(state: SkewbState, move: SkewbMove): SkewbState {
  const out = clone(state);
  const axis = AXES[move.axis];
  const rotation = rotationMatrix(move.axis, move.direction);
  const turn = (piece: PieceTransform) => {
    if (dot(piece.position, axis) <= 0) return;
    piece.position = transform(rotation, piece.position);
    piece.orientation = multiply(rotation, piece.orientation);
  };
  out.corners.forEach(turn);
  out.centers.forEach(turn);
  return out;
}

export function applyMoves(state: SkewbState, moves: SkewbMove[]): SkewbState {
  return moves.reduce(applyMove, clone(state));
}

export function isSolved(state: SkewbState): boolean {
  const solvedState = solved();
  const equalCorner = (a: PieceTransform, b: PieceTransform) =>
    a.position.every((value, index) => value === b.position[index]) &&
    a.orientation.every((value, index) => value === b.orientation[index]);
  const equalCenter = (a: PieceTransform, b: PieceTransform) =>
    a.position.every((value, index) => value === b.position[index]);
  return state.corners.every((piece, index) => equalCorner(piece, solvedState.corners[index])) &&
    state.centers.every((piece, index) => equalCenter(piece, solvedState.centers[index]));
}

export function equal(a: SkewbState, b: SkewbState): boolean {
  const equalPiece = (x: PieceTransform, y: PieceTransform) =>
    x.position.every((value, index) => value === y.position[index]) &&
    x.orientation.every((value, index) => value === y.orientation[index]);
  return a.corners.every((piece, index) => equalPiece(piece, b.corners[index])) &&
    a.centers.every((piece, index) => equalPiece(piece, b.centers[index]));
}

export function moveLabel(move: SkewbMove): string {
  return `${move.axis}${move.direction === -1 ? "'" : ""}`;
}

export function parseMove(token: string): SkewbMove {
  const prime = token.endsWith("'");
  const axis = (prime ? token.slice(0, -1) : token) as AxisName;
  if (!(axis in AXES) || token !== `${axis}${prime ? "'" : ""}`) {
    throw new Error(`Invalid Skewb move: ${token}`);
  }
  return { axis, direction: prime ? -1 : 1 };
}

export function parseSequence(notation: string): SkewbMove[] {
  return notation.trim().split(/\s+/).filter(Boolean).map(parseMove);
}

export function inverseMove(move: SkewbMove): SkewbMove {
  return { axis: move.axis, direction: move.direction === 1 ? -1 : 1 };
}

export function inverseSequence(moves: SkewbMove[]): SkewbMove[] {
  return moves.slice().reverse().map(inverseMove);
}

export function randomScramble(count = 10): SkewbMove[] {
  const axes = Object.keys(AXES) as AxisName[];
  const moves: SkewbMove[] = [];
  let previous: AxisName | null = null;
  while (moves.length < count) {
    const axis = axes[Math.floor(Math.random() * axes.length)];
    if (axis === previous) continue;
    previous = axis;
    moves.push({ axis, direction: Math.random() > 0.5 ? 1 : -1 });
  }
  return moves;
}

const SEARCH_MOVES: SkewbMove[] = (Object.keys(AXES) as AxisName[])
  .flatMap(axis => ([{ axis, direction: 1 }, { axis, direction: -1 }] as SkewbMove[]));

const CORNER_POSITION_INDEX = new Map(CORNER_POSITIONS.map((position, index) => [position.join(","), index]));
const CENTER_POSITION_INDEX = new Map(CENTER_POSITIONS.map((position, index) => [position.join(","), index]));

/**
 * Compact, deterministic key for graph search.
 *
 * Corner identity is the array index, so each entry only needs its current
 * slot and orientation. Center sticker orientation is visually irrelevant;
 * their current slots completely describe the center state.
 */
export function stateKey(state: SkewbState): string {
  const corners = state.corners.map(piece => {
    const position = CORNER_POSITION_INDEX.get(piece.position.join(","));
    if (position === undefined) throw new Error("Invalid Skewb corner position.");
    const orientation = piece.orientation.reduce((code, value) => code * 3 + value + 1, 0);
    return `${position}${orientation.toString(36).padStart(3, "0")}`;
  }).join("");
  const centers = state.centers.map(piece => {
    const position = CENTER_POSITION_INDEX.get(piece.position.join(","));
    if (position === undefined) throw new Error("Invalid Skewb center position.");
    return position;
  }).join("");
  return `${corners}/${centers}`;
}

type SearchNode = {
  state: SkewbState;
  path: SkewbMove[];
  lastAxis: AxisName | null;
};

let solvedSide: Map<string, SkewbMove[]> | null = null;

/**
 * Build the solved half of a bidirectional search once and reuse it.
 *
 * A shortest solution never turns the same axis twice in a row: equal
 * directions collapse to the inverse turn (order three), and opposite
 * directions cancel. Pruning those branches keeps this table small enough
 * to build in the browser on first use.
 */
function solvedSearchTable(): Map<string, SkewbMove[]> {
  if (solvedSide) return solvedSide;

  const root = solved();
  const table = new Map<string, SkewbMove[]>([[stateKey(root), []]]);
  let frontier: SearchNode[] = [{ state: root, path: [], lastAxis: null }];

  for (let depth = 0; depth < 5; depth++) {
    const nextFrontier: SearchNode[] = [];
    for (const node of frontier) {
      for (const move of SEARCH_MOVES) {
        if (move.axis === node.lastAxis) continue;
        const nextState = applyMove(node.state, move);
        const key = stateKey(nextState);
        if (table.has(key)) continue;
        const path = [...node.path, move];
        table.set(key, path);
        nextFrontier.push({ state: nextState, path, lastAxis: move.axis });
      }
    }
    frontier = nextFrontier;
  }

  solvedSide = table;
  return table;
}

/**
 * Solve the current Skewb state, independent of how it was reached.
 *
 * The search meets a depth-five table grown from solved with a depth-six
 * search grown from the requested state. Every returned sequence is verified
 * against the exact engine before it leaves this function.
 */
export function solve(state: SkewbState): SkewbMove[] {
  if (isSolved(state)) return [];

  const solvedTable = solvedSearchTable();
  const start = clone(state);
  const visited = new Set<string>([stateKey(start)]);
  let frontier: SearchNode[] = [{ state: start, path: [], lastAxis: null }];

  for (let depth = 0; depth <= 6; depth++) {
    const nextFrontier: SearchNode[] = [];
    for (const node of frontier) {
      const solvedPath = solvedTable.get(stateKey(node.state));
      if (solvedPath) {
        const solution = [...node.path, ...inverseSequence(solvedPath)];
        if (!isSolved(applyMoves(state, solution))) {
          throw new Error("Skewb solver verification failed.");
        }
        return solution;
      }
      if (depth === 6) continue;

      for (const move of SEARCH_MOVES) {
        if (move.axis === node.lastAxis) continue;
        const nextState = applyMove(node.state, move);
        const key = stateKey(nextState);
        if (visited.has(key)) continue;
        visited.add(key);
        nextFrontier.push({
          state: nextState,
          path: [...node.path, move],
          lastAxis: move.axis,
        });
      }
    }
    frontier = nextFrontier;
  }

  throw new Error("Unable to solve this Skewb state.");
}

export function verifySolution(state: SkewbState, solution: SkewbMove[]): boolean {
  return isSolved(applyMoves(state, solution));
}
