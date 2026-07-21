"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import SolveOptions from "./SolveOptions";
import SolveButton from "./SolveButton";
import { AutoPlayIcon, PauseIcon, RefreshIcon } from "./icons";

const InteractiveHeroCube = dynamic(() => import("./InteractiveHeroCube"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-[var(--faint)]">Loading touch cube…</div>,
});

const inverse = (move: string) => move.endsWith("2") ? move : move.endsWith("'") ? move[0] : `${move}'`;

/**
 * One shared homepage experience: user touches create the scramble and the panel
 * below plays the exact inverse sequence back on the same physical cube.
 */
export default function HeroCubeExperience() {
  const [touches, setTouches] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [solving, setSolving] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [nonce, setNonce] = useState(0);

  const solveMoves = useMemo(() => [...touches].reverse().map(inverse), [touches]);
  const timeline = useMemo(() => solving ? [...touches, ...solveMoves] : touches, [solving, solveMoves, touches]);
  const solvedSteps = Math.max(0, step - touches.length);

  const touchFace = useCallback((face: string) => {
    if (animating || playing || solving || touches.length >= 10) return;
    setTouches(current => [...current, face]);
    setStep(current => current + 1);
  }, [animating, playing, solving, touches.length]);

  useEffect(() => {
    if (!playing || animating) return;
    if (step >= timeline.length) {
      setPlaying(false);
      return;
    }
    const id = window.setTimeout(() => setStep(current => current + 1), 180);
    return () => window.clearTimeout(id);
  }, [animating, playing, step, timeline.length]);

  const playSolve = () => {
    if (!touches.length) return;
    if (!solving) setSolving(true);
    if (step >= touches.length + solveMoves.length) return;
    setPlaying(true);
  };

  const reset = () => {
    setPlaying(false);
    setSolving(false);
    setAnimating(false);
    setTouches([]);
    setStep(0);
    setNonce(value => value + 1);
  };

  return <>
    <div className="cube-card relative mt-[18px] grid h-[320px] place-items-center overflow-hidden rounded-[22px]">
      <div className="absolute left-3 top-3 z-[4] rounded-[11px] border border-[var(--border)] bg-black/35 px-3 py-1.5 text-xs font-bold text-[var(--muted)]">TOUCH DEMO</div>
      <button type="button" aria-label="Reset touch demo" onClick={reset} className="absolute right-3 top-3 z-[4] grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] bg-black/35"><RefreshIcon className="h-[19px] w-[19px]"/></button>
      <div className="platform-ring absolute bottom-[58px] left-1/2 z-[1] h-[66px] w-[230px] -translate-x-1/2 rounded-[50%]"/>
      <div className="absolute inset-0 z-[2]"><InteractiveHeroCube key={nonce} moves={timeline} step={step} onFaceTap={touchFace} onAnimating={setAnimating}/></div>
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-[4] -translate-x-1/2 whitespace-nowrap text-[13px] font-semibold text-[var(--muted)]">Tap a sticker to turn it • Drag to rotate</div>
    </div>

    <SolveOptions />
    <SolveButton />

    <section className="glass mt-[18px] rounded-[22px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold tracking-[.16em] text-[var(--purple)]">WATCH THE SOLVER WORK</p>
          <h3 className="mt-1 text-[24px] font-extrabold leading-tight">Touch it. Scramble it.<br/>Solve it before your eyes.</h3>
        </div>
        <span className="rounded-full border border-[var(--border)] bg-black/25 px-3 py-1 text-xs font-extrabold text-[var(--green)]">{touches.length}/10 turns</span>
      </div>

      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Tap colored stickers on the cube above. Every move appears here. Then press Play and the same cube reverses your moves step by step.</p>

      <div className="mt-3 flex min-h-14 gap-2 overflow-x-auto rounded-xl border border-[var(--border)] bg-black/20 p-2">
        {touches.length ? touches.map((move, index) => <span key={`${move}-${index}`} className={`grid min-w-10 place-items-center rounded-lg border px-3 py-2 font-extrabold ${index < step ? "border-[var(--green)] bg-[rgba(52,208,88,.14)]" : "border-[var(--border)]"}`}>{move}</span>) : <span className="self-center px-2 text-sm text-[var(--faint)]">Your cube touches will appear here…</span>}
      </div>

      {solving && <div className="mt-3 rounded-xl border border-[rgba(139,92,246,.35)] bg-[rgba(139,92,246,.12)] p-3 text-sm"><span className="font-extrabold text-[var(--purple)]">Solving:</span> {solvedSteps} of {solveMoves.length} reverse moves complete.</div>}

      <div className="mt-3 grid grid-cols-[1.35fr_1fr] gap-3">
        <button type="button" disabled={!touches.length || animating || step >= touches.length + solveMoves.length} onClick={() => playing ? setPlaying(false) : playSolve()} className="cta-purple flex items-center justify-center gap-2 rounded-xl p-4 font-extrabold disabled:opacity-40">{playing ? <PauseIcon className="h-5 w-5"/> : <AutoPlayIcon className="h-5 w-5"/>}{playing ? "Pause" : solving ? "Continue Solve" : "Play Solution"}</button>
        <button type="button" onClick={reset} className="glass rounded-xl p-4 font-bold">New Demo</button>
      </div>

      {touches.length >= 10 && !solving && <p className="mt-3 text-center text-xs font-bold text-[var(--gold)]">That is enough of a scramble—press Play Solution.</p>}
      {solving && step >= timeline.length && <p className="mt-3 text-center text-sm font-extrabold text-[var(--green)]">Solved ✓ That is what Cube Lab does with your real cube.</p>}
    </section>
  </>;
}
