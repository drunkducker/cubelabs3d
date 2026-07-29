/**
 * Portable, physically accurate Pyraminx engine.
 *
 * A standard Pyraminx has 4 independently twisting tips, 4 axial center
 * pieces, and 6 edges. A shallow turn moves only a tip. A deep turn rotates
 * the tip and axial center at that vertex together with the three touching
 * edges. The axial centers never permute, but each has a 0/1/2 orientation.
 */
export type Vec3 = [number, number, number];

export const VERTICES: Vec3[] = [
  [1, 1, 1],
  [1, -1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
];

export const FACE_COLORS = ["#00a85a", "#e52b3d", "#1557d5", "#ffd500"] as const;
export const FACE_VERTICES: [number, number, number][] = [
  [1, 2, 3],
  [0, 2, 3],
  [0, 1, 3],
  [0, 1, 2],
];

export const EDGE_PAIRS: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3],
];

export const EDGES_AT_VERTEX: number[][] = [0, 1, 2, 3].map(v =>
  EDGE_PAIRS.reduce<number[]>((acc, [i, j], e) => (i === v || j === v ? [...acc, e] : acc), [])
);

export const FACES_AT_EDGE: [number, number][] = EDGE_PAIRS.map(([i, j]) =>
  [0, 1, 2, 3].filter(k => k !== i && k !== j) as [number, number]
);

export const FACES_AT_VERTEX: number[][] = [0, 1, 2, 3].map(v => [0, 1, 2, 3].filter(k => k !== v));

export type PyraState = {
  ep: number[];
  eo: number[];
  /** Axial-center orientation at each fixed vertex. */
  co: number[];
  /** Absolute orientation of each independently twisting tip. */
  to: number[];
};

export const solved = (): PyraState => ({
  ep: [0, 1, 2, 3, 4, 5],
  eo: [0, 0, 0, 0, 0, 0],
  co: [0, 0, 0, 0],
  to: [0, 0, 0, 0],
});
export const clone = (s: PyraState): PyraState => ({ ep: [...s.ep], eo: [...s.eo], co: [...s.co], to: [...s.to] });
export const isSolved = (s: PyraState) => s.ep.every((p, i) => p === i)
  && s.eo.every(o => o === 0)
  && s.co.every(c => c === 0)
  && s.to.every(t => t === 0);

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const length = (a: Vec3) => Math.sqrt(dot(a, a));
const normalize = (a: Vec3): Vec3 => scale(a, 1 / length(a));
const distanceSq = (a: Vec3, b: Vec3) => { const d = sub(a, b); return dot(d, d); };

export const rotateAroundAxis = (v: Vec3, axis: Vec3, angle: number): Vec3 => {
  const cosT = Math.cos(angle), sinT = Math.sin(angle);
  return add(add(scale(v, cosT), scale(cross(axis, v), sinT)), scale(axis, dot(axis, v) * (1 - cosT)));
};

export const edgeMidpoint = (e: number): Vec3 => { const [i, j] = EDGE_PAIRS[e]; return scale(add(VERTICES[i], VERTICES[j]), 0.5); };
export const faceOutward = (k: number): Vec3 => normalize(scale(VERTICES[k], -1));

const TWO_PI_3 = (2 * Math.PI) / 3;
type VertexMoveTable = { from: [number, number, number]; to: [number, number, number]; flip: [boolean, boolean, boolean] };

function deriveVertexMove(v: number, angle: number): VertexMoveTable {
  const axis = normalize(VERTICES[v]);
  const touching = EDGES_AT_VERTEX[v];
  const to = touching.map(fromSlot => {
    const rotatedPos = rotateAroundAxis(edgeMidpoint(fromSlot), axis, angle);
    let best = -1, bestDist = Infinity;
    for (const toSlot of touching) {
      const d = distanceSq(rotatedPos, edgeMidpoint(toSlot));
      if (d < bestDist) { bestDist = d; best = toSlot; }
    }
    return best;
  }) as [number, number, number];
  const flip = touching.map((fromSlot, k) => {
    const toSlot = to[k];
    const [fa] = FACES_AT_EDGE[fromSlot];
    const rotatedStickerDir = rotateAroundAxis(faceOutward(fa), axis, angle);
    const [ta, tb] = FACES_AT_EDGE[toSlot];
    return distanceSq(rotatedStickerDir, faceOutward(tb)) < distanceSq(rotatedStickerDir, faceOutward(ta));
  }) as [boolean, boolean, boolean];
  return { from: touching as [number, number, number], to, flip };
}

const VERTEX_MOVES: [VertexMoveTable, VertexMoveTable][] = [0, 1, 2, 3].map(v => [
  deriveVertexMove(v, TWO_PI_3),
  deriveVertexMove(v, -TWO_PI_3),
]);

export type Axis = 0 | 1 | 2 | 3;
export type Direction = 1 | -1;
export type TurnDepth = "deep" | "shallow";
export type PyraMove = { vertex: Axis; direction: Direction; depth: TurnDepth };
const VERTEX_LETTER = ["U", "L", "R", "B"] as const;

export function moveLabel(move: PyraMove): string {
  const base = VERTEX_LETTER[move.vertex];
  const letter = move.depth === "shallow" ? base.toLowerCase() : base;
  return move.direction === 1 ? letter : `${letter}'`;
}

export function parseMove(token: string): PyraMove {
  const prime = token.endsWith("'");
  const letter = prime ? token.slice(0, -1) : token;
  const depth: TurnDepth = letter === letter.toUpperCase() ? "deep" : "shallow";
  const vertex = VERTEX_LETTER.indexOf(letter.toUpperCase() as (typeof VERTEX_LETTER)[number]) as Axis;
  if (vertex < 0 || !letter || letter.length !== 1) throw new Error(`Invalid Pyraminx move: ${token}`);
  return { vertex, direction: prime ? -1 : 1, depth };
}

export function applyMove(state: PyraState, move: PyraMove): PyraState {
  const out = clone(state);
  const { vertex, direction, depth } = move;
  const delta = direction === 1 ? 1 : 2;
  out.to[vertex] = (out.to[vertex] + delta) % 3;
  if (depth === "shallow") return out;

  out.co[vertex] = (out.co[vertex] + delta) % 3;
  const { from, to, flip } = VERTEX_MOVES[vertex][direction === 1 ? 0 : 1];
  const fromEo = from.map(slot => state.eo[slot]);
  const fromEp = from.map(slot => state.ep[slot]);
  from.forEach((_fromSlot, k) => {
    out.ep[to[k]] = fromEp[k];
    out.eo[to[k]] = flip[k] ? 1 - fromEo[k] : fromEo[k];
  });
  return out;
}

export function applySequence(state: PyraState, sequence: string): PyraState {
  return sequence.trim().split(/\s+/).filter(Boolean).reduce((s, token) => applyMove(s, parseMove(token)), clone(state));
}

export function inverseToken(token: string): string {
  return token.endsWith("'") ? token.slice(0, -1) : `${token}'`;
}
export function inverseSequence(sequence: string): string {
  return sequence.trim().split(/\s+/).filter(Boolean).reverse().map(inverseToken).join(" ");
}

const DEEP_LETTERS = VERTEX_LETTER as unknown as string[];
export function randomScramble(count = 10): string {
  const out: string[] = [];
  let lastVertex = -1;
  for (let i = 0; i < count; i++) {
    let vertex: number;
    do { vertex = Math.floor(Math.random() * 4); } while (vertex === lastVertex);
    lastVertex = vertex;
    out.push(`${DEEP_LETTERS[vertex]}${Math.random() > 0.5 ? "'" : ""}`);
  }
  for (let v = 0; v < 4; v++) {
    const turns = Math.floor(Math.random() * 3);
    for (let t = 0; t < turns; t++) out.push(DEEP_LETTERS[v].toLowerCase());
  }
  return out.join(" ");
}

const DEEP_MOVES: PyraMove[] = [0, 1, 2, 3].flatMap((vertex): PyraMove[] => [
  { vertex: vertex as Axis, direction: 1, depth: "deep" },
  { vertex: vertex as Axis, direction: -1, depth: "deep" },
]);
const inverseMoveIndex = (index: number) => index ^ 1;

function encodeEdges(ep: number[], eo: number[]): number {
  const used = [false, false, false, false, false, false];
  let permIndex = 0, factorial = 720;
  for (let i = 0; i < 6; i++) {
    factorial /= 6 - i;
    let rank = 0;
    for (let j = 0; j < ep[i]; j++) if (!used[j]) rank++;
    used[ep[i]] = true;
    permIndex += rank * factorial;
  }
  let orientationMask = 0;
  for (let i = 0; i < 6; i++) orientationMask |= eo[i] << i;
  return permIndex * 64 + orientationMask;
}

function encodeCenters(co: number[]): number {
  return co[0] + 3 * co[1] + 9 * co[2] + 27 * co[3];
}

export function encodeCore(state: PyraState): number {
  return encodeEdges(state.ep, state.eo) * 81 + encodeCenters(state.co);
}

type SearchEntry = { parent: number; move: number; depth: number; lastVertex: number };
const SOLVED_RADIUS = 6;
const START_RADIUS = 5;
let solvedSide: Map<number, SearchEntry> | null = null;

function buildSolvedSide(): Map<number, SearchEntry> {
  const root = solved();
  const rootCode = encodeCore(root);
  const entries = new Map<number, SearchEntry>([[rootCode, { parent: -1, move: -1, depth: 0, lastVertex: -1 }]]);
  const states: PyraState[] = [root];
  const codes: number[] = [rootCode];
  for (let head = 0; head < states.length; head++) {
    const current = states[head];
    const currentCode = codes[head];
    const currentEntry = entries.get(currentCode)!;
    if (currentEntry.depth >= SOLVED_RADIUS) continue;
    for (let moveIndex = 0; moveIndex < DEEP_MOVES.length; moveIndex++) {
      const move = DEEP_MOVES[moveIndex];
      if (move.vertex === currentEntry.lastVertex) continue;
      const next = applyMove(current, move);
      const code = encodeCore(next);
      if (entries.has(code)) continue;
      entries.set(code, { parent: currentCode, move: moveIndex, depth: currentEntry.depth + 1, lastVertex: move.vertex });
      states.push(next);
      codes.push(code);
    }
  }
  return entries;
}

function pathToSolved(code: number, table: Map<number, SearchEntry>): string[] {
  const moves: string[] = [];
  let currentCode = code;
  while (true) {
    const entry = table.get(currentCode);
    if (!entry || entry.parent < 0) break;
    moves.push(moveLabel(DEEP_MOVES[inverseMoveIndex(entry.move)]));
    currentCode = entry.parent;
  }
  return moves;
}

function pathFromStart(code: number, table: Map<number, SearchEntry>): string[] {
  const reversed: string[] = [];
  let currentCode = code;
  while (true) {
    const entry = table.get(currentCode);
    if (!entry || entry.parent < 0) break;
    reversed.push(moveLabel(DEEP_MOVES[entry.move]));
    currentCode = entry.parent;
  }
  return reversed.reverse();
}

function validCoreShape(state: PyraState) {
  return state.ep.length === 6 && [...state.ep].sort((a, b) => a - b).every((piece, index) => piece === index)
    && state.eo.length === 6 && state.eo.every(value => value === 0 || value === 1)
    && state.co.length === 4 && state.co.every(value => Number.isInteger(value) && value >= 0 && value <= 2);
}

/** Exact bidirectional solve of the 933,120-state edge + axial-center core. */
export function solveCore(state: PyraState): string[] {
  if (!validCoreShape(state)) throw new Error("Invalid Pyraminx core state");
  const goalTable = solvedSide ?? (solvedSide = buildSolvedSide());
  const startCode = encodeCore(state);
  if (goalTable.has(startCode)) return pathToSolved(startCode, goalTable);

  const startEntries = new Map<number, SearchEntry>([[startCode, { parent: -1, move: -1, depth: 0, lastVertex: -1 }]]);
  const states: PyraState[] = [clone(state)];
  const codes: number[] = [startCode];
  for (let head = 0; head < states.length; head++) {
    const current = states[head];
    const currentCode = codes[head];
    const currentEntry = startEntries.get(currentCode)!;
    if (currentEntry.depth >= START_RADIUS) continue;
    for (let moveIndex = 0; moveIndex < DEEP_MOVES.length; moveIndex++) {
      const move = DEEP_MOVES[moveIndex];
      if (move.vertex === currentEntry.lastVertex) continue;
      const next = applyMove(current, move);
      const code = encodeCore(next);
      if (startEntries.has(code)) continue;
      startEntries.set(code, { parent: currentCode, move: moveIndex, depth: currentEntry.depth + 1, lastVertex: move.vertex });
      if (goalTable.has(code)) return [...pathFromStart(code, startEntries), ...pathToSolved(code, goalTable)];
      states.push(next);
      codes.push(code);
    }
  }
  throw new Error("Unreachable Pyraminx core state");
}

/** Backward-compatible name; a physical solve must include axial-center orientation. */
export function solveEdges(state: PyraState): string[] {
  return solveCore(state);
}

export function solveTips(state: PyraState): string[] {
  const moves: string[] = [];
  for (let v = 0; v < 4; v++) {
    const turns = (3 - state.to[v]) % 3;
    for (let t = 0; t < turns; t++) moves.push(DEEP_LETTERS[v].toLowerCase());
  }
  return moves;
}

export function solve(state: PyraState): string[] {
  const coreMoves = solveCore(state);
  const afterCore = applySequence(state, coreMoves.join(" "));
  const tipMoves = solveTips(afterCore);
  const result = [...coreMoves, ...tipMoves];
  if (!isSolved(applySequence(state, result.join(" ")))) throw new Error("Pyraminx solution verification failed");
  return result;
}
