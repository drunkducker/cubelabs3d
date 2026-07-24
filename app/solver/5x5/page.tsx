import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import FiveSolver from "@/components/FiveSolver";
import AdSlot from "@/components/ads/AdSlot";
import AffiliateProductGrid from "@/components/ads/AffiliateProductCard";

export const metadata: Metadata = {
  title: "5×5 Solver | Cube Lab 3D",
  description: "Cube Labs 5×5 reduced-state solver with center and edge-bar scoring, manual entry, a 3×3 handoff, and verified 5×5 playback.",
};

export const revalidate = 60;

export default async function FiveByFiveSolverPage() {
  return (
    <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[22px]">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="relative z-[1]">
        <SiteHeader />
        <Link href="/solve" className="mt-4 inline-flex text-sm font-bold text-[var(--muted)]">← Back to solvers</Link>
        <section className="mt-5">
          <p className="text-xs font-extrabold tracking-[.18em] text-[var(--green)]">5×5 REDUCED SOLVER</p>
          <h1 className="mt-2 text-[38px] font-extrabold leading-[1.02] tracking-[-1px]">Reduce. Hand off.<br /><span className="accent-text">Verify every move.</span></h1>
          <p className="mt-3 text-[15px] leading-6 text-[var(--muted)]">Solve reduced 5×5 states with the same 3×3 engine and verify the outer-layer solution on the full cube. Enter your own cube or load a reduced scramble.</p>
        </section>
        <AdSlot placement="solver_top_banner" className="mt-5" />
        <div className="mt-5">
          <FiveSolver />
        </div>
        <AffiliateProductGrid placement="solver_product_carousel" title="Cubes we recommend" className="mt-6" />
      </div>
    </main>
  );
}
