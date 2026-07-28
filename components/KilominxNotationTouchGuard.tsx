"use client";

import { useLayoutEffect } from "react";
import * as THREE from "three";
import KilominxNotationModel from "@/components/KilominxNotationModel";

/**
 * The Learn glow is rendered with additive sprites parented to the selected
 * sticker. Three.js includes descendants when the model raycasts recursively,
 * so the oversized visual halo can otherwise become the first touch hit.
 *
 * Keep the glow visible while making additive, depth-write-disabled sprites
 * presentation-only for the lifetime of this page. The original Three.js
 * raycast behavior is restored when the page unmounts.
 */
export default function KilominxNotationTouchGuard() {
  useLayoutEffect(() => {
    const originalRaycast = THREE.Sprite.prototype.raycast;

    const guardedRaycast = function (
      this: THREE.Sprite,
      raycaster: THREE.Raycaster,
      intersects: THREE.Intersection[],
    ) {
      const material = this.material;
      const isPresentationGlow =
        material instanceof THREE.SpriteMaterial &&
        material.blending === THREE.AdditiveBlending &&
        material.depthWrite === false;

      if (isPresentationGlow) return;
      originalRaycast.call(this, raycaster, intersects);
    };

    THREE.Sprite.prototype.raycast = guardedRaycast;

    return () => {
      if (THREE.Sprite.prototype.raycast === guardedRaycast) {
        THREE.Sprite.prototype.raycast = originalRaycast;
      }
    };
  }, []);

  return <KilominxNotationModel />;
}
