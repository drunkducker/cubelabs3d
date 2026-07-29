import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import PyraminxSolver from "@/components/PyraminxSolver";
import UniversalPuzzleActions from "@/components/UniversalPuzzleActions";

export const metadata: Metadata = {
  title: "Pyraminx Solver | Cube Lab 3D",
  description: "Enter all 36 Pyraminx stickers or generate a scramble, then receive a verified exact solution with step-by-step flat-net playback.",
};

export default function PyraminxSolverPage() {
  return <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[22px]">
    <div className="orb orb-a" /><div className="orb orb-b" />
    <div className="relative z-[1]">
      <SiteHeader />
      <Link href="/solve" className="mt-4 inline-flex text-sm font-bold text-[var(--muted)]">← Back to solvers</Link>
      <section className="mt-5">
        <p className="text-xs font-extrabold tracking-[.18em] text-[var(--gold)]">REAL PYRAMINX SOLVER</p>
        <h1 className="mt-2 text-[38px] font-extrabold leading-[1.02] tracking-[-1px]">Enter. Solve.<br /><span className="accent-text">Verify every turn.</span></h1>
        <p className="mt-3 text-[15px] leading-6 text-[var(--muted)]">Match your physical Pyraminx on the four-face net, or generate a legal scramble. The exact edge solver and tip cleanup are verified before any solution is shown.</p>
      </section>
      <div className="mt-5"><PyraminxSolver /></div>
      <Suspense fallback={<section className="glass mt-5 min-h-[72px] rounded-[18px]" />}>
        <UniversalPuzzleActions placement="inline" puzzleType="pyraminx" />
      </Suspense>
    </div>
  </main>;
}
