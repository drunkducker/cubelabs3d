/**
 * Dedicated route for the playable 3×3 cube.
 *
 * The route stays intentionally thin: the stateful Three.js engine lives in
 * `app/CubeGame.tsx`, while this file gives that engine a stable, shareable URL.
 * Future puzzle sizes can follow the same `/play/<puzzle>` routing convention.
 */

import type { Metadata } from "next";
import CubeGame from "../../CubeGame";

/** Search and browser metadata specific to the playable game screen. */
export const metadata: Metadata = {
  title: "Play the 3×3 Cube | Cube Lab 3D",
  description: "Turn, scramble, undo, and solve a fully interactive 3D puzzle cube in your browser.",
};

/**
 * Renders the existing, validated cube engine at `/play/3x3`.
 *
 * @returns The client-side Three.js game interface.
 */
export default function PlayThreeByThreePage() {
  return <CubeGame />;
}
