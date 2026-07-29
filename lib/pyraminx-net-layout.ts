/**
 * True tetrahedron net for the 36-sticker Pyraminx manual solver.
 *
 * Face 0 is the center triangle. Faces 1-3 are reflected across its three
 * edges, preserving shared physical vertices. The nine cells per face are
 * generated in exactly the same order as PYRAMINX_FACELETS, so the SVG never
 * maintains a second sticker mapping.
 */
import { FACE_VERTICES } from "./pyraminx-engine";
import { PYRAMINX_FACELETS, type PyraFaceletTarget } from "./pyraminx-facelets";

export type PyraNetPoint = readonly [number, number];
export type PyraNetCell = {
  index: number;
  face: number;
  local: number;
  target: PyraFaceletTarget;
  triangle: readonly [PyraNetPoint, PyraNetPoint, PyraNetPoint];
};

export type PyraminxNet = {
  width: number;
  height: number;
  cells: readonly PyraNetCell[];
  faceLabels: readonly { face: number; at: PyraNetPoint }[];
};

type Bary = [number, number, number];
type FacePlacement = Map<number, PyraNetPoint>;

const add = (a: PyraNetPoint, b: PyraNetPoint): PyraNetPoint => [a[0] + b[0], a[1] + b[1]];
const subtract = (a: PyraNetPoint, b: PyraNetPoint): PyraNetPoint => [a[0] - b[0], a[1] - b[1]];
const scale = (a: PyraNetPoint, amount: number): PyraNetPoint => [a[0] * amount, a[1] * amount];
const dot = (a: PyraNetPoint, b: PyraNetPoint) => a[0] * b[0] + a[1] * b[1];

function reflectAcrossLine(point: PyraNetPoint, lineA: PyraNetPoint, lineB: PyraNetPoint): PyraNetPoint {
  const direction = subtract(lineB, lineA);
  const relative = subtract(point, lineA);
  const projected = add(lineA, scale(direction, dot(relative, direction) / dot(direction, direction)));
  return subtract(scale(projected, 2), point);
}

function baryPoint(points: readonly PyraNetPoint[], bary: Bary): PyraNetPoint {
  return [
    (points[0][0] * bary[0] + points[1][0] * bary[1] + points[2][0] * bary[2]) / 3,
    (points[0][1] * bary[0] + points[1][1] * bary[1] + points[2][1] * bary[2]) / 3,
  ];
}

function faceTriangles(placement: FacePlacement, face: number) {
  const points = FACE_VERTICES[face].map((vertex) => placement.get(vertex)!);
  const triangles: Array<[PyraNetPoint, PyraNetPoint, PyraNetPoint]> = [];

  for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2 - i; j++) {
    const k = 2 - i - j;
    const corners: Bary[] = [[i + 1, j, k], [i, j + 1, k], [i, j, k + 1]];
    triangles.push(corners.map((corner) => baryPoint(points, corner)) as [PyraNetPoint, PyraNetPoint, PyraNetPoint]);
  }
  for (let i = 0; i <= 1; i++) for (let j = 0; j <= 1 - i; j++) {
    const k = 1 - i - j;
    const corners: Bary[] = [[i + 1, j + 1, k], [i + 1, j, k + 1], [i, j + 1, k + 1]];
    triangles.push([baryPoint(points, corners[0]), baryPoint(points, corners[2]), baryPoint(points, corners[1])]);
  }
  return triangles;
}

let cached: PyraminxNet | null = null;

export function pyraminxNet(): PyraminxNet {
  if (cached) return cached;

  const height = 3 * Math.sqrt(3);
  const v1: PyraNetPoint = [3, 0];
  const v2: PyraNetPoint = [0, height];
  const v3: PyraNetPoint = [6, height];
  const v0Across12 = reflectAcrossLine(v3, v1, v2);
  const v0Across13 = reflectAcrossLine(v2, v1, v3);
  const v0Across23 = reflectAcrossLine(v1, v2, v3);

  const placements: FacePlacement[] = [
    new Map<number, PyraNetPoint>([[1, v1], [2, v2], [3, v3]]),
    new Map<number, PyraNetPoint>([[0, v0Across23], [2, v2], [3, v3]]),
    new Map<number, PyraNetPoint>([[0, v0Across13], [1, v1], [3, v3]]),
    new Map<number, PyraNetPoint>([[0, v0Across12], [1, v1], [2, v2]]),
  ];

  const rawCells: PyraNetCell[] = [];
  for (let face = 0; face < 4; face++) {
    const triangles = faceTriangles(placements[face], face);
    triangles.forEach((triangle, local) => {
      const index = face * 9 + local;
      rawCells.push({ index, face, local, target: PYRAMINX_FACELETS[index], triangle });
    });
  }

  const allPoints = rawCells.flatMap((cell) => [...cell.triangle]);
  const minX = Math.min(...allPoints.map((point) => point[0]));
  const maxX = Math.max(...allPoints.map((point) => point[0]));
  const minY = Math.min(...allPoints.map((point) => point[1]));
  const maxY = Math.max(...allPoints.map((point) => point[1]));
  const margin = 0.45;
  const normalize = (point: PyraNetPoint): PyraNetPoint => [point[0] - minX + margin, point[1] - minY + margin];

  const cells = rawCells.map((cell) => ({ ...cell, triangle: cell.triangle.map(normalize) as [PyraNetPoint, PyraNetPoint, PyraNetPoint] }));
  const faceLabels = placements.map((placement, face) => {
    const points = FACE_VERTICES[face].map((vertex) => placement.get(vertex)!);
    const centroid: PyraNetPoint = [points.reduce((sum, point) => sum + point[0], 0) / 3, points.reduce((sum, point) => sum + point[1], 0) / 3];
    return { face, at: normalize(centroid) };
  });

  cached = { width: maxX - minX + margin * 2, height: maxY - minY + margin * 2, cells, faceLabels };
  return cached;
}
