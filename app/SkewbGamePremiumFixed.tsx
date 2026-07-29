"use client";

import * as THREE from "three";
import SkewbGamePremium from "@/app/SkewbGamePremium";

/**
 * The premium panels are made with ExtrudeGeometry. Three.js extrudes a shape
 * along +Z, which meant our face-local transform pushed every black backing and
 * sticker outward from the cube. During corner turns those caps appeared to
 * explode away from the mechanism.
 *
 * Patch only the tiny, beveled panel geometry signature used by this renderer
 * so its depth runs inward (negative local Z) before it is placed on a face.
 * Other ExtrudeGeometry users keep Three.js's normal behavior.
 */
const prototype = THREE.ExtrudeGeometry.prototype as THREE.ExtrudeGeometry & {
  __cubeLabsSkewbPatched?: boolean;
};

if (!prototype.__cubeLabsSkewbPatched) {
  const applyMatrix4 = THREE.ExtrudeGeometry.prototype.applyMatrix4;

  THREE.ExtrudeGeometry.prototype.applyMatrix4 = function patchedApplyMatrix4(matrix: THREE.Matrix4) {
    const parameters = (this as THREE.ExtrudeGeometry & {
      parameters?: { options?: { depth?: number; bevelSegments?: number; curveSegments?: number } };
    }).parameters;
    const options = parameters?.options;
    const depth = options?.depth ?? 0;
    const isPremiumSkewbPanel =
      depth > 0 &&
      depth <= 0.1 &&
      options?.bevelSegments === 3 &&
      options?.curveSegments === 8;

    if (isPremiumSkewbPanel) {
      applyMatrix4.call(this, new THREE.Matrix4().makeTranslation(0, 0, -depth));
    }

    return applyMatrix4.call(this, matrix);
  };

  prototype.__cubeLabsSkewbPatched = true;
}

export default function SkewbGamePremiumFixed() {
  return <SkewbGamePremium />;
}
