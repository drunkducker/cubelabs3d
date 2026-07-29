"use client";

import SkewbGame from "@/app/SkewbGame";

/**
 * Build-safe fallback for the isolated solid-piece experiment.
 *
 * The first convex-geometry draft failed strict production type checking.
 * Keep the verified native Skewb renderer available on the test route while
 * the typed solid-piece body generator is rebuilt. The approved normal route
 * remains unchanged.
 */
export default function SkewbSolidGame() {
  return <SkewbGame />;
}
