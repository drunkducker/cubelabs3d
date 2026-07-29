import { describe, expect, it } from "vitest";
import {
  SKEWB_FACE_BASES,
  anchorForFacePiece,
  createSkewbFacePolygons,
  uniqueSkewbPieceAnchors,
} from "@/lib/skewb-visual-geometry";

describe("Skewb visual geometry", () => {
  it("builds one diamond center and four corner panels per face", () => {
    const polygons = createSkewbFacePolygons();
    expect(polygons).toHaveLength(5);
    expect(polygons.filter(piece => piece.kind === "center")).toHaveLength(1);
    expect(polygons.filter(piece => piece.kind === "corner")).toHaveLength(4);
  });

  it("maps the six faces onto six center bodies and eight corner bodies", () => {
    const anchors = uniqueSkewbPieceAnchors();
    expect(anchors.centers).toHaveLength(6);
    expect(anchors.corners).toHaveLength(8);
  });

  it("keeps every generated anchor on a legal Skewb body slot", () => {
    const polygons = createSkewbFacePolygons();
    for (const basis of SKEWB_FACE_BASES) {
      for (const polygon of polygons) {
        const anchor = anchorForFacePiece(basis, polygon);
        const nonZero = anchor.filter(value => value !== 0).length;
        expect(nonZero).toBe(polygon.kind === "center" ? 1 : 3);
        expect(anchor.every(value => [-1, 0, 1].includes(value))).toBe(true);
      }
    }
  });

  it("uses broad center diamonds and leaves a physical seam", () => {
    const [center, corner] = createSkewbFacePolygons();
    expect(center.points[0][1]).toBeGreaterThan(0.4);
    expect(corner.points[0][0]).toBeGreaterThan(-1);
  });
});
