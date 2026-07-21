/**
 * Mobile-first 3×3 solver test route.
 *
 * The working prototype is isolated in a static HTML document so the solver's
 * browser lookup tables do not inflate the main application bundle. The iframe
 * keeps the test easy to remove or replace when the solver is integrated into
 * the production Three.js cube experience.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "3×3 Solver Test | Cube Lab 3D",
  description: "Scramble, solve, step through, and verify a 3×3 cube solution on a phone.",
};

export default function SolverThreeByThreePage() {
  return (
    <main style={{ minHeight: "100dvh", background: "#0c0f16" }}>
      <iframe
        title="Cube Lab 3D solver prototype"
        src="/solver-prototype.html"
        style={{ width: "100%", height: "100dvh", border: 0, display: "block" }}
        allow="fullscreen"
      />
    </main>
  );
}
