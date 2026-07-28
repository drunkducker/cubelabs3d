/**
 * Flat-net layout for the Kilominx manual solver.
 *
 * A dodecahedron cannot be unfolded flat in one piece without cutting edges, so
 * the standard Megaminx/Kilominx net is drawn as TWO "flowers": a centre face
 * ringed by its five neighbours (the top half), and the opposite face ringed by
 * ITS five neighbours (the bottom half). Together those 2 + 10 = 12 pentagons
 * are every face exactly once.
 *
 * Every coordinate here is DERIVED from the engine's real geometry, never
 * hand-placed: each petal is genuinely unfolded about the edge it shares with
 * its flower's centre (rotate the petal's 3D corners about that edge until the
 * face is coplanar, then project onto the centre face's plane), so within a
 * flower the pentagons share full edges exactly as they do on the solid. This
 * keeps the layout honest with lib/kilominx-engine.ts — the same file the moves
 * and solver come from — and means the kite<->corner-slot tagging is correct by
 * construction, not by inspection.
 *
 * Each kite carries `face` (which colour reference it belongs to), `kite` (its
 * 0..4 CCW position on that face) and `slot` (the corner position it occupies),
 * so the solver component can paint a colour and, via the engine's
 * faceletsToState, read the whole net back as a cube.
 */
import { VERTICES, FACE_CORNERS, FACE_CORNERS_CCW, faceNormal, rotateAroundAxis, type Vec3 } from "@/lib/kilominx-engine";

export type V2 = [number, number];
export type Kite = { face: number; kite: number; slot: number; quad: [V2, V2, V2, V2] };
export type NetLayout = { kites: Kite[]; faceCenters: { face: number; at: V2 }[]; width: number; height: number };

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Vec3): Vec3 => scale(a, 1 / Math.sqrt(dot(a, a)));

/** The (up to 5) faces sharing an edge — i.e. two corners — with face f. */
function neighbors(f: number): number[] {
  const set = new Set(FACE_CORNERS[f]);
  const out: number[] = [];
  for (let g = 0; g < 12; g++) {
    if (g === f) continue;
    if (FACE_CORNERS[g].filter((c) => set.has(c)).length === 2) out.push(g);
  }
  return out;
}

/** The face whose outward normal is most opposite to f's (the antipodal face). */
function opposite(f: number): number {
  let best = -1, bestDot = Infinity;
  const n = faceNormal(f);
  for (let g = 0; g < 12; g++) {
    if (g === f) continue;
    const d = dot(n, faceNormal(g));
    if (d < bestDot) { bestDot = d; best = g; }
  }
  return best;
}

/** Signed angle to rotate vector a onto vector b about unit `axis`. */
function angleAbout(a: Vec3, b: Vec3, axis: Vec3): number {
  const ap = sub(a, scale(axis, dot(a, axis)));
  const bp = sub(b, scale(axis, dot(b, axis)));
  return Math.atan2(dot(cross(ap, bp), axis), dot(ap, bp));
}

/**
 * Build one flower: `center` face plus its 5 neighbours, unfolded into the
 * centre face's plane and projected to 2D (centre pentagon's centroid at the
 * origin). Returns each face's 5 corner points in FACE_CORNERS_CCW order.
 */
function buildFlower(center: number): { face: number; pts: V2[] }[] {
  const n = faceNormal(center);
  const ring = FACE_CORNERS_CCW[center];
  const centroid3 = scale(ring.reduce<Vec3>((a, c) => add(a, VERTICES[c]), [0, 0, 0]), 1 / 5);
  // Plane basis (u, v) for projecting 3D points that lie in the centre plane.
  let u = sub(VERTICES[ring[0]], centroid3);
  u = norm(sub(u, scale(n, dot(u, n))));
  const v = cross(n, u);
  const to2D = (p: Vec3): V2 => [dot(sub(p, centroid3), u), dot(sub(p, centroid3), v)];

  const faces: { face: number; pts: V2[] }[] = [
    { face: center, pts: FACE_CORNERS_CCW[center].map((c) => to2D(VERTICES[c])) },
  ];

  // Order the petals CCW around the centre so they ring it evenly. Each petal's
  // angular slot is the direction of the edge it shares with the centre.
  const petals = neighbors(center).map((p) => {
    const shared = FACE_CORNERS[p].filter((c) => FACE_CORNERS[center].includes(c));
    const midDir = to2D(scale(add(VERTICES[shared[0]], VERTICES[shared[1]]), 0.5));
    return { p, shared, angle: Math.atan2(midDir[1], midDir[0]) };
  }).sort((a, b) => a.angle - b.angle);

  for (const { p, shared } of petals) {
    const [a3, b3] = [VERTICES[shared[0]], VERTICES[shared[1]]];
    const axis = norm(sub(b3, a3));
    // Rotate the petal about the shared edge until its normal matches the
    // centre's — that is exactly unfolding it flat into the centre plane.
    const theta = angleAbout(faceNormal(p), n, axis);
    const unfold = (c: number) => add(a3, rotateAroundAxis(sub(VERTICES[c], a3), axis, theta));
    faces.push({ face: p, pts: FACE_CORNERS_CCW[p].map((c) => to2D(unfold(c))) });
  }
  return faces;
}

const rotate2D = (p: V2, a: number): V2 => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
const shift2D = (p: V2, dx: number, dy: number): V2 => [p[0] + dx, p[1] + dy];

/** Split a face's 5 CCW corner points into 5 kite quads (corner, edge mid,
 * centre, other edge mid) — the same tiling the 3D scene uses. */
function kitesOf(face: number, pts: V2[]): Kite[] {
  const center: V2 = [pts.reduce((s, p) => s + p[0], 0) / 5, pts.reduce((s, p) => s + p[1], 0) / 5];
  const mid = (i: number, j: number): V2 => [(pts[i][0] + pts[j][0]) / 2, (pts[i][1] + pts[j][1]) / 2];
  return pts.map((p, i) => ({
    face,
    kite: i,
    slot: FACE_CORNERS_CCW[face][i],
    quad: [p, mid(i, (i + 1) % 5), center, mid(i, (i + 4) % 5)] as [V2, V2, V2, V2],
  }));
}

let cached: NetLayout | null = null;

/** The full two-flower net, normalised into a positive [0,width] x [0,height]
 * box with padding. Built once and cached (pure geometry, no per-call work). */
export function kilominxNet(): NetLayout {
  if (cached) return cached;
  const top = buildFlower(0);
  const bottom = buildFlower(opposite(0));

  // Vertical extent of a flower, used to stack the two with a small gap.
  const extent = (flower: { pts: V2[] }[]) => Math.max(...flower.flatMap((f) => f.pts.map((p) => Math.abs(p[1]))));
  const gap = extent(top) + extent(bottom) + 0.35;

  // Top flower sits above the axis; bottom flower is rotated 180° (its centre
  // points down) and dropped below, the conventional two-flower net silhouette.
  const placedTop = top.map((f) => ({ face: f.face, pts: f.pts.map((p) => shift2D(p, 0, gap / 2)) }));
  const placedBottom = bottom.map((f) => ({ face: f.face, pts: f.pts.map((p) => shift2D(rotate2D(p, Math.PI), 0, -gap / 2)) }));

  const faces = [...placedTop, ...placedBottom];
  const kites = faces.flatMap((f) => kitesOf(f.face, f.pts));

  // Normalise to a positive viewBox with padding.
  const all = kites.flatMap((k) => k.quad);
  const pad = 0.25;
  const minX = Math.min(...all.map((p) => p[0])) - pad;
  const minY = Math.min(...all.map((p) => p[1])) - pad;
  const maxX = Math.max(...all.map((p) => p[0])) + pad;
  const maxY = Math.max(...all.map((p) => p[1])) + pad;
  const fix = (p: V2): V2 => [p[0] - minX, p[1] - minY];

  const normKites = kites.map((k) => ({ ...k, quad: k.quad.map(fix) as [V2, V2, V2, V2] }));
  const faceCenters = faces.map((f) => {
    const c: V2 = [f.pts.reduce((s, p) => s + p[0], 0) / 5, f.pts.reduce((s, p) => s + p[1], 0) / 5];
    return { face: f.face, at: fix(c) };
  });

  cached = { kites: normKites, faceCenters, width: maxX - minX, height: maxY - minY };
  return cached;
}
