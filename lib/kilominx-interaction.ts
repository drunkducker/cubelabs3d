import * as THREE from "three";
import { faceNormal } from "@/lib/kilominx-engine";

export const KILOMINX_PREVIEW_DISTANCE = 16;
export const KILOMINX_COMMIT_DISTANCE = 34;

export type KilominxPointerSample = {
  clientX: number;
  clientY: number;
};

export type KilominxDragResolution = {
  face: number;
  moveIndex: number;
  direction: 1 | -1;
  distance: number;
  screenDirection: THREE.Vector2;
};

const toVec3 = (value: readonly [number, number, number]) =>
  new THREE.Vector3(value[0], value[1], value[2]);

/**
 * Resolve the engine face currently occupied by a rendered sticker.
 *
 * Sticker metadata describes durable identity, not current location. After turns,
 * interaction must compare the sticker's transformed outward normal with the
 * engine's twelve face normals instead of reading its original face number.
 */
export function resolveKilominxSpatialFace(
  sticker: THREE.Object3D,
  localNormal: THREE.Vector3,
): number {
  sticker.updateWorldMatrix(true, false);
  const worldNormal = localNormal.clone().transformDirection(sticker.matrixWorld).normalize();

  let bestFace = 0;
  let bestDot = -Infinity;
  for (let face = 0; face < 12; face += 1) {
    const score = worldNormal.dot(toVec3(faceNormal(face)).normalize());
    if (score > bestDot) {
      bestDot = score;
      bestFace = face;
    }
  }
  return bestFace;
}

/**
 * Project the positive turn tangent for a face into screen space. The same vector
 * is used by Play and Learn so arrows, touch guides, preview, and committed moves
 * cannot disagree about direction.
 */
export function kilominxScreenTurnDirection(
  face: number,
  hitPoint: THREE.Vector3,
  camera: THREE.Camera,
): THREE.Vector2 {
  const axis = toVec3(faceNormal(face)).normalize();
  const tangent = axis.cross(hitPoint.clone());
  if (tangent.lengthSq() < 1e-8) return new THREE.Vector2(1, 0);

  const origin = hitPoint.clone().project(camera);
  const endpoint = hitPoint.clone().add(tangent.normalize()).project(camera);
  const direction = new THREE.Vector2(endpoint.x - origin.x, -(endpoint.y - origin.y));
  return direction.lengthSq() < 1e-8 ? new THREE.Vector2(1, 0) : direction.normalize();
}

export function resolveKilominxDrag(
  face: number,
  hitPoint: THREE.Vector3,
  start: KilominxPointerSample,
  current: KilominxPointerSample,
  camera: THREE.Camera,
): KilominxDragResolution | null {
  const dx = current.clientX - start.clientX;
  const dy = current.clientY - start.clientY;
  const distance = Math.hypot(dx, dy);
  if (distance < 1e-6) return null;

  const screenDirection = kilominxScreenTurnDirection(face, hitPoint, camera);
  const score = new THREE.Vector2(dx, dy).normalize().dot(screenDirection);
  const direction: 1 | -1 = score >= 0 ? 1 : -1;

  return {
    face,
    moveIndex: face * 2 + (direction === 1 ? 0 : 1),
    direction,
    distance,
    screenDirection,
  };
}

export function shouldCommitKilominxDrag(
  distance: number,
  threshold = KILOMINX_COMMIT_DISTANCE,
): boolean {
  return Number.isFinite(distance) && distance >= threshold;
}
