import type { Metadata } from "next";
import Link from "next/link";
import SkewbRev2Game from "@/components/SkewbRev2Game";

export const metadata: Metadata = {
  title: "Skewb Rev 2 | Cube Labs 3D",
  description: "A physical, direct-manipulation Skewb rebuilt from the pieces up.",
};

export default function SkewbRev2Page() {
  return (
    <main className="min-h-screen bg-[#070b12] text-white">
      <div className="mx-auto w-full max-w-6xl px-3 pb-6 pt-3 sm:px-5 sm:pb-10 sm:pt-5">
        <div className="mb-3 flex items-center justify-between gap-3 px-1 sm:mb-4">
          <Link
            href="/solver/skewb"
            className="rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-xs font-bold text-white/68 transition hover:bg-white/[0.07] hover:text-white"
          >
            ← Skewb
          </Link>
          <div className="text-right">
            <div className="text-[10px] font-black tracking-[0.32em] text-emerald-300">CUBE LABS 3D</div>
            <h1 className="mt-1 text-base font-black tracking-[0.16em] text-white sm:text-lg">SKEWB REV 2</h1>
          </div>
        </div>

        <div className="skewb-rev2-lighting">
          <SkewbRev2Game />
        </div>

        <p className="mx-auto mt-4 max-w-2xl px-3 text-center text-xs leading-5 text-white/46">
          Touch a visible corner and drag around that corner’s diagonal. Drag empty space to inspect the puzzle from any angle.
        </p>
      </div>

      <style>{`
        .skewb-rev2-lighting canvas {
          filter: brightness(1.22) contrast(0.94) saturate(1.03);
        }
      `}</style>
    </main>
  );
}
