import {
  VERTICES,
  FACE_CORNERS,
  faceNormal,
  rotateAroundAxis,
  type Vec3,
} from "@/lib/kilominx-engine";

export type V2 = [number, number];
export type KilominxNetKite = {
  face: number;
  kite: number;
  slot: number;
  quad: [V2, V2, V2, V2];
};
export type KilominxNetLayout = {
  kites: KilominxNetKite[];
  faceCenters: { face: number; at: V2 }[];
  width: number;
  height: number;
};

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a: Vec3): Vec3 => scale(a, 1 / Math.sqrt(dot(a, a)));

/** Canonical counter-clockwise corner order derived from the engine geometry. */
export const FACE_CORNERS_CCW: number[][] = FACE_CORNERS.map((corners, face) => {
  const n = faceNormal(face);
  const center = scale(corners.reduce<Vec3>((sum, corner) => add(sum, VERTICES[corner]), [0, 0, 0]), 1 / 5);
  let tangent = sub(VERTICES[corners[0]], center);
  tangent = norm(sub(tangent, scale(n, dot(tangent, n))));
  const bitangent = cross(n, tangent);
  return corners.slice().sort((a, b) => {
    const pa = sub(VERTICES[a], center);
    const pb = sub(VERTICES[b], center);
    return Math.atan2(dot(pa, bitangent), dot(pa, tangent)) - Math.atan2(dot(pb, bitangent), dot(pb, tangent));
  });
});

function neighbors(face: number): number[] {
  const corners = new Set(FACE_CORNERS[face]);
  return FACE_CORNERS.flatMap((candidate, other) =>
    other !== face && candidate.filter(corner => corners.has(corner)).length === 2 ? [other] : [],
  );
}

function opposite(face: number): number {
  const normal = faceNormal(face);
  let best = -1;
  let bestDot = Infinity;
  for (let candidate = 0; candidate < FACE_CORNERS.length; candidate++) {
    if (candidate === face) continue;
    const score = dot(normal, faceNormal(candidate));
    if (score < bestDot) {
      best = candidate;
      bestDot = score;
    }
  }
  return best;
}

function angleAbout(a: Vec3, b: Vec3, axis: Vec3): number {
  const ap = sub(a, scale(axis, dot(a, axis)));
  const bp = sub(b, scale(axis, dot(b, axis)));
  return Math.atan2(dot(cross(ap, bp), axis), dot(ap, bp));
}

function buildFlower(centerFace: number): { face: number; points: V2[] }[] {
  const normal = faceNormal(centerFace);
  const ring = FACE_CORNERS_CCW[centerFace];
  const center = scale(ring.reduce<Vec3>((sum, corner) => add(sum, VERTICES[corner]), [0, 0, 0]), 1 / 5);
  let u = sub(VERTICES[ring[0]], center);
  u = norm(sub(u, scale(normal, dot(u, normal))));
  const v = cross(normal, u);
  const project = (point: Vec3): V2 => [dot(sub(point, center), u), dot(sub(point, center), v)];

  const faces = [{ face: centerFace, points: ring.map(corner => project(VERTICES[corner])) }];
  const petals = neighbors(centerFace).map(face => {
    const shared = FACE_CORNERS[face].filter(corner => FACE_CORNERS[centerFace].includes(corner));
    const midpoint = project(scale(add(VERTICES[shared[0]], VERTICES[shared[1]]), 0.5));
    return { face, shared, angle: Math.atan2(midpoint[1], midpoint[0]) };
  }).sort((a, b) => a.angle - b.angle);

  for (const petal of petals) {
    const start = VERTICES[petal.shared[0]];
    const end = VERTICES[petal.shared[1]];
    const axis = norm(sub(end, start));
    const theta = angleAbout(faceNormal(petal.face), normal, axis);
    const unfold = (corner: number) => add(start, rotateAroundAxis(sub(VERTICES[corner], start), axis, theta));
    faces.push({ face: petal.face, points: FACE_CORNERS_CCW[petal.face].map(corner => project(unfold(corner))) });
  }
  return faces;
}

const rotate2D = ([x, y]: V2, angle: number): V2 => [x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle)];
const shift2D = ([x, y]: V2, dx: number, dy: number): V2 => [x + dx, y + dy];

function faceKites(face: number, points: V2[]): KilominxNetKite[] {
  const center: V2 = [points.reduce((sum, point) => sum + point[0], 0) / 5, points.reduce((sum, point) => sum + point[1], 0) / 5];
  const midpoint = (a: number, b: number): V2 => [(points[a][0] + points[b][0]) / 2, (points[a][1] + points[b][1]) / 2];
  return points.map((point, kite) => ({
    face,
    kite,
    slot: FACE_CORNERS_CCW[face][kite],
    quad: [point, midpoint(kite, (kite + 1) % 5), center, midpoint(kite, (kite + 4) % 5)],
  }));
}

let cached: KilominxNetLayout | null = null;

export function kilominxNet(): KilominxNetLayout {
  if (cached) return cached;
  const top = buildFlower(0);
  const bottom = buildFlower(opposite(0));
  const extent = (flower: { points: V2[] }[]) => Math.max(...flower.flatMap(face => face.points.map(point => Math.abs(point[1]))));
  const gap = extent(top) + extent(bottom) + 0.35;
  const faces = [
    ...top.map(face => ({ ...face, points: face.points.map(point => shift2D(point, 0, gap / 2)) })),
    ...bottom.map(face => ({ ...face, points: face.points.map(point => shift2D(rotate2D(point, Math.PI), 0, -gap / 2)) })),
  ];
  const rawKites = faces.flatMap(face => faceKites(face.face, face.points));
  const allPoints = rawKites.flatMap(kite => kite.quad);
  const padding = 0.25;
  const minX = Math.min(...allPoints.map(point => point[0])) - padding;
  const minY = Math.min(...allPoints.map(point => point[1])) - padding;
  const maxX = Math.max(...allPoints.map(point => point[0])) + padding;
  const maxY = Math.max(...allPoints.map(point => point[1])) + padding;
  const normalize = ([x, y]: V2): V2 => [x - minX, y - minY];
  cached = {
    kites: rawKites.map(kite => ({ ...kite, quad: kite.quad.map(normalize) as [V2, V2, V2, V2] })),
    faceCenters: faces.map(face => ({
      face: face.face,
      at: normalize([face.points.reduce((sum, point) => sum + point[0], 0) / 5, face.points.reduce((sum, point) => sum + point[1], 0) / 5]),
    })),
    width: maxX - minX,
    height: maxY - minY,
  };
  return cached;
}
