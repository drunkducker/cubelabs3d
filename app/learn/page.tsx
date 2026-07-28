import type { Metadata } from "next";
import Link from "next/link";
import AppBottomNav from "@/components/AppBottomNav";
import LearnModelExplorer from "@/components/LearnModelExplorer";
import SiteHeader from "@/components/SiteHeader";
import { BookIcon, ChevronRightIcon, CubeIcon, PlayIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Learn | Cube Lab 3D",
  description: "Learn puzzle notation and algorithms with reusable labeled models for every supported twisty puzzle.",
};

const paths = [
  {
    title: "3×3 Notation Lab",
    level: "Start here",
    body: "A touchable labeled 3×3: name the faces, swipe to turn, then follow a live guided route back to solved.",
    href: "/3x3-notation",
    accent: "#34d058",
  },
  {
    title: "Cube Notation",
    level: "Reference",
    body: "The original explainer cube with sticker labels and a flat face reference for the manual solver.",
    href: "/cube-notation",
    accent: "#2ea6ff",
  },
  {
    title: "Beginner 3x3",
    level: "Guide path",
    body: "A clean path for first solves: white cross, first layer, second layer, last layer, and common mistakes.",
    href: "/solver/3x3",
    accent: "#2ea6ff",
  },
  {
    title: "CFOP Practice",
    level: "Speed path",
    body: "F2L, OLL, PLL, and timed drills will connect here as the learning system grows.",
    href: "/leaderboard/3x3/play",
    accent: "#8b5cf6",
  },
  {
    title: "Big Cubes",
    level: "4x4 / 5x5",
    body: "Centers, edge pairing, parity, and reduction notes tied back to the Cube Labs solvers.",
    href: "/solver/4x4",
    accent: "#f5b942",
  },
];

const methods = ["Beginner", "CFOP", "Roux", "ZZ", "One-Handed", "Blindfold"];

export default function LearnPage() {
  return (
    <main className="app-shell relative min-h-dvh w-full max-w-[900px] overflow-hidden px-5 pb-0 pt-[22px]">
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <div className="relative z-[1]">
        <SiteHeader />
        <Link href="/" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)]">
          <ChevronRightIcon className="h-4 w-4 rotate-180" />
          Back to home
        </Link>

        <section className="relative mt-5 overflow-hidden rounded-[8px] border border-[var(--border)] bg-[#050813] p-5 shadow-[0_18px_46px_rgba(0,0,0,.55)] md:p-7">
          <div className="absolute right-[-24px] top-[-20px] h-36 w-36 rotate-45 rounded-[8px] border border-[rgba(52,208,88,.28)] bg-[rgba(52,208,88,.12)]" />
          <div className="relative z-[1]">
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[var(--green)]">Learn</p>
            <h1 className="mt-2 text-[44px] font-black leading-[.95] text-white md:text-[54px]">
              See the label.
              <br />
              Make the move.
              <br />
              Learn the solve.
            </h1>
            <p className="mt-4 max-w-[650px] text-sm leading-6 text-[var(--muted)]">
              Every twisty-game lesson can now use the same labeled model definition, so face names and algorithm moves stay attached to the correct puzzle regions.
            </p>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-3 gap-2">
          <Metric label="Models" value="5" />
          <Metric label="Labels" value="Shared" />
          <Metric label="Moves" value="Mapped" />
        </section>

        <div className="mt-5">
          <LearnModelExplorer />
        </div>

        <section className="mt-5 grid gap-3 md:grid-cols-2">
          {paths.map((path, index) => (
            <Link key={path.title} href={path.href} className="block transition-transform active:scale-[.99]">
              <article className="h-full rounded-[8px] border border-[var(--border)] bg-[#070b14] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.06)]">
                <div className="flex items-start gap-3">
                  <span
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-[8px] border text-white"
                    style={{ borderColor: `${path.accent}66`, background: `${path.accent}22` }}
                  >
                    {index === 0 ? <BookIcon className="h-6 w-6" /> : index === 2 ? <PlayIcon className="h-5 w-5" /> : <CubeIcon className="h-6 w-6" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: path.accent }}>
                      {path.level}
                    </span>
                    <span className="mt-1 block text-[19px] font-black leading-tight text-white">{path.title}</span>
                    <span className="mt-2 block text-sm leading-6 text-[var(--muted)]">{path.body}</span>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-black text-white">
                      Open path
                      <ChevronRightIcon className="h-4 w-4" />
                    </span>
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </section>

        <section className="mt-5 rounded-[8px] border border-[var(--border)] bg-white/[.035] p-4">
          <h2 className="text-xl font-black text-white">Method Shelf</h2>
          <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-6">
            {methods.map((method) => (
              <span key={method} className="rounded-[8px] border border-white/[.08] bg-black/20 px-2 py-3 text-center text-[11px] font-black text-white">
                {method}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Future lesson content should reference the Learn model engine instead of recreating puzzle labels inside each tutorial.
          </p>
        </section>

        <AppBottomNav active="Learn" />
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-[var(--border)] bg-white/[.035] p-3 text-center">
      <p className="text-[22px] font-black leading-none text-white">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[.12em] text-[var(--muted)]">{label}</p>
    </div>
  );
}
