import type { Metadata } from "next";
import Link from "next/link";
import CubeNotationLab from "@/components/CubeNotationLab";
import { FACE_COLORS, FACE_DESCRIPTIONS, FACE_NAMES, NOTATION_REFERENCE, type Face } from "@/lib/cube-notation";

export const metadata: Metadata = {
  title: "3×3 Notation Lab | Cube Lab 3D",
  description:
    "A touchable labeled 3×3 that teaches cube notation: identify faces, swipe to turn, then follow a live guided route back to solved with a synced flat net.",
};

const FACE_ORDER: Face[] = ["U", "D", "L", "R", "F", "B"];

export default function ThreeByThreeNotationPage() {
  return (
    <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-x-hidden px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[12px]">
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <div className="relative z-[1]">
        <div className="flex h-10 items-center justify-between gap-3">
          <Link
            href="/learn"
            className="rounded-full border border-[var(--border)] bg-black/30 px-3 py-2 text-xs font-extrabold text-[var(--muted)]"
          >
            ← Learn
          </Link>
          <div className="rounded-full border border-[rgba(52,208,88,.28)] bg-black/30 px-3 py-2 text-xs font-extrabold tracking-[.14em] text-[var(--green)]">
            3×3 NOTATION
          </div>
        </div>

        <section className="mt-3">
          <p className="text-xs font-extrabold tracking-[.18em] text-[var(--green)]">CUBE NOTATION</p>
          <h1 className="mt-2 text-[34px] font-extrabold leading-[1.02] tracking-[-1px]">
            Read it. <span className="accent-text">Turn it.</span> Solve it.
          </h1>
          <p className="mt-3 text-[15px] leading-6 text-[var(--muted)]">
            Tap a sticker to name its face, then hit Scramble. The guide glows the exact sticker to touch and the exact
            direction to flick — the real play-engine gesture — and grades each thumb move so you can tune it. The flat
            net below mirrors the same puzzle in real time.
          </p>
        </section>

        <div className="mt-4">
          <CubeNotationLab />
        </div>

        <section className="glass mt-3 rounded-[22px] p-4">
          <p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">THE SIX FACES</p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Every algorithm is built from six single-letter face turns. Each letter names the layer you turn; a plain
            letter is always 90° clockwise seen from that side.
          </p>
          <ul className="mt-3 space-y-2">
            {FACE_ORDER.map((face) => (
              <li key={face} className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                <span
                  className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-base font-black"
                  style={{ background: FACE_COLORS[face], color: face === "U" || face === "D" ? "#111318" : "#fff" }}
                >
                  {face}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black text-[var(--text)]">
                    {face} — {FACE_NAMES[face]}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-5 text-[var(--muted)]">{FACE_DESCRIPTIONS[face]}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="glass mt-3 rounded-[22px] p-4">
          <p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">MODIFIERS & BEYOND</p>
          <ul className="mt-3 space-y-2">
            {NOTATION_REFERENCE.map((item) => (
              <li key={item.symbol} className="flex items-start gap-3">
                <span className="mt-0.5 min-w-[54px] rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-center font-mono text-sm font-black text-[var(--green)]">
                  {item.symbol}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-[var(--text)]">{item.name}</span>
                  <span className="mt-0.5 block text-[13px] leading-5 text-[var(--muted)]">{item.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="glass mt-3 rounded-[18px] p-4 text-sm leading-6 text-[var(--muted)]">
          <p>
            <strong className="text-[var(--text)]">How the flick guide works:</strong> turning a face isn&apos;t a swipe on
            that face — you flick a sticker on the layer&apos;s neighbour. The guide computes the exact anchor sticker and
            screen direction the play engine reads for the next move, then loops a glowing arrow there. Your live drag is
            overlaid and graded on angle and length, so it doubles as a thumb-move trainer for play. A scramble builds one
            guaranteed route by reversing itself, so the count never loops; explore a different move and the guide adds the
            shortest recovery and keeps going.
          </p>
        </section>
      </div>
    </main>
  );
}
