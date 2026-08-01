/**
 * Standalone Skewb engine (rev3).
 *
 * Independent of the older Skewb engine: the puzzle, its moves, and its solver
 * are all derived here from first principles on a geometric model, and every
 * derivation is cross-checked in tests (move order 3, scramble/inverse round
 * trips, and a solver that provably returns the cube to solved).
 *
 * Model
 * -----
 * A Skewb is a cube (faces U D L R F B). Each face carries five stickers: one
 * centre and four corner triangles. There are 6 centre pieces (one sticker
 * each) and 8 corner pieces (three stickers each) — 30 stickers total.
 *
 * A twist is a 120° rotation of one half of the cube about a body diagonal
 * (through a corner). The half on the tip side of the plane through the cube
 * centre holds four corners and three centres; those seven pieces rotate, the
 * rest stay put. We derive each move's sticker permutation by rotating every
 * affected sticker's (position, face-normal) and matching it to the solved slot
 * it lands on, so the permutation can never silently disagree with the geometry
 * a renderer would draw.
 */

export const FACES = ["U", "D", "L", "R", "F", "B"] as const;
export type Face = (typeof FACES)[number];

export type Vec3 = readonly [number, number, number];

const FACE_NORMAL: Record<Face, Vec3> = {
  U: [0, 1, 0], D: [0, -1, 0], L: [-1, 0, 0], R: [1, 0, 0], F: [0, 0, 1], B: [0, 0, -1],
};

// The eight corners of the cube.
const CORNERS: Vec3[] = [];
for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) CORNERS.push([x, y, z]);

/**
 * Sticker slots. A slot is a fixed location on the solved cube identified by its
 * 3D centroid and outward normal. Corner-triangle slots sit near a cube corner
 * on one of the three faces meeting there; centre slots sit at a face centre.
 * The array order is the canonical slot ordering used everywhere.
 */
export type Slot = {
  index: number;
  kind: "center" | "corner";
  face: Face;
  /** centroid of the sticker, used for geometric matching and rendering */
  pos: Vec3;
  /** outward normal (the face normal) */
  normal: Vec3;
  /** solved colour = the face this slot lives on */
  color: Face;
  /** for corner stickers: which cube corner the triangle hugs */
  corner?: Vec3;
};

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const vEq = (a: Vec3, b: Vec3) => near(a[0], b[0]) && near(a[1], b[1]) && near(a[2], b[2]);

function buildSlots(): Slot[] {
  const slots: Slot[] = [];
  const push = (s: Omit<Slot, "index">) => slots.push({ index: slots.length, ...s });
  for (const face of FACES) {
    const n = FACE_NORMAL[face];
    // centre sticker: at the face centre, pushed just off the surface
    push({ kind: "center", face, pos: [n[0], n[1], n[2]], normal: n, color: face });
    // four corner triangles: the cube corners that lie on this face
    for (const c of CORNERS) {
      const onFace =
        (n[0] !== 0 && near(c[0], n[0])) ||
        (n[1] !== 0 && near(c[1], n[1])) ||
        (n[2] !== 0 && near(c[2], n[2]));
      if (!onFace) continue;
      // triangle centroid: pull the corner in toward the face centre a little
      const t = 0.55;
      const pos: Vec3 = [
        n[0] !== 0 ? n[0] : c[0] * t,
        n[1] !== 0 ? n[1] : c[1] * t,
        n[2] !== 0 ? n[2] : c[2] * t,
      ];
      push({ kind: "corner", face, pos, normal: n, color: face, corner: c });
    }
  }
  return slots;
}

export const SLOTS: Slot[] = buildSlots();
export const STICKER_COUNT = SLOTS.length; // 30

// ---- rotations -------------------------------------------------------
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Vec3): Vec3 => { const m = Math.hypot(a[0], a[1], a[2]); return [a[0] / m, a[1] / m, a[2] / m]; };

/** Rodrigues rotation of v about unit axis k by angle θ. */
function rotate(v: Vec3, k: Vec3, theta: number): Vec3 {
  const c = Math.cos(theta), s = Math.sin(theta);
  const kx = k[0], ky = k[1], kz = k[2];
  const kdotv = dot(k, v);
  // v*cos + (k×v)*sin + k*(k·v)*(1-cos)
  const cross: Vec3 = [ky * v[2] - kz * v[1], kz * v[0] - kx * v[2], kx * v[1] - ky * v[0]];
  return [
    v[0] * c + cross[0] * s + kx * kdotv * (1 - c),
    v[1] * c + cross[1] * s + ky * kdotv * (1 - c),
    v[2] * c + cross[2] * s + kz * kdotv * (1 - c),
  ];
}
const snap = (v: Vec3): Vec3 => v.map((x) => Math.round(x * 1e6) / 1e6) as unknown as Vec3;

// ---- moves -----------------------------------------------------------
// Four axes, one per body diagonal, named after a top corner grabbed.
export const MOVE_AXES = ["R", "L", "U", "B"] as const;
export type MoveAxis = (typeof MOVE_AXES)[number];
export type Move = { axis: MoveAxis; dir: 1 | -1 };

// axis diagonal directions (top four corners → four distinct diagonals)
const AXIS_CORNER: Record<MoveAxis, Vec3> = {
  R: [1, 1, 1],
  L: [-1, 1, 1],
  U: [1, 1, -1],
  B: [-1, 1, -1],
};

/** slotPerm[axis][dirIdx][destSlot] = sourceSlot (colour at dest comes from src). */
const MOVE_PERM: Record<string, Int32Array> = {};

function centroidOfPiece(slot: Slot): Vec3 {
  // a piece's rotation membership is decided by the cube corner (corners) or
  // the face normal (centres) — both are good representatives of which half.
  return slot.kind === "corner" ? slot.corner! : slot.normal;
}

/** Permutation for a 120° twist of the half on the tip side of `corner`. */
function buildCornerPerm(corner: Vec3, dir: 1 | -1): Int32Array {
  const k = norm(corner);
  const theta = dir * (2 * Math.PI) / 3;
  const perm = new Int32Array(STICKER_COUNT);
  for (let d = 0; d < STICKER_COUNT; d++) perm[d] = d; // identity default
  for (const src of SLOTS) {
    const rep = centroidOfPiece(src);
    if (dot(rep, corner) <= 1e-9) continue; // stays put
    const newPos = snap(rotate(src.pos, k, theta));
    const newNormal = snap(rotate(src.normal, k, theta));
    const dest = SLOTS.find((s) => vEq(s.pos, newPos) && vEq(s.normal, newNormal));
    if (!dest) throw new Error(`skewb3: twist about ${corner.join(",")} lost sticker ${src.index}`);
    perm[dest.index] = src.index;
  }
  return perm;
}

for (const axis of MOVE_AXES) for (const dir of [1, -1] as const) {
  MOVE_PERM[`${axis}${dir}`] = buildCornerPerm(AXIS_CORNER[axis], dir);
}

/** The four twistable corners, exposed for the renderer's swipe interaction.
 * (Only these keep the cube inside the solver's group; twisting the opposite
 * four corners is a whole-cube reorientation the fixed-face solver can't undo.) */
export const AXIS_CORNERS: { axis: MoveAxis; corner: Vec3 }[] = MOVE_AXES.map((axis) => ({ axis, corner: AXIS_CORNER[axis] }));

// ---- state -----------------------------------------------------------
/** State = colour (a Face) at each sticker slot, in canonical slot order. */
export type SkewbState = Face[];

export function solved(): SkewbState {
  return SLOTS.map((s) => s.color);
}
export function clone(s: SkewbState): SkewbState {
  return s.slice();
}
export function isSolved(s: SkewbState): boolean {
  for (let i = 0; i < s.length; i++) if (s[i] !== SLOTS[i].color) return false;
  return true;
}
export function stateKey(s: SkewbState): string {
  return s.join("");
}

export function applyMove(s: SkewbState, move: Move): SkewbState {
  const perm = MOVE_PERM[`${move.axis}${move.dir}`];
  const out: SkewbState = new Array(STICKER_COUNT);
  for (let i = 0; i < STICKER_COUNT; i++) out[i] = s[perm[i]];
  return out;
}
export function applyMoves(s: SkewbState, moves: Move[]): SkewbState {
  return moves.reduce(applyMove, s);
}

export const moveLabel = (m: Move) => `${m.axis}${m.dir === -1 ? "'" : ""}`;
export const invertMove = (m: Move): Move => ({ axis: m.axis, dir: (m.dir === 1 ? -1 : 1) });
export const formatMoves = (moves: Move[]) => moves.map(moveLabel).join(" ");

export function parseMoves(text: string): Move[] {
  const out: Move[] = [];
  for (const tok of text.trim().split(/\s+/).filter(Boolean)) {
    const m = /^([RLUB])('?)$/.exec(tok);
    if (!m) throw new Error(`Unknown Skewb move "${tok}"`);
    out.push({ axis: m[1] as MoveAxis, dir: m[2] ? -1 : 1 });
  }
  return out;
}

// ---- scramble --------------------------------------------------------
export function randomScramble(count = 12): Move[] {
  const moves: Move[] = [];
  let lastAxis: MoveAxis | null = null;
  while (moves.length < count) {
    const axis = MOVE_AXES[Math.floor(Math.random() * MOVE_AXES.length)];
    if (axis === lastAxis) continue; // twisting the same corner again just extends it
    lastAxis = axis;
    moves.push({ axis, dir: Math.random() < 0.5 ? 1 : -1 });
  }
  return moves;
}
export function scrambledState(count = 12): { state: SkewbState; moves: Move[] } {
  const moves = randomScramble(count);
  return { state: applyMoves(solved(), moves), moves };
}

// ---- solver (bidirectional BFS, optimal) -----------------------------
const ALL_MOVES: Move[] = MOVE_AXES.flatMap((axis) => [{ axis, dir: 1 as const }, { axis, dir: -1 as const }]);

/**
 * Optimal solve by meet-in-the-middle. God's number for the Skewb is 11, and
 * the whole state space is ~3.1M, so a breadth-first search from each side that
 * meets in the middle finds a shortest solution in milliseconds. Consecutive
 * twists of the same corner are pruned (three equal twists are identity, so an
 * optimal solution never repeats an axis back-to-back).
 */
export function solve(start: SkewbState): Move[] {
  if (isSolved(start)) return [];
  const goalKey = stateKey(solved());
  const startKey = stateKey(start);

  type Node = { key: string; from: string | null; move: Move | null; lastAxis: MoveAxis | null };
  const fwd = new Map<string, Node>([[startKey, { key: startKey, from: null, move: null, lastAxis: null }]]);
  const bwd = new Map<string, Node>([[goalKey, { key: goalKey, from: null, move: null, lastAxis: null }]]);
  let fFrontier: { state: SkewbState; key: string; lastAxis: MoveAxis | null }[] = [{ state: start, key: startKey, lastAxis: null }];
  let bFrontier: { state: SkewbState; key: string; lastAxis: MoveAxis | null }[] = [{ state: solved(), key: goalKey, lastAxis: null }];

  const reconstruct = (meet: string): Move[] => {
    const head: Move[] = [];
    let n = fwd.get(meet)!;
    while (n.move) { head.push(n.move); n = fwd.get(n.from!)!; }
    head.reverse();
    const tail: Move[] = [];
    let m = bwd.get(meet)!;
    while (m.move) { tail.push(invertMove(m.move)); m = bwd.get(m.from!)!; }
    return [...head, ...tail];
  };

  const expand = (
    frontier: { state: SkewbState; key: string; lastAxis: MoveAxis | null }[],
    seen: Map<string, Node>,
    other: Map<string, Node>,
  ): { next: typeof frontier; meet: string | null } => {
    const next: typeof frontier = [];
    for (const node of frontier) {
      for (const move of ALL_MOVES) {
        if (move.axis === node.lastAxis) continue;
        const ns = applyMove(node.state, move);
        const nk = stateKey(ns);
        if (seen.has(nk)) continue;
        seen.set(nk, { key: nk, from: node.key, move, lastAxis: move.axis });
        if (other.has(nk)) return { next, meet: nk };
        next.push({ state: ns, key: nk, lastAxis: move.axis });
      }
    }
    return { next, meet: null };
  };

  for (let depth = 0; depth < 12; depth++) {
    const a = expand(fFrontier, fwd, bwd);
    if (a.meet) return reconstruct(a.meet);
    fFrontier = a.next;
    const b = expand(bFrontier, bwd, fwd);
    if (b.meet) return reconstruct(b.meet);
    bFrontier = b.next;
    if (fFrontier.length === 0 && bFrontier.length === 0) break;
  }
  throw new Error("skewb3: no solution found");
}

export function verifySolution(start: SkewbState, solution: Move[]): boolean {
  return isSolved(applyMoves(start, solution));
}
