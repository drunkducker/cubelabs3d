import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import AppBottomNav from "@/components/AppBottomNav";
import KilominxNotationNet from "@/components/KilominxNotationNet";

export const metadata: Metadata = {
  title: "Kilominx Notation | Cube Lab 3D",
  description: "A printable, engine-derived twelve-face Kilominx notation map with algorithm grab-point highlighting and playback.",
};

export default function KilominxNotationPage() {
  return (
    <main className="app-shell relative min-h-dvh w-full max-w-[900px] overflow-x-hidden px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-3">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="relative z-[1]">
        <SiteHeader />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href="/learn" className="text-sm font-bold text-[var(--muted)]">← Back to Learn</Link>
          <div className="flex gap-2">
            <Link href="/solver/kilominx" className="rounded-xl border border-[var(--border)] bg-black/25 px-3 py-2 text-xs font-extrabold text-white">Open solver</Link>
            <Link href="/play/kilominx" className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-extrabold text-white">Play Kilominx</Link>
          </div>
        </div>

        <section className="mt-5 print:hidden">
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[var(--green)]">Kilominx notation</p>
          <h1 className="mt-2 text-[38px] font-extrabold leading-[1.02] tracking-[-1px]">Twelve faces.<br /><span className="accent-text">One engine.</span></h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[var(--muted)]">This reference uses the same dodecahedron geometry, face colors, numbered moves, and affected corner slots as the playable Kilominx and verified solver. The highlighted face is the place to grab for the current algorithm move.</p>
        </section>

        <div className="mt-5">
          <KilominxNotationNet />
        </div>

        <section className="mt-4 rounded-[20px] border border-[var(--border)] bg-black/20 p-4 text-sm leading-6 text-[var(--muted)] print:hidden">
          <strong className="text-white">3D teaching model is the next extraction.</strong> The current playable renderer already owns legal turns, scramble, solve, reset, and highlighting. It is being separated into a reusable teaching shell so this page can add the touchable model without bringing save, share, timer, or challenge controls with it.
        </section>
      </div>
      <div className="print:hidden"><AppBottomNav /></div>
    </main>
  );
}
