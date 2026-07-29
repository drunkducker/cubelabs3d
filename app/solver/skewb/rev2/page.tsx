import type { Metadata } from "next";
import Link from "next/link";
import SkewbRev2Game from "@/components/SkewbRev2Game";

export const metadata: Metadata = {
  title: "Skewb Rev 2 | Cube Labs 3D",
  description: "A physical, corner-pivot Skewb redesign.",
};

export default function SkewbRev2Page() {
  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/solver/skewb" className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80">
          ← Current Skewb
        </Link>
        <div className="text-center">
          <div className="text-[10px] font-black tracking-[0.32em] text-emerald-300">CUBE LABS</div>
          <h1 className="text-lg font-black tracking-[0.18em]">SKEWB REV 2</h1>
        </div>
        <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-[10px] font-black tracking-widest text-amber-200">
          BRANCH BUILD
        </span>
      </header>

      <section className="mx-auto w-full max-w-5xl px-3 pb-8">
        <SkewbRev2Game />
      </section>
    </main>
  );
}
