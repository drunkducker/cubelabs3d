/**
 * Portable Pyraminx (triangular twisty puzzle) engine.
 *
 * A Pyraminx is a tetrahedron with 4 vertex axes. Turning at a vertex has two
 * depths:
 *   - a SHALLOW turn spins only the small trivial tip piece at that vertex.
 *   - a DEEP turn spins the tip plus the 3 edge pieces touching that vertex,
 *     as one rigid layer.
 * The 4 face-center pieces are permanently fixed to the core and never move
 * under ANY turn — there is no cut depth that isolates them on a standard
 * (3-layer) Pyraminx. So the only piece state worth tracking is:
 *   - 6 edge pieces: which of the 6 slots each currently occupies (`ep`),
 *     and whether each is flipped relative to its slot (`eo`).
 *   - 4 tip pieces: each stays at its home vertex forever, so it only needs
 *     a 0/1/2 rotation offset (`to`) — no permutation.
 *
 * Geometry (vertices, faces, edges, colors) is derived once from a regular
 * tetrahedron centered at the origin, and the discrete move tables below are
 * DERIVED from that same geometry (via 3D rotation + nearest-position
 * matching) rather than hand-written from memory. This keeps a single
 * source of truth: the renderer and the solver both trace back to the same
 * vertex/edge/face definitions, so they can't quietly disagree with each
 * other. See `deriveMoveTables()`.
 */

export type Vec3 = [number, number, number];

// A regular tetrahedron centered at the origin — all 4 vertices are the same
// distance from the centroid, and all 6 edges are the same length.
export const VERTICES: Vec3[] = [
  [1, 1, 1],
  [1, -1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
];

// Face k is the triangle formed by the 3 vertices OTHER than vertex k (i.e.
// face k is "opposite" vertex k). Colors are assigned by face index.
export const FACE_COLORS = ["#00a85a", "#e52b3d", "#1557d5", "#ffd500"] as const; // green, red, blue, yellow
export const FACE_VERTICES: [number, number, number][] = [
  [1, 2, 3],
  [0, 2, 3],
  [0, 1, 3],
  [0, 1, 2],
];

// The 6 edges, canonical (i < j) pairs.
export const EDGE_PAIRS: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3],
];

// For vertex v, the 3 edge-slot indices (into EDGE_PAIRS) that touch it.
export const EDGES_AT_VERTEX: number[][] = [0, 1, 2, 3].map(v =>
  EDGE_PAIRS.reduce<number[]>((acc, [i, j], e) => (i === v || j === v ? [...acc, e] : acc), [])
);

// For edge slot e = (i, j), the 2 face indices touching it: every face
// index k that is neither i nor j (a face contains vertex i iff its own
// index isn't i, so a face touches edge (i,j) iff its index is neither).
export const FACES_AT_EDGE: [number, number][] = EDGE_PAIRS.map(([i, j]) =>
  [0, 1, 2, 3].filter(k => k !== i && k !== j) as [number, number]
);

// For vertex v, the 3 face indices touching it: every face except the one
// directly opposite v (face v itself).
export const FACES_AT_VERTEX: number[][] = [0, 1, 2, 3].map(v => [0, 1, 2, 3].filter(k => k !== v));

export type PyraState = { ep: number[]; eo: number[]; to: number[] };
export const solved = (): PyraState => ({ ep: [0, 1, 2, 3, 4, 5], eo: [0, 0, 0, 0, 0, 0], to: [0, 0, 0, 0] });
export const clone = (s: PyraState): PyraState => ({ ep: [...s.ep], eo: [...s.eo], to: [...s.to] });
export const isSolved = (s: PyraState) => s.ep.every((p, i) => p === i) && s.eo.every(o => o === 0) && s.to.every(t => t === 0);

// ---- Vector helpers (no three.js dependency — keeps this file portable) ----
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const length = (a: Vec3) => Math.sqrt(dot(a, a));
const normalize = (a: Vec3): Vec3 => scale(a, 1 / length(a));
const distanceSq = (a: Vec3, b: Vec3) => { const d = sub(a, b); return dot(d, d); };

/** Rodrigues' rotation formula: rotate vector `v` by `angle` radians around unit `axis`. */
export const rotateAroundAxis = (v: Vec3, axis: Vec3, angle: number): Vec3 => {
  const cosT = Math.cos(angle), sinT = Math.sin(angle);
  const term1 = scale(v, cosT);
  const term2 = scale(cross(axis, v), sinT);
  const term3 = scale(axis, dot(axis, v) * (1 - cosT));
  return add(add(term1, term2), term3);
};

export const edgeMidpoint = (e: number): Vec3 => { const [i, j] = EDGE_PAIRS[e]; return scale(add(VERTICES[i], VERTICES[j]), 0.5); };
/** Face k's outward direction — the centroid of face k's 3 vertices, which for
 * these symmetric coordinates (all vertices summing to 0) is exactly -V[k]/3. */
export const faceOutward = (k: number): Vec3 => normalize(scale(VERTICES[k], -1));

const TWO_PI_3 = (2 * Math.PI) / 3;

type VertexMoveTable = { from: [number, number, number]; to: [number, number, number]; flip: [boolean, boolean, boolean] };

/**
 * For vertex v, a turn by `angle` (+120° or -120°, i.e. the two possible
 * turn directions) 3-cycles the 3 edges touching v. `from[k]`/`to[k]` say
 * "the piece that was in slot from[k] ends up in slot to[k]"; `flip[k]`
 * says whether its orientation bit toggles along that specific transition.
 *
 * +120° and -120° are derived independently, each straight from the
 * geometry (rotate the real 3D positions, find the nearest slot). This is
 * deliberate: an earlier version derived only +120° and tried to algebraically
 * invert that table in `applyMove` for the -120° case, which is exactly the
 * kind of hand-derived combinatorics this file is trying to avoid — it's
 * easy to invert a permutation-with-orientation table incorrectly. Deriving
 * both directions from the same rotate-and-match geometry keeps everything
 * traceable to one source of truth instead of introducing separate manual
 * algebra with its own chance of being subtly wrong.
 */
function deriveVertexMove(v: number, angle: number): VertexMoveTable {
  const axis = normalize(VERTICES[v]);
  const touching = EDGES_AT_VERTEX[v]; // 3 edge-slot indices touching this vertex

  const to = touching.map(fromSlot => {
    const rotatedPos = rotateAroundAxis(edgeMidpoint(fromSlot), axis, angle);
    let best = -1, bestDist = Infinity;
    for (const toSlot of touching) {
      const d = distanceSq(rotatedPos, edgeMidpoint(toSlot));
      if (d < bestDist) { bestDist = d; best = toSlot; }
    }
    return best;
  }) as [number, number, number];

  // Orientation: a piece's two native colors are FACE_COLORS[FACES_AT_EDGE[home][0]]
  // and [1]. Rotate the direction of its "first" native color's sticker by
  // the same angle and see which of the destination slot's two face
  // directions it actually lands closest to. Landing on the destination's
  // own canonical "first" face = unflipped; landing on its "second" = flipped.
  const flip = touching.map((fromSlot, k) => {
    const toSlot = to[k];
    const [fa] = FACES_AT_EDGE[fromSlot];
    const rotatedStickerDir = rotateAroundAxis(faceOutward(fa), axis, angle);
    const [ta, tb] = FACES_AT_EDGE[toSlot];
    return distanceSq(rotatedStickerDir, faceOutward(tb)) < distanceSq(rotatedStickerDir, faceOutward(ta));
  }) as [boolean, boolean, boolean];

  return { from: touching as [number, number, number], to, flip };
}

// VERTEX_MOVES[v][0] = +120° table, VERTEX_MOVES[v][1] = -120° table.
const VERTEX_MOVES: [VertexMoveTable, VertexMoveTable][] = [0, 1, 2, 3].map(v => [
  deriveVertexMove(v, TWO_PI_3),
  deriveVertexMove(v, -TWO_PI_3),
]);

export type Axis = 0 | 1 | 2 | 3;
export type Direction = 1 | -1;
/** "deep" turns the tip + 3 adjacent edges together; "shallow" spins only the tip. */
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
  if (vertex < 0) throw new Error(`Invalid Pyraminx move: ${token}`);
  return { vertex, direction: prime ? -1 : 1, depth };
}

export function applyMove(state: PyraState, move: PyraMove): PyraState {
  const out = clone(state);
  const { vertex, direction, depth } = move;
  out.to[vertex] = (out.to[vertex] + (direction === 1 ? 1 : 2)) % 3;
  if (depth === "shallow") return out;

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
  if (token.endsWith("'")) return token.slice(0, -1);
  return `${token}'`;
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
    const prime = Math.random() > 0.5;
    out.push(`${DEEP_LETTERS[vertex]}${prime ? "'" : ""}`);
  }
  // Tips scramble independently of edges — twiddle each one a random amount
  // so the puzzle doesn't look suspiciously "solved at the corners."
  for (let v = 0; v < 4; v++) {
    const turns = Math.floor(Math.random() * 3);
    for (let t = 0; t < turns; t++) out.push(`${DEEP_LETTERS[v].toLowerCase()}`);
  }
  return out.join(" ");
}

// ---- Edge solver: exhaustive BFS over the full edge state space ----
//
// With centers fixed and tips trivial, the only real complexity is the 6
// edges: 6! permutations * 2^6 orientations = 46,080 reachable states. That
// is small enough to fully explore with a breadth-first search from the
// solved state ONE TIME and cache a parent-pointer table, giving instant,
// exact (shortest deep-turn-count) solves for any scramble — no heuristic
// search, no risk of an incomplete hand-written algorithm.

const STATE_COUNT = 720 * 64; // 6! * 2^6
function encodeEdges(ep: number[], eo: number[]): number {
  // Lehmer-code style permutation index (0..719) combined with a 6-bit
  // orientation mask (0..63) into a single 0..46079 integer.
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

type BfsEntry = { move: string; prevState: number } | null;
let bfsTable: BfsEntry[] | null = null;

function buildBfsTable(): BfsEntry[] {
  const table: BfsEntry[] = new Array(STATE_COUNT).fill(undefined) as BfsEntry[];
  const solvedState = solved();
  const startCode = encodeEdges(solvedState.ep, solvedState.eo);
  table[startCode] = null; // solved state has no predecessor
  const queue: PyraState[] = [solvedState];
  const queueCodes: number[] = [startCode];
  const deepMoves: PyraMove[] = [0, 1, 2, 3].flatMap((v): PyraMove[] => [
    { vertex: v as Axis, direction: 1, depth: "deep" },
    { vertex: v as Axis, direction: -1, depth: "deep" },
  ]);

  let head = 0;
  while (head < queue.length) {
    const current = queue[head]; const currentCode = queueCodes[head]; head++;
    for (const move of deepMoves) {
      const next = applyMove(current, move);
      const code = encodeEdges(next.ep, next.eo);
      if (table[code] !== undefined) continue;
      table[code] = { move: moveLabel(move), prevState: currentCode };
      queue.push(next);
      queueCodes.push(code);
    }
  }
  return table;
}

/**
 * Solves the edge subgroup only (ignores tips) via the precomputed BFS table.
 *
 * `bfsTable` was built by walking FORWARD from `solved` — table[X] =
 * {move: M, prevState: P} means X = applyMove(P, M). To walk a scrambled
 * state back toward solved we need to go the other way at each step (X -> P),
 * which means applying the INVERSE of the stored move, not the move itself.
 * And since we're already stepping from the scrambled state toward solved,
 * the moves come out in the correct application order as we collect them —
 * reversing the list at the end would undo that and re-break it.
 */
export function solveEdges(state: PyraState): string[] {
  const table: BfsEntry[] = bfsTable ?? (bfsTable = buildBfsTable());
  const startCode = encodeEdges(state.ep, state.eo);
  const moves: string[] = [];
  let code: number | null = startCode;
  let guard = 0;
  while (code !== null && guard < 64) {
    const entry: BfsEntry = table[code];
    if (!entry) break;
    moves.push(inverseToken(entry.move));
    code = entry.prevState;
    guard++;
  }
  return moves;
}

/** Solves the 4 trivial tips directly — no search needed, each is 0-2 turns. */
export function solveTips(state: PyraState): string[] {
  const moves: string[] = [];
  for (let v = 0; v < 4; v++) {
    const turns = (3 - state.to[v]) % 3; // number of +1 shallow turns to reach 0
    for (let t = 0; t < turns; t++) moves.push(DEEP_LETTERS[v].toLowerCase());
  }
  return moves;
}

/** Full solve: edges first (deep turns also carry tips along), then clean up tips. */
export function solve(state: PyraState): string[] {
  const edgeMoves = solveEdges(state);
  const afterEdges = applySequence(state, edgeMoves.join(" "));
  const tipMoves = solveTips(afterEdges);
  return [...edgeMoves, ...tipMoves];
}
