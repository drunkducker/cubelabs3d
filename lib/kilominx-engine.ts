/**
 * Portable Kilominx (corners-only Megaminx) engine.
 *
 * A Kilominx is a regular dodecahedron: 12 pentagonal faces, 20 corner pieces,
 * 30 edges. Only the 20 CORNERS are real pieces (there are no separate edge
 * pieces, and the face centers are fixed to the core). Each corner is where 3
 * faces meet, so it carries 3 stickers. Turning a face spins the 5 corners
 * around it by 72°.
 *
 * State worth tracking is therefore just the 20 corners:
 *   - `cp[slot]` : which corner piece currently sits in each of the 20 slots
 *                  (a permutation of 0..19).
 *   - `co[slot]` : that piece's rotation, 0/1/2 (a 3-fold twist, since a corner
 *                  has 3 stickers).
 *
 * As in lib/pyraminx-engine.ts, ALL geometry (vertices, faces, which corner
 * touches which faces) is derived once from a regular dodecahedron, and the
 * discrete move tables are DERIVED from that same geometry (3D rotation +
 * nearest-position matching) rather than hand-written from memory. The renderer
 * and the solver both trace back to the same vertex/face definitions, so they
 * cannot quietly disagree.
 *
 * The solver (see `solve`) is a REDUCTION solver. A Kilominx has ~10^24 states,
 * far too many to brute-force like the Pyraminx. Instead the engine SEARCHES
 * ITS OWN derived move set for two primitives — a pure 3-cycle of corners and a
 * pure 3-corner twist — then relocates them to any target corners by conjugation
 * (setup moves found via a small breadth-first search over the positions of 3
 * tracked corners). Permutation is solved with 3-cycles (face turns are 5-cycles,
 * so every reachable permutation is even and 3-cycles suffice) and orientation
 * with twists (the corner-twist sum is invariant mod 3, so it is always
 * fixable). Every primitive is verified against the engine at build time rather
 * than memorised. Solutions are correct but NOT move-optimal.
 */

export type Vec3 = [number, number, number];

const PHI = (1 + Math.sqrt(5)) / 2;
const INV_PHI = 1 / PHI;

/**
 * The 20 vertices of a regular dodecahedron (the Kilominx corners), in the
 * canonical golden-ratio coordinates: the 8 cube corners (±1,±1,±1) plus the
 * three rectangles (0,±φ,±1/φ), (±1/φ,0,±φ), (±φ,±1/φ,0).
 */
export const VERTICES: Vec3[] = (() => {
  const v: Vec3[] = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) v.push([x, y, z]);
  for (const a of [-PHI, PHI]) for (const b of [-INV_PHI, INV_PHI]) v.push([0, a, b]);
  for (const a of [-INV_PHI, INV_PHI]) for (const b of [-PHI, PHI]) v.push([a, 0, b]);
  for (const a of [-PHI, PHI]) for (const b of [-INV_PHI, INV_PHI]) v.push([a, b, 0]);
  return v;
})();

/**
 * The 12 face outward normals, which point toward the vertices of the dual
 * icosahedron: (0,±1,±φ), (±1,±φ,0), (±φ,0,±1). Colours are assigned by face
 * index. The palette matches a standard Megaminx-style 12-colour scheme.
 */
export const FACE_NORMALS: Vec3[] = (() => {
  const f: Vec3[] = [];
  for (const a of [-1, 1]) for (const b of [-PHI, PHI]) f.push([0, a, b]);
  for (const a of [-1, 1]) for (const b of [-PHI, PHI]) f.push([a, b, 0]);
  for (const a of [-1, 1]) for (const b of [-PHI, PHI]) f.push([b, 0, a]);
  return f;
})();

export const FACE_COLORS = [
  "#f5f5f5", // white
  "#ffd500", // yellow
  "#1557d5", // dark blue
  "#59a7ff", // light blue
  "#e52b3d", // red
  "#ff5aa8", // pink
  "#ff7a1a", // orange
  "#8fe36b", // light green
  "#00a85a", // dark green
  "#8b5cf6", // purple
  "#9aa3ad", // grey
  "#8a5a2b", // brown
] as const;

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
  const c = Math.cos(angle), s = Math.sin(angle);
  return add(add(scale(v, c), scale(cross(axis, v), s)), scale(axis, dot(axis, v) * (1 - c)));
};

const FACE_UNIT = FACE_NORMALS.map(normalize);
const VERTEX_UNIT = VERTICES.map(normalize);

/** The outward unit normal of face f. */
export const faceNormal = (f: number): Vec3 => FACE_UNIT[f];

/**
 * FACE_CORNERS[f] = the 5 corner (vertex) indices of pentagonal face f: the 5
 * dodecahedron vertices nearest the face's outward direction. (A face's 5
 * vertices all share the largest dot product with its normal — verified by the
 * clean gap between the 5th and 6th dot products.)
 */
export const FACE_CORNERS: number[][] = FACE_UNIT.map(fn =>
  VERTICES.map((_, i) => [i, dot(VERTEX_UNIT[i], fn)] as [number, number])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(x => x[0])
);

/**
 * CORNER_FACES[c] = the 3 face indices meeting at corner c, ordered
 * COUNTERCLOCKWISE as seen from outside the puzzle along the corner's outward
 * direction. This CCW ordering is what makes a corner's orientation a clean
 * cyclic 0/1/2 value: it turns the twist a move imparts into a well-defined
 * +delta (mod 3). Ordering the 3 faces by raw index instead leaves the twist
 * deltas rotationally incoherent, so they no longer sum to 0 around a face and
 * `move^5 = identity` silently breaks. (Learned the hard way.)
 */
export const CORNER_FACES: number[][] = VERTEX_UNIT.map((vn) => {
  const faces = FACE_UNIT.map((fn, i) => [i, dot(vn, fn)] as [number, number])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(x => x[0]);
  // A tangent basis (t, b) in the plane perpendicular to the corner direction.
  let t = sub(FACE_UNIT[faces[0]], scale(vn, dot(FACE_UNIT[faces[0]], vn)));
  t = normalize(t);
  const b = cross(vn, t);
  const angle = (f: number) => Math.atan2(dot(FACE_UNIT[f], b), dot(FACE_UNIT[f], t));
  return faces.sort((x, y) => angle(x) - angle(y));
});

const TURN = (2 * Math.PI) / 5;

/** One corner's transition under a face turn: the piece in slot `from` moves to
 * slot `to`, and its orientation gains `twist` (mod 3). */
type CornerMove = { from: number; to: number; twist: number };

/**
 * Derive the move table for face f turned by direction d (+1 = +72°, -1 = -72°),
 * straight from the geometry. Rotate each of the face's 5 corner positions and
 * match to the nearest corner slot to get the permutation; rotate the corner's
 * CCW-frame reference sticker to get the orientation twist. Both directions are
 * derived independently from the real 3D rotation, so neither relies on
 * algebraically inverting the other.
 */
function deriveFace(f: number, d: 1 | -1): CornerMove[] {
  const axis = FACE_UNIT[f];
  const ring = FACE_CORNERS[f];
  return ring.map(c => {
    const rotatedPos = rotateAroundAxis(VERTICES[c], axis, d * TURN);
    let to = -1, best = Infinity;
    for (const c2 of ring) {
      const dd = distanceSq(rotatedPos, VERTICES[c2]);
      if (dd < best) { best = dd; to = c2; }
    }
    // Orientation: rotate the from-corner's CCW frame-0 sticker direction and
    // read which CCW index of the destination corner's frame it lands on.
    const stickerDir = rotateAroundAxis(FACE_UNIT[CORNER_FACES[c][0]], axis, d * TURN);
    let landFace = -1, bestF = Infinity;
    for (const ff of CORNER_FACES[to]) {
      const dd = distanceSq(stickerDir, FACE_UNIT[ff]);
      if (dd < bestF) { bestF = dd; landFace = ff; }
    }
    return { from: c, to, twist: CORNER_FACES[to].indexOf(landFace) };
  });
}

// MOVES[i] is the corner-transition table; MOVE_KEYS[i] its "f±" label. Index
// 2f is face f "+"; index 2f+1 is face f "-".
export const MOVES: CornerMove[][] = [];
export const MOVE_KEYS: string[] = [];
for (let f = 0; f < 12; f++) {
  for (const d of [1, -1] as const) {
    MOVES.push(deriveFace(f, d));
    MOVE_KEYS.push(`${f}${d > 0 ? "+" : "-"}`);
  }
}
export const MOVE_COUNT = MOVES.length; // 24

export const faceOfMove = (mi: number) => mi >> 1;
export const dirOfMove = (mi: number): 1 | -1 => (mi & 1 ? -1 : 1);
export const inverseMoveIndex = (mi: number) => mi ^ 1;

/** Human-readable notation for a move index, e.g. face 2 turned back = "3'"
 * (faces are numbered 1..12; a trailing apostrophe means a reverse turn). */
export function moveLabel(mi: number): string {
  const f = faceOfMove(mi) + 1;
  return dirOfMove(mi) === 1 ? `${f}` : `${f}'`;
}

export function parseMove(token: string): number {
  const prime = token.endsWith("'");
  const face = parseInt(prime ? token.slice(0, -1) : token, 10) - 1;
  if (Number.isNaN(face) || face < 0 || face > 11) throw new Error(`Invalid Kilominx move: ${token}`);
  return face * 2 + (prime ? 1 : 0);
}

// ---- State ----
export type KiloState = { cp: number[]; co: number[] };
export const solved = (): KiloState => ({ cp: Array.from({ length: 20 }, (_, i) => i), co: new Array(20).fill(0) });
export const clone = (s: KiloState): KiloState => ({ cp: [...s.cp], co: [...s.co] });
export const isSolved = (s: KiloState) => s.cp.every((p, i) => p === i) && s.co.every(o => o === 0);
export const equal = (a: KiloState, b: KiloState) => a.cp.every((p, i) => p === b.cp[i]) && a.co.every((o, i) => o === b.co[i]);

export function applyMoveIndex(s: KiloState, mi: number): KiloState {
  const t = MOVES[mi];
  const cp = [...s.cp], co = [...s.co];
  for (const { from, to, twist } of t) {
    cp[to] = s.cp[from];
    co[to] = (s.co[from] + twist) % 3;
  }
  return { cp, co };
}

export function applyMoves(s: KiloState, seq: number[]): KiloState {
  let cur = s;
  for (const mi of seq) cur = applyMoveIndex(cur, mi);
  return cur;
}

/** Apply a whitespace-separated notation string (e.g. "3 5' 1"). */
export function applySequence(s: KiloState, notation: string): KiloState {
  const seq = notation.trim().split(/\s+/).filter(Boolean).map(parseMove);
  return applyMoves(s, seq);
}

export const inverseSequence = (seq: number[]): number[] => seq.slice().reverse().map(inverseMoveIndex);

export function randomScramble(count = 40): number[] {
  const seq: number[] = [];
  let lastFace = -1;
  for (let i = 0; i < count; i++) {
    let mi: number;
    do { mi = Math.floor(Math.random() * MOVE_COUNT); } while (faceOfMove(mi) === lastFace);
    lastFace = faceOfMove(mi);
    seq.push(mi);
  }
  return seq;
}

export const scrambleToNotation = (seq: number[]) => seq.map(moveLabel).join(" ");

/**
 * Collapse consecutive turns of the same face (rotation counts add mod 5). A
 * face's five turn states map to 0 / +1 / +2 / +2 / +1 moves, so a run either
 * cancels, shrinks to a single turn, or becomes a double turn (kept as two
 * moves, since the puzzle's move set only contains single ±72° turns). Run to a
 * fixed point. This is a purely cosmetic pass over the solver's output — it
 * never changes what the sequence does, only its length.
 */
export function simplify(seq: number[]): number[] {
  let cur = seq;
  for (;;) {
    const out: number[] = [];
    for (const m of cur) {
      const f = faceOfMove(m);
      if (out.length && faceOfMove(out[out.length - 1]) === f) {
        // Pop the ENTIRE trailing run of this face and re-add the net rotation,
        // so a run of five same turns collapses to nothing, not to a leftover.
        let net = dirOfMove(m);
        while (out.length && faceOfMove(out[out.length - 1]) === f) net += dirOfMove(out.pop()!);
        net = ((net % 5) + 5) % 5;
        if (net === 1) out.push(f * 2);
        else if (net === 4) out.push(f * 2 + 1);
        else if (net === 2) { out.push(f * 2); out.push(f * 2); }
        else if (net === 3) { out.push(f * 2 + 1); out.push(f * 2 + 1); }
        // net === 0 -> the run cancels, push nothing
      } else out.push(m);
    }
    if (out.length === cur.length) return out;
    cur = out;
  }
}

// ------------------------------------------------------------------
//  Solver
// ------------------------------------------------------------------
// Built lazily on first solve and cached (mirrors the Pyraminx BFS table).

type SolverTables = {
  cycleTable: Map<string, number[]>; // "a,b,c" (piece a->b->c) -> sequence realising it
  twistTable: Map<string, { seq: number[]; per: number }>; // sorted "a,b,c" -> +per-each triple twist
};
let tables: SolverTables | null = null;

const movedCorners = (s: KiloState): number[] => { const m: number[] = []; for (let i = 0; i < 20; i++) if (s.cp[i] !== i) m.push(i); return m; };
const twistedCorners = (s: KiloState): number[] => { const m: number[] = []; for (let i = 0; i < 20; i++) if (s.co[i] !== 0) m.push(i); return m; };

/** All non-empty move sequences up to length maxLen with no two consecutive
 * turns on the same face. Materialised as an array (only used at table-build
 * time with small maxLen). */
function enumerateSeqs(maxLen: number): number[][] {
  let frontier: number[][] = [[]];
  const out: number[][] = [];
  for (let depth = 0; depth < maxLen; depth++) {
    const next: number[][] = [];
    for (const seq of frontier) {
      const lastFace = seq.length ? faceOfMove(seq[seq.length - 1]) : -1;
      for (let m = 0; m < MOVE_COUNT; m++) {
        if (faceOfMove(m) === lastFace) continue;
        const extended = [...seq, m];
        out.push(extended);
        next.push(extended);
      }
    }
    frontier = next;
  }
  return out;
}

/** Read a state's permutation as a single 3-cycle (piece a -> slot b -> slot c
 * -> a), or null if it is not a clean 3-cycle. */
function readThreeCycle(cp: number[]): number[] | null {
  const moved: number[] = [];
  for (let i = 0; i < 20; i++) if (cp[i] !== i) moved.push(i);
  if (moved.length !== 3) return null;
  const next: Record<number, number> = {};
  for (const d of moved) next[cp[d]] = d; // piece p ends at slot next[p]
  const start = moved[0];
  const order = [start];
  let x = next[start];
  while (x !== start && order.length < 4) { order.push(x); x = next[x]; }
  return order.length === 3 ? order : null;
}

function buildTables(): SolverTables {
  const S = solved();

  // 1. A pure 3-cycle of corners: a commutator [A, B] = A B A' B' (A a single
  //    turn, B a short insertion) whose net effect permutes exactly 3 corners
  //    and twists none. Found by direct search over the derived moves.
  let cycle3: number[] | null = null;
  outerCycle:
  for (let a = 0; a < MOVE_COUNT; a++) {
    for (const b of enumerateSeqs(4)) {
      const seq = [a, ...b, inverseMoveIndex(a), ...inverseSequence(b)];
      const st = applyMoves(S, seq);
      if (movedCorners(st).length === 3 && twistedCorners(st).length === 0) { cycle3 = simplify(seq); break outerCycle; }
    }
  }
  if (!cycle3) throw new Error("Kilominx solver: no pure 3-cycle found");

  // 2. A pure 3-corner twist (no permutation): the commutator of the 3-cycle
  //    with a conjugate of itself, [P, gPg'], twists the 3 shared corners
  //    equally. Pick the shortest such twist over small setups g.
  let twist3: number[] | null = null;
  for (const g of enumerateSeqs(3)) {
    const p2 = [...g, ...cycle3, ...inverseSequence(g)];
    const comm = simplify([...cycle3, ...p2, ...inverseSequence(cycle3), ...inverseSequence(p2)]);
    const st = applyMoves(S, comm);
    const tw = twistedCorners(st);
    if (movedCorners(st).length === 0 && tw.length === 3 && tw.every(i => st.co[i] === st.co[tw[0]])) {
      if (!twist3 || comm.length < twist3.length) twist3 = comm;
    }
  }
  if (!twist3) throw new Error("Kilominx solver: no pure twist found");

  // 3. Conjugator BFS: from solved, breadth-first over the POSITIONS of the 3
  //    corners the primitives natively act on (a complete action on triples,
  //    reaching all 20*19*18 = 6840 arrangements). This yields the shortest
  //    setup g moving those 3 corners to any target slots.
  const base = movedCorners(applyMoves(S, cycle3)); // the 3 corners cycle3 touches
  const markKey = (st: KiloState) => `${st.cp.indexOf(base[0])},${st.cp.indexOf(base[1])},${st.cp.indexOf(base[2])}`;
  const setups = new Map<string, number[]>();
  {
    setups.set(markKey(S), []);
    const queueStates = [S];
    const queueSeqs: number[][] = [[]];
    let head = 0;
    while (head < queueStates.length) {
      const st = queueStates[head], g = queueSeqs[head]; head++;
      for (let m = 0; m < MOVE_COUNT; m++) {
        const ns = applyMoveIndex(st, m);
        const k = markKey(ns);
        if (!setups.has(k)) { const ng = [...g, m]; setups.set(k, ng); queueStates.push(ns); queueSeqs.push(ng); }
      }
    }
  }

  // 4. Relocate the primitives to every target triple by conjugation. Note the
  //    conjugate that acts on the SAME corners the setup g moves is g' P g (the
  //    setup applied first as its inverse), not g P g'.
  const cycleTable = new Map<string, number[]>();
  const twistTable = new Map<string, { seq: number[]; per: number }>();
  setups.forEach((g) => {
    const conj = simplify([...inverseSequence(g), ...cycle3, ...g]);
    const cyc = readThreeCycle(applyMoves(S, conj).cp);
    if (cyc) {
      for (let r = 0; r < 3; r++) {
        const key = `${cyc[r]},${cyc[(r + 1) % 3]},${cyc[(r + 2) % 3]}`;
        if (!cycleTable.has(key)) cycleTable.set(key, conj);
      }
    }
    const tconj = simplify([...inverseSequence(g), ...twist3, ...g]);
    const ts = applyMoves(S, tconj);
    const tw = twistedCorners(ts);
    if (movedCorners(ts).length === 0 && tw.length === 3) {
      const key = [...tw].sort((a, b) => a - b).join(",");
      if (!twistTable.has(key)) twistTable.set(key, { seq: tconj, per: ts.co[tw[0]] });
    }
  });

  return { cycleTable, twistTable };
}

/** Sequence realising the 3-cycle "piece at a -> slot b -> slot c -> a". Falls
 * back to applying the reverse cycle twice. */
function threeCycle(t: SolverTables, a: number, b: number, c: number): number[] | null {
  const fwd = t.cycleTable.get(`${a},${b},${c}`);
  if (fwd) return fwd;
  const rev = t.cycleTable.get(`${a},${c},${b}`);
  return rev ? [...rev, ...rev] : null;
}

/** Sequence twisting the 3 given corners by +d each (d = 1 or 2). */
function tripleTwist(t: SolverTables, triple: number[], d: number): number[] | null {
  const e = t.twistTable.get([...triple].sort((a, b) => a - b).join(","));
  if (!e) return null;
  // e twists by +per each; repeat until the accumulated per equals +d.
  const times = e.per === 1 ? ((d % 3) + 3) % 3 : (((2 * d) % 3) + 3) % 3;
  const out: number[] = [];
  for (let i = 0; i < times; i++) out.push(...e.seq);
  return out;
}

/** Twist corner a by +1 and corner b by -1 (their twist sum stays 0), by
 * combining two triple twists that share two helper corners. */
function twoTwist(t: SolverTables, a: number, b: number): number[] | null {
  for (let h1 = 0; h1 < 20; h1++) {
    if (h1 === a || h1 === b) continue;
    for (let h2 = h1 + 1; h2 < 20; h2++) {
      if (h2 === a || h2 === b) continue;
      const s1 = tripleTwist(t, [h1, h2, a], 1);
      const s2 = tripleTwist(t, [h1, h2, b], 2);
      if (s1 && s2) return [...s1, ...s2];
    }
  }
  return null;
}

/**
 * Solve any Kilominx state. Returns the solution as a list of move indices
 * (already simplified). Throws if the state is unreachable/inconsistent.
 *
 * Phase 1 places corners 0..17 with 3-cycles (the last 2 fall into place, since
 * the permutation is always even). Phase 2 fixes orientation: batch corners
 * needing the same twist into triple twists, then clean up the remainder with
 * two-corner twists using corner 19 as the sink (the twist sum is invariant, so
 * the last corner resolves for free).
 */
export function solve(state: KiloState): number[] {
  const t = tables ?? (tables = buildTables());
  let s = clone(state);
  const solution: number[] = [];
  const run = (seq: number[]) => { for (const mi of seq) s = applyMoveIndex(s, mi); solution.push(...seq); };

  // Phase 1: permutation.
  for (let target = 0; target < 18; target++) {
    let guard = 0;
    while (s.cp[target] !== target && guard++ < 12) {
      const src = s.cp.indexOf(target);
      let placed = false;
      for (let helper = target + 1; helper < 20 && !placed; helper++) {
        if (helper === src || helper === target) continue;
        const seq = threeCycle(t, src, target, helper);
        if (seq) { run(seq); placed = true; }
      }
      if (!placed) throw new Error(`Kilominx solve: no 3-cycle to place corner ${target}`);
    }
  }
  if (!s.cp.every((v, i) => v === i)) throw new Error("Kilominx solve: permutation phase failed");

  // Phase 2: orientation.
  const needPlus1: number[] = []; // corners needing +1 (co === 2)
  const needPlus2: number[] = []; // corners needing +2 (co === 1)
  for (let i = 0; i < 20; i++) {
    const need = (3 - s.co[i]) % 3;
    if (need === 1) needPlus1.push(i);
    else if (need === 2) needPlus2.push(i);
  }
  while (needPlus1.length >= 3) { const tri = [needPlus1.pop()!, needPlus1.pop()!, needPlus1.pop()!]; run(tripleTwist(t, tri, 1)!); }
  while (needPlus2.length >= 3) { const tri = [needPlus2.pop()!, needPlus2.pop()!, needPlus2.pop()!]; run(tripleTwist(t, tri, 2)!); }
  // Remainders pair up: a needing +1 with b needing +2 (= -1) is exactly a two-corner twist.
  while (needPlus1.length && needPlus2.length) { run(twoTwist(t, needPlus1.pop()!, needPlus2.pop()!)!); }

  if (!isSolved(s)) throw new Error("Kilominx solve: orientation phase failed");
  return simplify(solution);
}
