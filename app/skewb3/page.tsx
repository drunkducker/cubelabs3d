import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SkewbRev3 from "@/components/SkewbRev3";

export const metadata: Metadata = {
  title: "Skewb Solver | Cube Lab 3D",
  description: "A standalone Skewb — its own engine, 3D renderer, optimal solver, and design. Scramble or swipe the corners, then solve in ≤11 verified moves.",
};

export default function SkewbSolverPage() {
  return (
    <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[22px]">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="relative z-[1]">
        <SiteHeader />
        <Link href="/solve" className="mt-4 inline-flex text-sm font-bold text-[var(--muted)]">← Back to solvers</Link>
        <section className="mt-5">
          <p className="text-xs font-extrabold tracking-[.18em] text-[var(--blue)]">STANDALONE SKEWB</p>
          <h1 className="mt-2 text-[38px] font-extrabold leading-[1.02] tracking-[-1px]">Swipe to twist.<br /><span className="accent-text">Solve in verified moves.</span></h1>
          <p className="mt-3 text-[15px] leading-6 text-[var(--muted)]">Its own engine, 3D renderer, and optimal solver. Scramble or twist the corners, then let it return a shortest (≤11-move) solution — verified move-for-move before playback.</p>
        </section>
        <div className="mt-5">
          <SkewbRev3 />
        </div>
      </div>
    </main>
  );
}
