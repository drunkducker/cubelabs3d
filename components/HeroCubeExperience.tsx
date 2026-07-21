"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import SolveOptions from "./SolveOptions";
import SolveButton from "./SolveButton";
import { AutoPlayIcon, ChevronLeftIcon, PauseIcon, PlayIcon, RefreshIcon } from "./icons";

const InteractiveHeroCube = dynamic(() => import("./InteractiveHeroCube"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-[var(--faint)]">Loading touch cube…</div>,
});

const COLORS = ["#1667e0", "#e6352b", "#24b84a", "#ffd21f", "#ff7a18", "#f4f6f8"];
const inverse = (move: string) => move.endsWith("2") ? move : move.endsWith("'") ? move[0] : `${move}'`;
const miniCells = (seed: number) => Array.from({ length: 9 }, (_, index) => COLORS[(seed * 7 + index * 3) % COLORS.length]);

/** Hero uses the same sticker-swipe interaction as /play/3x3. */
export default function HeroCubeExperience() {
  const [touches, setTouches] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [solving, setSolving] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [nonce, setNonce] = useState(0);

  const solution = useMemo(() => [...touches].reverse().map(inverse), [touches]);
  const timeline = useMemo(() => solving ? [...touches, ...solution] : touches, [solving, solution, touches]);
  const solutionStep = Math.max(0, step - touches.length);
  const nextMove = solution[solutionStep] || (touches.length ? "SOLVED" : "SWIPE CUBE");

  const addMove = useCallback((move: string) => {
    if (animating || playing || solving) return;
    setTouches(current => [...current, move]);
    setStep(current => current + 1);
  }, [animating, playing, solving]);

  useEffect(() => {
    if (!playing || animating) return;
    if (step >= timeline.length) { setPlaying(false); return; }
    const id = window.setTimeout(() => setStep(current => current + 1), 180);
    return () => window.clearTimeout(id);
  }, [animating, playing, step, timeline.length]);

  const beginSolve = () => { if (touches.length && !solving) setSolving(true); };
  const previous = () => { if (!animating && !playing && solving) setStep(current => Math.max(touches.length, current - 1)); };
  const next = () => { if (!touches.length || animating || playing) return; beginSolve(); setStep(current => Math.min(touches.length + solution.length, current + 1)); };
  const togglePlay = () => { if (!touches.length || animating) return; beginSolve(); if (step < touches.length + solution.length) setPlaying(current => !current); };
  const reset = () => { setPlaying(false); setSolving(false); setAnimating(false); setTouches([]); setStep(0); setNonce(value => value + 1); };

  return <>
    <div className="cube-card relative mt-[18px] grid h-[320px] place-items-center overflow-hidden rounded-[22px]">
      <div className="absolute left-3 top-3 z-[4] rounded-[11px] border border-[var(--border)] bg-black/35 px-3 py-1.5 text-xs font-bold text-[var(--muted)]">PLAYABLE 3D CUBE</div>
      <button type="button" aria-label="Reset cube demo" onClick={reset} className="absolute right-3 top-3 z-[4] grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] bg-black/35"><RefreshIcon className="h-[19px] w-[19px]" /></button>
      <div className="platform-ring absolute bottom-[58px] left-1/2 z-[1] h-[66px] w-[230px] -translate-x-1/2 rounded-[50%]" />
      <div className="absolute inset-0 z-[2]"><InteractiveHeroCube key={nonce} moves={timeline} step={step} onMove={addMove} onAnimating={setAnimating} /></div>
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-[4] -translate-x-1/2 whitespace-nowrap text-[13px] font-semibold text-[var(--muted)]">Swipe a sticker to turn • Drag empty space to rotate</div>
    </div>

    <SolveOptions />
    <SolveButton />

    <section className="glass mt-[18px] rounded-[22px] p-4">
      <div className="flex items-start justify-between">
        <div><div className="text-[13px] font-bold text-[var(--purple)]">Next Step</div><div className="mt-0.5 text-[30px] font-extrabold">{nextMove}</div></div>
        <div className="flex items-center gap-[10px]">
          <div className="grid h-[46px] w-[46px] grid-cols-3 grid-rows-3 gap-0.5 rounded-[9px] bg-[#0c0c0f] p-[3px]">{miniCells(solutionStep + touches.length + 1).map((color, index) => <i key={index} className="rounded-[2px]" style={{ background: color }} />)}</div>
          <span className="rounded-full border border-[rgba(139,92,246,.35)] bg-[rgba(139,92,246,.18)] px-[11px] py-1.5 text-xs font-bold">Step {solution.length ? Math.min(solutionStep + 1, solution.length) : 0} of {solution.length}</span>
        </div>
      </div>
      <p className="mt-3 text-sm text-[var(--muted)]">{touches.length ? "The guide is linked to the playable cube above. Press Next or Auto Play to reverse your moves." : "Swipe across a colored sticker like the full 3×3 play cube. Your moves become a live solution here."}</p>
      <div className="mt-[14px] grid grid-cols-[1fr_1.15fr_1fr] gap-[9px]">
        <button type="button" disabled={!solving || solutionStep === 0 || animating || playing} onClick={previous} className="glass flex items-center justify-center gap-[7px] rounded-[13px] p-[13px] disabled:opacity-40"><ChevronLeftIcon className="h-4 w-4" />Prev</button>
        <button type="button" disabled={!touches.length || solutionStep >= solution.length || animating || playing} onClick={next} className="cta-purple flex items-center justify-center gap-[7px] rounded-[13px] p-[13px] disabled:opacity-40"><PlayIcon className="h-4 w-4" />Next</button>
        <button type="button" disabled={!touches.length || solutionStep >= solution.length || animating} onClick={togglePlay} className="glass flex items-center justify-center gap-[7px] rounded-[13px] p-[13px] disabled:opacity-40">{playing ? <PauseIcon className="h-4 w-4" /> : <AutoPlayIcon className="h-4 w-4" />}{playing ? "Pause" : "Auto Play"}</button>
      </div>
      {solving && solutionStep >= solution.length && <p className="mt-3 text-center text-sm font-extrabold text-[var(--green)]">Solved ✓</p>}
    </section>
  </>;
}
