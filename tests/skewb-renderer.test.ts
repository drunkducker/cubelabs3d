import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  type PieceTransform,
  type SkewbMove,
  applyMove,
  isPositionInLayer,
  pivotVector,
  solved,
} from "@/lib/skewb-engine";

const TURN_ANGLE = (2 * Math.PI) / 3;

function orientationMatrix(piece: PieceTransform) {
  const [a, b, c, d, e, f, g, h, i] = piece.orientation;
  return new THREE.Matrix4().set(
    a, b, c, 0,
    d, e, f, 0,
    g, h, i, 0,
    0, 0, 0, 1,
  );
}

describe("skewb renderer transforms", () => {
  it("keeps all seven moving pieces exact through the tutorial algorithm", () => {
    const root = new THREE.Group();
    let state = solved();
    const groups = [
      ...state.corners.map((piece, index) => ({ kind: "corner" as const, index, piece })),
      ...state.centers.map((piece, index) => ({ kind: "center" as const, index, piece })),
    ].map(({ kind, index, piece }) => {
      const group = new THREE.Group();
      group.position.set(...piece.position);
      group.userData.kind = kind;
      group.userData.pieceIndex = index;
      root.add(group);
      return group;
    });

    const pieceState = (group: THREE.Group) => {
      const collection = group.userData.kind === "corner" ? state.corners : state.centers;
      return collection[group.userData.pieceIndex as number];
    };
    const sequence: SkewbMove[] = [
      { axis: "R", direction: -1 },
      { axis: "U", layer: -1, direction: 1 },
      { axis: "R", direction: 1 },
      { axis: "U", layer: -1, direction: -1 },
    ];

    for (const move of [...sequence, ...sequence]) {
      const selected = groups.filter(group =>
        isPositionInLayer(
          pieceState(group).position,
          move.axis,
          move.layer ?? 1,
        ),
      );
      expect(selected).toHaveLength(7);

      const pivot = new THREE.Group();
      root.add(pivot);
      selected.forEach(group => pivot.attach(group));
      pivot.quaternion.setFromAxisAngle(
        new THREE.Vector3(...pivotVector(move)).normalize(),
        move.direction * TURN_ANGLE,
      );
      pivot.updateMatrixWorld(true);
      selected.forEach(group => root.attach(group));
      root.remove(pivot);

      state = applyMove(state, move);
      root.updateMatrixWorld(true);
      for (const group of groups) {
        const expected = pieceState(group);
        const actualRotation = new THREE.Matrix4().makeRotationFromQuaternion(group.quaternion);
        const expectedRotation = orientationMatrix(expected);
        group.position.toArray().forEach((value, index) => {
          expect(value).toBeCloseTo(expected.position[index], 6);
        });
        for (let index = 0; index < 16; index++) {
          expect(actualRotation.elements[index]).toBeCloseTo(expectedRotation.elements[index], 6);
        }
      }
    }
  });
});
