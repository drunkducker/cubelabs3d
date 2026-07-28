import type { Metadata } from "next";
import Link from "next/link";
import KilominxGame from "@/app/KilominxGame";
import KilominxNotationClient from "@/components/KilominxNotationClient";

export const metadata: Metadata = {
  title: "Kilominx Notation Explainer | Cube Lab 3D",
  description: "A touchable Kilominx explainer with the engine-derived twelve-face flat reference.",
};

export default function KilominxNotationPage() {
  return (
    <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-x-hidden px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[12px]">
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <div className="relative z-[1]">
        <div className="flex h-10 items-center justify-between gap-3">
          <Link href="/learn" className="rounded-full border border-[var(--border)] bg-black/30 px-3 py-2 text-xs font-extrabold text-[var(--muted)]">
            ← Learn
          </Link>
          <div className="rounded-full border border-[rgba(52,208,88,.28)] bg-black/30 px-3 py-2 text-xs font-extrabold tracking-[.14em] text-[var(--green)]">
            KILOMINX NOTATION
          </div>
        </div>

        <div className="kilominx-notation-model mt-3 overflow-hidden rounded-[22px]">
          <KilominxGame />
        </div>

        <section className="mt-4">
          <p className="text-xs font-extrabold tracking-[.18em] text-[var(--green)]">KILOMINX NOTATION</p>
          <h1 className="mt-2 text-[34px] font-extrabold leading-[1.02] tracking-[-1px]">
            Explainer <span className="accent-text">Kilominx</span>
          </h1>
          <p className="mt-3 text-[15px] leading-6 text-[var(--muted)]">
            Spin the labeled Kilominx, tap or swipe stickers to identify and test numbered face turns, scramble it, and watch the verified solver play moves back through the same engine.
          </p>
        </section>

        <section className="glass mt-3 rounded-[22px] p-4">
          <p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">FLAT REFERENCE</p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            The same twelve engine faces unfolded into two flowers. Tap a face to identify it, play an algorithm to highlight the grab point, or print the reference.
          </p>
          <div className="mt-3"><KilominxNotationClient /></div>
        </section>

        <section className="glass mt-3 rounded-[18px] p-4 text-sm leading-6 text-[var(--muted)]">
          <p><strong className="text-[var(--text)]">Numbered notation:</strong> faces use 1–12. A prime mark turns the same face in the reverse direction.</p>
        </section>
      </div>
    </main>
  );
}
