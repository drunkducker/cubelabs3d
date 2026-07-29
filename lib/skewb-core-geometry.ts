import * as THREE from "three";

/**
 * Route-scoped replacement for the oversized rounded-box mechanism used by the
 * premium Skewb renderer. A real Skewb has a compact hidden mechanism; the
 * previous nearly full-size cube pushed through the moving surface pieces.
 *
 * The import alias is intentionally exact and this repository currently uses
 * RoundedBoxGeometry only for the experimental Skewb renderer. The fallback
 * keeps a normal box-like geometry available should another small usage appear.
 */
export class RoundedBoxGeometry extends THREE.BufferGeometry {
  constructor(
    width = 1,
    height = 1,
    depth = 1,
    _segments = 1,
    _radius = 0.1,
  ) {
    super();

    const isSkewbCore = width > 1.8 && height > 1.8 && depth > 1.8;
    const source = isSkewbCore
      ? new THREE.SphereGeometry(0.68, 32, 22)
      : new THREE.BoxGeometry(width, height, depth, 2, 2, 2);

    this.copy(source);
    source.dispose();
    this.type = "RoundedBoxGeometry";
  }
}
