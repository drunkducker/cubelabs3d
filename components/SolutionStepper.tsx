"use client";

/**
 * Solver showcase displayed directly below the primary homepage CTA.
 *
 * This replaces the old fake move-step demo with a truthful preview of the
 * actual puzzle experiences available from the Solve My Puzzle hub.
 */
import Link from "next/link";
import { useEffect, useState } from "react";

const SOLVERS = [
  {
    size: "3×3",
    name: "Rubik’s Cube",
    status: "READY",
    href: "/solver/3x3",
    description: "Generate a scramble, solve it, and follow every move on the stable 3D cube.",
    grid: 3,
    accent: "var(--green)",
  },
  {
    size: "2×2",
    name: "Pocket Cube",
    status: "READY",
    href: "/solver/2x2",
    description: "A fast corner-only solve with touch-friendly playback and speed controls.",
    grid: 2,
    accent: "var(--purple)",
  },
  {
    size: "4×4",
    name: "Revenge Cube",
    status: "BETA",
    href: "/solver/4x4",
    description: "Explore true 4×4 geometry, wide turns, and guided reverse-scramble playback.",
    grid: 4,
    accent: "var(--gold)",
  },
] as const;

const STICKERS = ["#1464e8", "#e53935", "#24c45a", "#ffd21f", "#ff7a18", "#f7f7f2"];

function PuzzleFace({ size, seed }: { size: number; seed: number }) {
  return (
    <div
      className="grid h-[82px] w-[82px] shrink-0 gap-[3px] rounded-[16px] bg-[#0b0d12] p-[6px] shadow-[0_12px_30px_rgba(0,0,0,.35)]"
      style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      aria-hidden="true"
    >
      {Array.from({ length: size * size }, (_, index) => (
        <span
          key={index}
          className="rounded-[4px] border border-white/10"
          style={{ background: STICKERS[(index * 3 + seed * 2) % STICKERS.length] }}
        />
      ))}
    </div>
  );
}

export default function SolutionStepper() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((value) => (value + 1) % SOLVERS.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, []);

  const solver = SOLVERS[active];

  return (
    <section className="glass mt-[18px] overflow-hidden rounded-[22px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold tracking-[.17em] text-[var(--purple)]">
            PICK YOUR PUZZLE
          </p>
          <h3 className="mt-1 text-[25px] font-extrabold leading-tight">
            One tap from scramble to solution.
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Choose a cube, watch every turn in 3D, and move at your own pace.
          </p>
        </div>
        <span className="whitespace-nowrap rounded-full border border-[var(--border)] bg-black/25 px-3 py-1 text-[11px] font-extrabold text-[var(--green)]">
          2 READY
        </span>
      </div>

      <Link
        href={solver.href}
        className="mt-4 flex items-center gap-4 rounded-[18px] border border-[var(--border)] bg-black/20 p-3 transition-transform active:scale-[.985]"
      >
        <PuzzleFace size={solver.grid} seed={active + 1} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[30px] font-black leading-none">{solver.size}</span>
            <span
              className="rounded-full border px-2 py-1 text-[10px] font-black tracking-[.12em]"
              style={{ color: solver.accent, borderColor: `color-mix(in srgb, ${solver.accent} 45%, transparent)` }}
            >
              {solver.status}
            </span>
          </div>
          <p className="mt-1 font-extrabold">{solver.name}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{solver.description}</p>
          <p className="mt-2 text-xs font-extrabold" style={{ color: solver.accent }}>
            Open solver →
          </p>
        </div>
      </Link>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {SOLVERS.map((item, index) => (
          <button
            key={item.size}
            type="button"
            onClick={() => setActive(index)}
            className={`rounded-xl border px-2 py-3 text-left transition-colors ${
              index === active
                ? "border-[var(--purple)] bg-[rgba(139,92,246,.14)]"
                : "border-[var(--border)] bg-black/15"
            }`}
          >
            <span className="block text-lg font-black">{item.size}</span>
            <span className="mt-0.5 block truncate text-[10px] font-bold text-[var(--muted)]">
              {item.status === "BETA" ? "Preview beta" : "Solve now"}
            </span>
          </button>
        ))}
      </div>

      <Link
        href="/solve"
        className="mt-3 flex items-center justify-center rounded-xl border border-[var(--border)] bg-black/20 p-3 text-sm font-extrabold text-[var(--text)]"
      >
        View all puzzle solvers →
      </Link>
    </section>
  );
}
