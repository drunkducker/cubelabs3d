import type { Vec3 } from "@/lib/skewb-engine";

export type FaceBasis = {
  normal: Vec3;
  u: Vec3;
  v: Vec3;
};

export type FacePolygon = {
  kind: "center" | "corner";
  signs: readonly [number, number];
  points: readonly [number, number][];
};

export const SKEWB_FACE_BASES: FaceBasis[] = [
  { normal: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
  { normal: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { normal: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  { normal: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
  { normal: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
  { normal: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
];

/**
 * Real Skewb proportions: a broad diamond center and four corner panels whose
 * diagonal cut lines meet the diamond points. Values intentionally leave a
 * visible plastic border instead of filling the entire square face.
 */
export function createSkewbFacePolygons(
  centerRadius = 0.43,
  outer = 0.96,
): FacePolygon[] {
  return [
    {
      kind: "center",
      signs: [0, 0],
      points: [[0, centerRadius], [centerRadius, 0], [0, -centerRadius], [-centerRadius, 0]],
    },
    {
      kind: "corner",
      signs: [-1, 1],
      points: [[-outer, outer], [0, outer], [-centerRadius, 0], [-outer, 0]],
    },
    {
      kind: "corner",
      signs: [1, 1],
      points: [[0, outer], [outer, outer], [outer, 0], [centerRadius, 0]],
    },
    {
      kind: "corner",
      signs: [1, -1],
      points: [[outer, 0], [outer, -outer], [0, -outer], [centerRadius, 0]],
    },
    {
      kind: "corner",
      signs: [-1, -1],
      points: [[0, -outer], [-outer, -outer], [-outer, 0], [-centerRadius, 0]],
    },
  ];
}

export function anchorForFacePiece(
  basis: FaceBasis,
  polygon: FacePolygon,
): Vec3 {
  if (polygon.kind === "center") return [...basis.normal] as Vec3;
  const [sx, sy] = polygon.signs;
  return [
    Math.sign(basis.normal[0] + basis.u[0] * sx + basis.v[0] * sy),
    Math.sign(basis.normal[1] + basis.u[1] * sx + basis.v[1] * sy),
    Math.sign(basis.normal[2] + basis.u[2] * sx + basis.v[2] * sy),
  ];
}

export function uniqueSkewbPieceAnchors() {
  const centers = new Set<string>();
  const corners = new Set<string>();
  const polygons = createSkewbFacePolygons();
  for (const basis of SKEWB_FACE_BASES) {
    for (const polygon of polygons) {
      const anchor = anchorForFacePiece(basis, polygon).join(",");
      (polygon.kind === "center" ? centers : corners).add(anchor);
    }
  }
  return { centers: Array.from(centers), corners: Array.from(corners) };
}
