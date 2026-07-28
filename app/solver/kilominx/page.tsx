import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import KilominxSolver from "@/components/KilominxSolver";
import UniversalPuzzleActions from "@/components/UniversalPuzzleActions";

export const metadata: Metadata = {
  title: "Kilominx Solver | Cube Lab 3D",
  description: "Enter your own Kilominx on a flat pentagon net, or scramble one — a verified reduction solver returns every move with step-by-step playback.",
};

export default function KilominxSolverPage() {
  return <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[22px]">
    <div className="orb orb-a" /><div className="orb orb-b" />
    <div className="relative z-[1]">
      <SiteHeader />
      <Link href="/solve" className="mt-4 inline-flex text-sm font-bold text-[var(--muted)]">← Back to solvers</Link>
      <section className="mt-5">
        <p className="text-xs font-extrabold tracking-[.18em] text-[var(--purple)]">REAL KILOMINX SOLVER</p>
        <h1 className="mt-2 text-[38px] font-extrabold leading-[1.02] tracking-[-1px]">Scramble. Solve.<br /><span className="accent-text">Verify every move.</span></h1>
        <p className="mt-3 text-[15px] text-[var(--muted)]">Run a random scramble, or tap in your own Kilominx&apos;s colours on the flat net — every solution is checked against the engine.</p>
      </section>
      <div className="mt-5"><KilominxSolver /></div>
      <Suspense fallback={<section className="glass mt-5 min-h-[72px] rounded-[18px]" />}>
        <UniversalPuzzleActions placement="inline" puzzleType="kilominx" />
      </Suspense>
    </div>
  </main>;
}
