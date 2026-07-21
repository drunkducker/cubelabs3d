import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import NotationCube from "@/components/NotationCube";

export const metadata: Metadata = {
  title: "Cube Notation Explainer | Cube Lab 3D",
  description: "A touchable 4x4 explainer cube with labeled stickers for learning cube notation.",
};

export default function CubeNotationPage() {
  return (
    <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[22px]">
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <div className="relative z-[1]">
        <SiteHeader />
        <Link href="/solve" className="mt-4 inline-flex text-sm font-bold text-[var(--muted)]">
          ← Back to solvers
        </Link>

        <section className="mt-5">
          <p className="text-xs font-extrabold tracking-[.18em] text-[var(--green)]">CUBE NOTATION</p>
          <h1 className="mt-2 text-[39px] font-extrabold leading-[1.02] tracking-[-1px]">
            Explainer
            <br />
            <span className="accent-text">Cube</span>
          </h1>
          <p className="mt-3 text-[15px] leading-6 text-[var(--muted)]">
            Spin the labeled cube and tap stickers to identify face positions. The lesson text can plug in below this cube later.
          </p>
        </section>

        <NotationCube />

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
