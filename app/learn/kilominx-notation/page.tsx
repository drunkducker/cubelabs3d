import type { Metadata } from "next";
import Link from "next/link";
import KilominxNotationTouchGuard from "@/components/KilominxNotationTouchGuard";
import KilominxNotationClient from "@/components/KilominxNotationClient";

export const metadata: Metadata = {
  title: "Kilominx Human Solve Guide | Cube Lab 3D",
  description: "A touchable labeled Kilominx that guides a human through the next solver-selected twist.",
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
            KILOMINX GUIDE
          </div>
        </div>

        <div className="kilominx-human-guide mt-3">
          <KilominxNotationTouchGuard />
        </div>

        <section className="mt-4">
          <p className="text-xs font-extrabold tracking-[.18em] text-[var(--green)]">HUMAN SOLVE GUIDE</p>
          <h1 className="mt-2 text-[34px] font-extrabold leading-[1.02] tracking-[-1px]">
            Follow the <span className="accent-text">next twist</span>
          </h1>
          <p className="mt-3 text-[15px] leading-6 text-[var(--muted)]">
            Hit Scramble, find the bright target dot, and follow the side thumb indicator. The engine shows how many moves remain and recalculates after every twist, so experimenting never breaks the lesson.
          </p>
        </section>

        <section className="glass mt-3 rounded-[22px] p-4">
          <p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">FLAT SOLVE GUIDE</p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            The matching dot on the flower marks the same physical sticker. It is a next-move instruction, not a general selection marker.
          </p>
          <div className="mt-3"><KilominxNotationClient /></div>
        </section>

        <section className="glass mt-3 rounded-[18px] p-4 text-sm leading-6 text-[var(--muted)]">
          <p><strong className="text-[var(--text)]">How to use it:</strong> touch the glowing sticker, slide your thumb in the displayed direction, and wait for the dot to advance. After three human moves, the remaining-moves count stays pinned at the top of the puzzle box. A different move is accepted and creates a new route from that state.</p>
        </section>
      </div>

      <style>{`
        .kilominx-human-guide section > .grid.grid-cols-4 {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .kilominx-human-guide section > .grid.grid-cols-4 > button:nth-child(2) {
          display: none;
        }
      `}</style>
    </main>
  );
}
