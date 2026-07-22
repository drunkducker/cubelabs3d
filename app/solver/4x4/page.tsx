import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import FourSolver from "@/components/FourSolver";

export const metadata: Metadata = {
  title: "4×4 Solver | Cube Lab 3D",
  description: "Cube Labs 4×4 solver: reduce centers and edges, handle 4×4 parity, hand off to the 3×3 engine, and verify every move on the full cube.",
};

export default function FourByFourSolverPage() {
  return (
    <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[22px]">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="relative z-[1]">
        <SiteHeader />
        <Link href="/solve" className="mt-4 inline-flex text-sm font-bold text-[var(--muted)]">← Back to solvers</Link>
        <section className="mt-5">
          <p className="text-xs font-extrabold tracking-[.18em] text-[var(--green)]">REAL 4×4 SOLVER</p>
          <h1 className="mt-2 text-[38px] font-extrabold leading-[1.02] tracking-[-1px]">Scramble or enter.<br /><span className="accent-text">Verify every move.</span></h1>
          <p className="mt-3 text-[15px] leading-6 text-[var(--muted)]">Solve any 4×4 by reduction — centers, edge pairing, and parity — then verify the full solution on the real cube. <Link href="/play/4x4" className="font-bold text-[var(--green)]">Just want to play? Open the 4×4 →</Link></p>
        </section>
        <div className="mt-5">
          <FourSolver />
        </div>
      </div>
    </main>
  );
}
