import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  KILOMINX_COMMIT_DISTANCE,
  KILOMINX_PREVIEW_DISTANCE,
  kilominxScreenTurnDirection,
  resolveKilominxDrag,
  resolveKilominxSpatialFace,
  shouldCommitKilominxDrag,
} from "@/lib/kilominx-interaction";
import { faceNormal } from "@/lib/kilominx-engine";

const toVec3 = (value: readonly [number, number, number]) =>
  new THREE.Vector3(value[0], value[1], value[2]);

describe("kilominx interaction resolver", () => {
  it("resolves an untransformed sticker normal to its engine face", () => {
    const sticker = new THREE.Object3D();
    const face = 4;
    expect(resolveKilominxSpatialFace(sticker, toVec3(faceNormal(face)))).toBe(face);
  });

  it("resolves the current spatial face after the sticker rotates", () => {
    const sticker = new THREE.Object3D();
    const fromFace = 0;
    const toFace = 7;
    const from = toVec3(faceNormal(fromFace)).normalize();
    const to = toVec3(faceNormal(toFace)).normalize();
    sticker.quaternion.setFromUnitVectors(from, to);
    expect(resolveKilominxSpatialFace(sticker, from)).toBe(toFace);
  });

  it("returns opposite move indices for opposite drags", () => {
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(4.6, 3.6, 6.6);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);

    const face = 0;
    const hitPoint = toVec3(faceNormal(face)).multiplyScalar(2);
    const positive = kilominxScreenTurnDirection(face, hitPoint, camera);
    const start = { clientX: 100, clientY: 100 };

    const forward = resolveKilominxDrag(
      face,
      hitPoint,
      start,
      { clientX: 100 + positive.x * 80, clientY: 100 + positive.y * 80 },
      camera,
    );
    const reverse = resolveKilominxDrag(
      face,
      hitPoint,
      start,
      { clientX: 100 - positive.x * 80, clientY: 100 - positive.y * 80 },
      camera,
    );

    expect(forward?.moveIndex).toBe(face * 2);
    expect(reverse?.moveIndex).toBe(face * 2 + 1);
  });

  it("uses the playable preview and commit distances", () => {
    expect(KILOMINX_PREVIEW_DISTANCE).toBe(16);
    expect(KILOMINX_COMMIT_DISTANCE).toBe(34);
    expect(shouldCommitKilominxDrag(33.9)).toBe(false);
    expect(shouldCommitKilominxDrag(34)).toBe(true);
    expect(shouldCommitKilominxDrag(Number.NaN)).toBe(false);
  });
});
