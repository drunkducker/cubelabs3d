import type { Metadata } from "next";
import Link from "next/link";
import NotationCube from "@/components/NotationCube";

export const metadata: Metadata = {
  title: "Cube Notation Explainer | Cube Lab 3D",
  description: "A touchable 4x4 explainer cube with labeled stickers for learning cube notation.",
};

export default function CubeNotationPage() {
  return (
    <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-x-hidden px-4 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[14px]">
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <div className="relative z-[1]">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="rounded-full border border-[var(--border)] bg-black/30 px-3 py-2 text-xs font-extrabold text-[var(--muted)]">
            ← Home
          </Link>
          <div className="rounded-full border border-[rgba(52,208,88,.28)] bg-black/30 px-3 py-2 text-xs font-extrabold tracking-[.14em] text-[var(--green)]">
            CUBE NOTATION
          </div>
        </div>

        <NotationCube />

        <section className="mt-4">
          <p className="text-xs font-extrabold tracking-[.18em] text-[var(--green)]">CUBE NOTATION</p>
          <h1 className="mt-2 text-[34px] font-extrabold leading-[1.02] tracking-[-1px]">
            Explainer <span className="accent-text">Cube</span>
          </h1>
          <p className="mt-3 text-[15px] leading-6 text-[var(--muted)]">
            Spin the labeled cube, tap stickers to identify face positions, and swipe stickers to test layer notation.
          </p>
        </section>

        <section className="glass mt-3 rounded-[18px] p-4 text-sm leading-6 text-[var(--muted)]">
          <p>
            <strong className="text-[var(--text)]">Placeholder:</strong> this page is ready for notation explanations, move examples,
            and facelet reference text.
          </p>
        </section>
      </div>
    </main>
  );
}
