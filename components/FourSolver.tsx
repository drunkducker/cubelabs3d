"use client";

/**
 * Real arbitrary-state 4x4 solver, same shape as the 3x3 ManualSolver:
 *  - "Scramble Demo": generate a random 4x4, solve it, play it back.
 *  - "Enter My Cube": tap the 96 stickers of your own cube, then solve that.
 *
 * The heavy reduction search runs in a Web Worker (components/solver4.worker),
 * so the UI never freezes; a timeout guards against an unsolvable entry or a
 * pathological state. The returned solution is verified on the real cube inside
 * the worker before it is ever shown.
 */
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { solvedCube, applySequence, toFacelets, randomScramble } from "@/lib/nxn-cube";
import { nxnNet } from "@/lib/nxn-net";

const NxNSolverCube3D = dynamic(() => import("./NxNSolverCube3D"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-[var(--faint)]">Loading 4×4 cube…</div>,
});

const SIZE = 4;
const LETTERS = ["U", "R", "F", "D", "L", "B"] as const;
const COLORS = ["#f7f7f2", "#e53935", "#24c45a", "#ffd21f", "#ff7a18", "#1464e8"];
const NET = nxnNet(SIZE);
const PER_COLOR = SIZE * SIZE; // 16
const SPEEDS = [
  { label: "0.5×", duration: 760 },
  { label: "1×", duration: 460 },
  { label: "1.5×", duration: 300 },
  { label: "2×", duration: 220 },
];
// The reduction search is CPU-intensive: ~20s on a fast machine, longer on
// phones. Give it real headroom so a slow-but-correct solve completes instead
// of showing a false "timed out". A live elapsed counter keeps it from feeling
// frozen. (A faster reduction is tracked separately.)
const SOLVE_TIMEOUT_MS = 120000;

type Mode = "scramble" | "manual";

const solvedFacelets = () => toFacelets(solvedCube(SIZE), SIZE).map((f) => LETTERS.indexOf(f as (typeof LETTERS)[number]));
const faceletsToString = (facelets: number[]) => facelets.map((v) => LETTERS[v]).join("");

function initManualFacelets(): number[] {
  return Array(6 * SIZE * SIZE).fill(-1);
}

function cubeIsSolved(facelets: number[]) {
  const n = SIZE * SIZE;
  for (let f = 0; f < 6; f++) for (let i = 0; i < n; i++) if (facelets[f * n + i] !== f) return false;
  return true;
}

export default function FourSolver() {
  const [mode, setMode] = useState<Mode>("scramble");
  const [cubeFacelets, setCubeFacelets] = useState<number[]>(solvedFacelets);
  const [manualFacelets, setManualFacelets] = useState<number[]>(initManualFacelets);
  const [paintColor, setPaintColor] = useState(0);
  const [scramble, setScramble] = useState("");
  const [solution, setSolution] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState("Preparing 4×4 solver…");
  const [solving, setSolving] = useState(false);
  const [ready, setReady] = useState(false);
  const [time, setTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);

  const worker = useRef<Worker | null>(null);
  const requestId = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const solveStart = useRef(0);
  const elapsedTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoplay = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopElapsed = useCallback(() => {
    if (elapsedTimer.current) { clearInterval(elapsedTimer.current); elapsedTimer.current = null; }
  }, []);
  const onAnimating = useCallback((value: boolean) => setAnimating(value), []);

  const spawnWorker = useCallback(() => {
    const w = new Worker(new URL("./solver4.worker.ts", import.meta.url));
    w.onmessage = (event: MessageEvent) => {
      const data = event.data as { id: number; ok: boolean; solution?: string[]; verified?: boolean; error?: string };
      if (data.id !== requestId.current) return;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      stopElapsed();
      setSolving(false);
      setTime(Math.round(performance.now() - solveStart.current));
      if (data.ok) {
        setSolution(data.solution ?? []);
        setStep(0);
        setPlaying(false);
        setStatus(data.verified ? `Verified solution — ${data.solution?.length ?? 0} moves` : "Solved, but verification failed");
      } else {
        setStatus(data.error === "Reduction did not complete" ? "Couldn't solve this cube — check for a misread sticker" : `Could not solve: ${data.error}`);
      }
    };
    worker.current = w;
  }, [stopElapsed]);

  useEffect(() => {
    spawnWorker();
    setReady(true);
    setStatus("Tap Random Scramble to create a 4×4 to solve.");
    return () => { worker.current?.terminate(); if (timeoutRef.current) clearTimeout(timeoutRef.current); stopElapsed(); };
  }, [spawnWorker, stopElapsed]);

  useEffect(() => {
    if (autoplay.current) clearTimeout(autoplay.current);
    if (!playing || animating || step >= solution.length) {
      if (step >= solution.length) setPlaying(false);
      return;
    }
    autoplay.current = setTimeout(() => setStep((v) => Math.min(solution.length, v + 1)), 90);
    return () => { if (autoplay.current) clearTimeout(autoplay.current); };
  }, [playing, animating, step, solution.length]);

  const displayFacelets = mode === "manual" ? manualFacelets : cubeFacelets;
  const manualComplete = mode === "manual" && !manualFacelets.includes(-1);
  const colorCounts = useMemo(() => COLORS.map((_, i) => manualFacelets.filter((v) => v === i).length), [manualFacelets]);
  const canSolve = ready && !solving && !animating && (mode === "scramble" ? !cubeIsSolved(cubeFacelets) : manualComplete);
  const canShow3D = mode === "scramble" ? true : manualComplete;
  const initialString = faceletsToString(displayFacelets.some((v) => v === -1) ? solvedFacelets() : displayFacelets);

  const resetSolution = () => { setSolution([]); setStep(0); setPlaying(false); setTime(0); };

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    resetSolution();
    setStatus(next === "manual" ? "Tap a color, then tap stickers to match your cube" : "Tap Random Scramble to create a 4×4 to solve.");
  };

  const scrambleCube = () => {
    const seq = randomScramble(SIZE, 40);
    const facelets = toFacelets(applySequence(solvedCube(SIZE), seq, SIZE), SIZE).map((f) => LETTERS.indexOf(f as (typeof LETTERS)[number]));
    setCubeFacelets(facelets);
    setScramble(seq.join(" "));
    resetSolution();
    setStatus("Scrambled 4×4 ready — press Solve.");
  };

  const paintCell = (slot: number) => setManualFacelets((prev) => { const next = [...prev]; next[slot] = paintColor; return next; });
  const clearManual = () => { setManualFacelets(initManualFacelets()); resetSolution(); setStatus("Entry cleared"); };

  const solve = () => {
    if (!worker.current || solving) return;
    const facelets = mode === "manual" ? manualFacelets : cubeFacelets;
    if (facelets.includes(-1)) { setStatus("Fill in every sticker first"); return; }
    if (mode === "manual") {
      const counts = COLORS.map((_, i) => facelets.filter((v) => v === i).length);
      if (counts.some((c) => c !== PER_COLOR)) { setStatus(`Each color must appear ${PER_COLOR} times — check your entry`); return; }
    }
    resetSolution();
    setSolving(true);
    setStatus("Solving 4×4… reducing centers and pairing edges");
    solveStart.current = performance.now();
    setElapsed(0);
    stopElapsed();
    elapsedTimer.current = setInterval(() => setElapsed(Math.round((performance.now() - solveStart.current) / 1000)), 250);
    const id = ++requestId.current;
    timeoutRef.current = setTimeout(() => {
      worker.current?.terminate();
      spawnWorker();
      stopElapsed();
      setSolving(false);
      setStatus("Solve timed out — try again, or re-check a hard-to-read sticker.");
    }, SOLVE_TIMEOUT_MS);
    worker.current.postMessage({ id, facelets });
  };

  const previous = () => { if (!animating) { setPlaying(false); setStep((v) => Math.max(0, v - 1)); } };
  const next = () => { if (!animating) setStep((v) => Math.min(solution.length, v + 1)); };
  const togglePlay = () => { if (!solution.length) return; if (step >= solution.length) setStep(0); setPlaying((v) => !v); };

  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-2">
      <button onClick={() => switchMode("scramble")} className={`rounded-2xl p-3 font-extrabold ${mode === "scramble" ? "cta-purple" : "glass"}`}>SCRAMBLE DEMO</button>
      <button onClick={() => switchMode("manual")} className={`rounded-2xl p-3 font-extrabold ${mode === "manual" ? "cta-purple" : "glass"}`}>ENTER MY CUBE</button>
    </div>

    <section className="glass rounded-[22px] p-4">
      <div className="mb-3 flex items-center justify-between gap-3"><span className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">LIVE 4×4 STATE</span><span className="text-right text-xs font-bold text-[var(--green)]">{status}</span></div>
      <div className="mx-auto grid max-w-[420px] gap-[3px]" style={{ gridTemplateColumns: `repeat(${NET.cols}, minmax(0, 1fr))`, aspectRatio: `${NET.cols} / ${NET.rows}` }}>
        {Array.from({ length: NET.rows * NET.cols }, (_, i) => {
          const row = Math.floor(i / NET.cols), col = i % NET.cols;
          const cell = NET.cellAt(row, col);
          if (!cell) return <div key={i} />;
          const value = displayFacelets[cell.slot];
          const filled = value !== -1;
          const editable = mode === "manual";
          return <div key={i} onClick={editable ? () => paintCell(cell.slot) : undefined}
            className={`rounded-[3px] border ${filled ? "border-white/15" : "border-dashed border-white/20"} ${editable ? "cursor-pointer active:scale-95" : ""}`}
            style={{ background: filled ? COLORS[value] : "rgba(255,255,255,.03)" }} />;
        })}
      </div>
    </section>

    {mode === "scramble" ? <>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={scrambleCube} disabled={solving || animating} className="glass rounded-2xl p-4 font-extrabold disabled:opacity-50">RANDOM SCRAMBLE</button>
        <button onClick={solve} disabled={!canSolve} className="cta-green rounded-2xl p-4 font-extrabold disabled:opacity-50">{solving ? "SOLVING…" : "SOLVE 4×4"}</button>
      </div>
      <section className="glass rounded-[22px] p-4"><p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">SCRAMBLE</p><p className="mt-2 min-h-12 leading-7 text-[var(--text)] break-words">{scramble || "Tap Random Scramble to create a 4×4 to solve."}</p></section>
    </> : <>
      <section className="glass rounded-[22px] p-4">
        <div className="mb-3 flex items-center justify-between gap-3"><span className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">TAP A COLOR, THEN TAP STICKERS</span><Link href="/cube-notation" className="text-xs font-bold text-[var(--green)]">Learn notation →</Link></div>
        <div className="grid grid-cols-6 gap-2">
          {COLORS.map((hex, i) => {
            const count = colorCounts[i];
            const over = count > PER_COLOR;
            return <button key={hex} onClick={() => setPaintColor(i)} className={`flex flex-col items-center gap-1 rounded-xl border p-2 ${paintColor === i ? "border-[var(--green)] bg-[rgba(52,208,88,.14)]" : "border-[var(--border)] bg-black/20"}`}>
              <span className="h-8 w-full rounded-lg border border-white/15" style={{ background: hex }} />
              <span className={`text-[11px] font-extrabold ${over ? "text-[var(--gold)]" : "text-[var(--muted)]"}`}>{count}/{PER_COLOR}</span>
            </button>;
          })}
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={clearManual} disabled={solving || animating} className="glass rounded-2xl p-4 font-extrabold disabled:opacity-50">CLEAR ENTRY</button>
        <button onClick={solve} disabled={!canSolve} className="cta-green rounded-2xl p-4 font-extrabold disabled:opacity-50">{solving ? "SOLVING…" : "SOLVE MY CUBE"}</button>
      </div>
      <section className="glass rounded-[22px] p-4 text-sm leading-6 text-[var(--muted)]"><p><strong className="text-[var(--text)]">Enter all six faces</strong> exactly as they look on your cube — 16 stickers per color. Not sure which face is which? Tap &quot;Learn notation&quot; above.</p></section>
    </>}

    <section className="glass rounded-[22px] p-4">
      <div className="flex items-center justify-between"><p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">VERIFIED SOLUTION</p><span className="text-xs text-[var(--muted)]">{time ? `${time} ms` : ""}</span></div>
      <p className="mt-2 min-h-12 text-lg font-bold leading-8 tracking-wide break-words">{solving ? `Searching for a verified reduction… ${elapsed}s` : solution.join(" ") || "—"}</p>
      {solving && <p className="text-xs text-[var(--faint)]">4×4 solving is intensive and can take up to a minute on a phone — it&apos;s working, not stuck.</p>}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{solution.map((move, i) => <button key={`${move}-${i}`} disabled={animating} onClick={() => { setPlaying(false); setStep(i + 1); }} className={`min-w-11 rounded-xl border p-3 font-extrabold disabled:opacity-50 ${i === step - 1 ? "border-[var(--green)] bg-[rgba(52,208,88,.14)]" : "border-[var(--border)] bg-black/20"}`}>{move}</button>)}</div>
      <div className="mt-4"><div className="mb-2 flex justify-between text-xs font-bold text-[var(--muted)]"><span>Progress</span><span>{step} / {solution.length}</span></div><input aria-label="Solution progress" type="range" min={0} max={Math.max(solution.length, 1)} value={step} disabled={!solution.length || animating} onChange={(e) => { setPlaying(false); setStep(Number(e.target.value)); }} className="w-full accent-[var(--green)] disabled:opacity-40" /></div>
      <div className="mt-4 grid grid-cols-3 gap-2"><button disabled={step === 0 || animating} onClick={previous} className="glass rounded-xl p-3 font-bold disabled:opacity-40">Previous</button><button disabled={!solution.length || animating} onClick={togglePlay} className="cta-green rounded-xl p-3 font-extrabold disabled:opacity-40">{playing ? "Pause" : "Play"}</button><button disabled={step >= solution.length || animating} onClick={next} className="glass rounded-xl p-3 font-bold disabled:opacity-40">Next</button></div>
      <div className="mt-3 grid grid-cols-4 gap-2">{SPEEDS.map((speed, index) => <button key={speed.label} onClick={() => setSpeedIndex(index)} className={`rounded-xl border px-2 py-2 text-sm font-extrabold ${speedIndex === index ? "border-[var(--green)] bg-[rgba(52,208,88,.14)] text-[var(--green)]" : "border-[var(--border)] bg-black/20 text-[var(--muted)]"}`}>{speed.label}</button>)}</div>
    </section>

    <section className="glass overflow-hidden rounded-[22px] p-4">
      <div className="flex items-center justify-between"><div><p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">4×4 SOLUTION PLAYBACK</p><p className="mt-1 text-sm text-[var(--muted)]">{canShow3D ? "Tap moves, scrub progress, or press Play." : "Fill in every sticker to preview your cube in 3D."}</p></div><span className="rounded-full border border-[var(--border)] bg-black/25 px-3 py-1 text-xs font-extrabold text-[var(--green)]">{step} / {solution.length}</span></div>
      <div className="cube-card relative mt-4 h-[340px] overflow-hidden rounded-[22px]"><div className="platform-ring absolute bottom-[58px] left-1/2 z-[1] h-[66px] w-[230px] -translate-x-1/2 rounded-[50%]" />{canShow3D ? <><div className="absolute inset-0 z-[2]"><NxNSolverCube3D size={SIZE} initialFacelets={initialString} solution={solution} step={step} onAnimating={onAnimating} durationMs={SPEEDS[speedIndex].duration} /></div><div className="pointer-events-none absolute bottom-4 left-1/2 z-[3] -translate-x-1/2 whitespace-nowrap text-[13px] font-semibold text-[var(--muted)]">Drag to rotate • verified playback</div></> : <div className="absolute inset-0 z-[2] grid place-items-center px-6 text-center text-sm text-[var(--faint)]">Your cube will appear here once every sticker is filled in.</div>}</div>
    </section>

    <section className="glass rounded-[22px] p-4 text-sm leading-6 text-[var(--muted)]"><b className="text-[var(--text)]">Real 4×4 mode:</b> the cube is reduced (centers solved, edges paired) with 4×4 parity handled, then the reduced 3×3 is solved by the same engine as the 3×3 page and verified move-for-move on the full 4×4. The search runs off the main thread, so the app stays smooth.</section>
  </div>;
}
