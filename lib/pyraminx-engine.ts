/**
 * Portable Pyraminx (triangular twisty puzzle) engine.
 *
 * A Pyraminx is a tetrahedron with 4 vertex axes. Turning at a vertex has two
 * depths:
 *   - a SHALLOW turn spins only the small trivial tip piece at that vertex.
 *   - a DEEP turn spins the tip plus the 3 edge pieces touching that vertex,
 *     as one rigid layer.
 * The 4 face-center ("axial") pieces never leave their vertex, but — like the
 * real puzzle — they DO rotate: a deep turn spins the vertex's center piece
 * along with its tip and edges. So the piece state worth tracking is:
 *   - 6 edge pieces: which of the 6 slots each currently occupies (`ep`),
 *     and whether each is flipped relative to its slot (`eo`).
 *   - 4 tip pieces: each stays at its home vertex forever, so it only needs
 *     a 0/1/2 rotation offset (`to`) — no permutation.
 *   - 4 center/axial pieces: also fixed to their vertex, each a 0/1/2 rotation
 *     offset (`co`). Unlike a tip, a center only turns on DEEP moves — a
 *     shallow tip twist spins the tip alone, leaving the center behind.
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

export type PyraState = { ep: number[]; eo: number[]; to: number[]; co: number[] };
export const solved = (): PyraState => ({ ep: [0, 1, 2, 3, 4, 5], eo: [0, 0, 0, 0, 0, 0], to: [0, 0, 0, 0], co: [0, 0, 0, 0] });
export const clone = (s: PyraState): PyraState => ({ ep: [...s.ep], eo: [...s.eo], to: [...s.to], co: [...s.co] });
export const isSolved = (s: PyraState) => s.ep.every((p, i) => p === i) && s.eo.every(o => o === 0) && s.to.every(t => t === 0) && s.co.every(c => c === 0);

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

  // A deep turn also spins the vertex's center piece and its 3 edges.
  out.co[vertex] = (out.co[vertex] + (direction === 1 ? 1 : 2)) % 3;
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

// ---- Deep solver: exhaustive BFS over the (edges × centers) state space ----
//
// Deep turns move two independent things: the 6 edges (6! * 2^6 = 46,080
// encoded slots) and the 4 center orientations (3^4 = 81). Because a shallow
// tip twist touches neither, everything a deep turn can reach lives in the
// product space (3,732,480 encoded slots), which BFS from the solved state can
// still fully explore ONE TIME and cache as a parent-pointer table — giving
// exact (shortest deep-turn-count) solutions for any scramble, with no
// heuristic search and no hand-written algorithm to get subtly wrong.
//
// Centers must be solved TOGETHER with edges, not afterwards: an edge-only
// solution almost always lands the centers in the wrong orientation (verified
// empirically), and there is no shallow move to fix a center without also
// re-scrambling edges. Only the tips, which no deep turn can strand, are safe
// to clean up in a trivial pass at the end.
//
// The 3.7M-slot tables are typed arrays (~19 MB total), not an array of
// objects, so the whole thing stays cheap enough to build lazily in a browser.

const EDGE_STATE_COUNT = 720 * 64; // 6! * 2^6
const CENTER_STATE_COUNT = 81;     // 3^4
const STATE_COUNT = EDGE_STATE_COUNT * CENTER_STATE_COUNT;

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

/** Inverse of `encodeEdges` — needed so BFS can hold its frontier as compact
 * integer codes instead of full state objects (millions of them would be far
 * too much memory as objects). */
function decodeEdges(edgeCode: number): { ep: number[]; eo: number[] } {
  const orientationMask = edgeCode % 64;
  let permIndex = Math.floor(edgeCode / 64);
  const eo = [0, 1, 2, 3, 4, 5].map(i => (orientationMask >> i) & 1);
  const avail = [0, 1, 2, 3, 4, 5];
  const ep: number[] = [];
  let factorial = 720;
  for (let i = 0; i < 6; i++) {
    factorial /= 6 - i;
    const rank = Math.floor(permIndex / factorial);
    permIndex %= factorial;
    ep.push(avail[rank]);
    avail.splice(rank, 1);
  }
  return { ep, eo };
}

const encodeCenters = (co: number[]) => co[0] + co[1] * 3 + co[2] * 9 + co[3] * 27;
const decodeCenters = (c: number) => [c % 3, Math.floor(c / 3) % 3, Math.floor(c / 9) % 3, Math.floor(c / 27) % 3];
const encodeFull = (ep: number[], eo: number[], co: number[]) => encodeEdges(ep, eo) * CENTER_STATE_COUNT + encodeCenters(co);

// The 8 deep generators, in a fixed order so a move can be stored as its index.
const DEEP_MOVES: PyraMove[] = [0, 1, 2, 3].flatMap((v): PyraMove[] => [
  { vertex: v as Axis, direction: 1, depth: "deep" },
  { vertex: v as Axis, direction: -1, depth: "deep" },
]);

type BfsTable = { prev: Int32Array; move: Int8Array; startCode: number };
let bfsTable: BfsTable | null = null;

function buildBfsTable(): BfsTable {
  // Precompute, per deep move, the transition on the two independent halves of
  // the code (edges 0..46079, centers 0..80). The main BFS then expands a state
  // with two array lookups and an integer combine instead of decoding and
  // cloning a full PyraState 7.5M times — the difference between a multi-second
  // pause and a snappy one when the table is first built in the browser.
  const edgeTrans: Int32Array[] = DEEP_MOVES.map(() => new Int32Array(EDGE_STATE_COUNT));
  for (let ec = 0; ec < EDGE_STATE_COUNT; ec++) {
    const { ep, eo } = decodeEdges(ec);
    for (let mi = 0; mi < DEEP_MOVES.length; mi++) {
      const next = applyMove({ ep, eo, co: [0, 0, 0, 0], to: [0, 0, 0, 0] }, DEEP_MOVES[mi]);
      edgeTrans[mi][ec] = encodeEdges(next.ep, next.eo);
    }
  }
  const centerTrans: Int8Array[] = DEEP_MOVES.map(m => {
    const arr = new Int8Array(CENTER_STATE_COUNT);
    for (let cc = 0; cc < CENTER_STATE_COUNT; cc++) {
      const co = decodeCenters(cc);
      co[m.vertex] = (co[m.vertex] + (m.direction === 1 ? 1 : 2)) % 3;
      arr[cc] = encodeCenters(co);
    }
    return arr;
  });

  const prev = new Int32Array(STATE_COUNT).fill(-1); // predecessor code, -1 = unvisited
  const move = new Int8Array(STATE_COUNT).fill(-1);  // index into DEEP_MOVES that reached this state
  const s0 = solved();
  const startCode = encodeFull(s0.ep, s0.eo, s0.co);
  prev[startCode] = startCode; // self-reference marks the root as visited

  const queue = new Int32Array(STATE_COUNT); // frontier as compact codes
  let head = 0, tail = 0;
  queue[tail++] = startCode;
  while (head < tail) {
    const currentCode = queue[head++];
    const ec = Math.floor(currentCode / CENTER_STATE_COUNT);
    const cc = currentCode % CENTER_STATE_COUNT;
    for (let mi = 0; mi < DEEP_MOVES.length; mi++) {
      const code = edgeTrans[mi][ec] * CENTER_STATE_COUNT + centerTrans[mi][cc];
      if (prev[code] !== -1) continue;
      prev[code] = currentCode;
      move[code] = mi;
      queue[tail++] = code;
    }
  }
  return { prev, move, startCode };
}

/**
 * Solves edges AND centers together via the precomputed BFS table.
 *
 * The table was built walking FORWARD from `solved`: reaching state X from
 * predecessor P used move `DEEP_MOVES[move[X]]`. To walk a scrambled state back
 * toward solved we step X -> prev[X], applying the INVERSE of that stored move
 * at each hop. Because we step from the scrambled state toward solved, the
 * inverse moves come out already in application order — collecting them as we
 * go yields the solution directly (reversing at the end would re-break it).
 */
export function solveEdgesAndCenters(state: PyraState): string[] {
  const table = bfsTable ?? (bfsTable = buildBfsTable());
  let code = encodeFull(state.ep, state.eo, state.co);
  const moves: string[] = [];
  let guard = 0;
  while (code !== table.startCode && guard < 128) {
    const mi = table.move[code];
    if (mi < 0) break; // defensive: every real game state is reachable
    moves.push(inverseToken(moveLabel(DEEP_MOVES[mi])));
    code = table.prev[code];
    guard++;
  }
  return moves;
}

/** Solves the 4 trivial tips directly — no search needed, each is 0-2 turns.
 * Runs after the deep solve: shallow tip twists disturb neither edges nor
 * centers, so they can never undo the work above. */
export function solveTips(state: PyraState): string[] {
  const moves: string[] = [];
  for (let v = 0; v < 4; v++) {
    const turns = (3 - state.to[v]) % 3; // number of +1 shallow turns to reach 0
    for (let t = 0; t < turns; t++) moves.push(DEEP_LETTERS[v].toLowerCase());
  }
  return moves;
}

/** Full solve: edges + centers via deep turns (which also carry the tips
 * along), then a trivial pass to zero the tips. */
export function solve(state: PyraState): string[] {
  const deepMoves = solveEdgesAndCenters(state);
  const afterDeep = applySequence(state, deepMoves.join(" "));
  const tipMoves = solveTips(afterDeep);
  return [...deepMoves, ...tipMoves];
}
