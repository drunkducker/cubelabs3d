"use client";

/**
 * Real mobile solver: scramble with our engine, solve with Kociemba, verify with
 * our engine, and play every verified move on the stable rounded 3D cube.
 */
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cube from "cubejs";
import { applySequence, isSolved, randomScramble, solved, toFacelets, toFaceletString, type CubeState } from "@/lib/cube-engine";

const SolverCube3D = dynamic(() => import("./SolverCube3D"), { ssr: false, loading: () => <div className="grid h-full place-items-center text-sm text-[var(--faint)]">Loading 3D cube…</div> });
const COLORS = ["#f5f1e8", "#e52b3d", "#00a85a", "#ffd500", "#ff7a00", "#1557d5"];
const POS: Record<string, [number, number]> = { U: [0, 3], L: [3, 0], F: [3, 3], R: [3, 6], B: [3, 9], D: [6, 3] };
const INDEX: Record<string, number> = { U: 0, R: 1, F: 2, D: 3, L: 4, B: 5 };
const SPEEDS = [
  { label: "0.5×", duration: 760 },
  { label: "1×", duration: 460 },
  { label: "1.5×", duration: 300 },
  { label: "2×", duration: 220 },
];

function inverseSequence(sequence: string) {
  return sequence.trim().split(/\s+/).filter(Boolean).reverse().map((move) => move.endsWith("2") ? move : move.endsWith("'") ? move[0] : `${move}'`).join(" ");
}

export default function ManualSolver() {
  const [cube, setCube] = useState<CubeState>(() => solved());
  const [scramble, setScramble] = useState("");
  const [solution, setSolution] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Preparing fast solver…");
  const [time, setTime] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [stressResult, setStressResult] = useState("Not run");
  const autoplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      try { Cube.initSolver(); setReady(true); setStatus("Solver ready"); }
      catch { setStatus("Solver failed to initialize"); }
    }, 30);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (autoplayTimer.current) clearTimeout(autoplayTimer.current);
    if (!playing || animating || step >= solution.length) {
      if (step >= solution.length) setPlaying(false);
      return;
    }
    autoplayTimer.current = setTimeout(() => setStep((value) => Math.min(solution.length, value + 1)), 90);
    return () => { if (autoplayTimer.current) clearTimeout(autoplayTimer.current); };
  }, [playing, animating, step, solution.length]);

  const visible = useMemo(() => solution.length ? applySequence(cube, solution.slice(0, step).join(" ")) : cube, [cube, solution, step]);
  const facelets = toFacelets(visible);
  const onAnimating = useCallback((value: boolean) => setAnimating(value), []);

  const scrambleCube = () => {
    const seq = randomScramble(25);
    setPlaying(false);
    setScramble(seq);
    setCube(applySequence(solved(), seq));
    setSolution([]);
    setStep(0);
    setStatus("Scrambled cube ready");
  };

  const solveCube = () => {
    if (!ready) return;
    const start = performance.now();
    try {
      const text = Cube.fromString(toFaceletString(cube)).solve().trim();
      const moves = text ? text.split(/\s+/) : [];
      const verified = isSolved(applySequence(cube, text));
      setPlaying(false);
      setSolution(moves);
      setStep(0);
      setTime(Math.round(performance.now() - start));
      setStatus(verified ? `Verified solution — ${moves.length} moves` : "Solution verification failed");
    } catch {
      setStatus("This cube state could not be solved");
    }
  };

  const runStressTest = () => {
    setStressResult("Running…");
    setTimeout(() => {
      const started = performance.now();
      let passed = 0;
      const trials = 100;
      for (let index = 0; index < trials; index += 1) {
        const sequence = randomScramble(50);
        const returned = applySequence(solved(), `${sequence} ${inverseSequence(sequence)}`);
        if (isSolved(returned)) passed += 1;
      }
      setStressResult(`${passed}/${trials} passed • 10,000 moves • ${Math.round(performance.now() - started)} ms`);
    }, 30);
  };

  const previous = () => { if (!animating) { setPlaying(false); setStep((value) => Math.max(0, value - 1)); } };
  const next = () => { if (!animating) setStep((value) => Math.min(solution.length, value + 1)); };
  const togglePlay = () => {
    if (!solution.length) return;
    if (step >= solution.length) setStep(0);
    setPlaying((value) => !value);
  };

  return <div className="space-y-4">
    <section className="glass rounded-[22px] p-4">
      <div className="mb-3 flex items-center justify-between gap-3"><span className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">LIVE CUBE STATE</span><span className="text-right text-xs font-bold text-[var(--green)]">{status}</span></div>
      <div className="mx-auto grid aspect-[12/9] max-w-[390px] grid-cols-12 gap-1">{Array.from({ length: 108 }, (_, i) => { const row = Math.floor(i / 12), col = i % 12; let color = "transparent"; for (const [face, [r, c]] of Object.entries(POS)) if (row >= r && row < r + 3 && col >= c && col < c + 3) color = COLORS[facelets[INDEX[face] * 9 + (row - r) * 3 + (col - c)]]; return <div key={i} className={color === "transparent" ? "" : "rounded-[5px] border border-white/15"} style={{ background: color }} />; })}</div>
    </section>

    <div className="grid grid-cols-2 gap-3"><button onClick={scrambleCube} disabled={animating} className="glass rounded-2xl p-4 font-extrabold disabled:opacity-50">RANDOM SCRAMBLE</button><button disabled={!ready || animating} onClick={solveCube} className="cta-green rounded-2xl p-4 font-extrabold disabled:opacity-50">SOLVE CUBE</button></div>

    <section className="glass rounded-[22px] p-4"><p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">SCRAMBLE</p><p className="mt-2 min-h-12 leading-7 text-[var(--text)]">{scramble || "Tap Random Scramble to create a test cube."}</p></section>

    <section className="glass rounded-[22px] p-4">
      <div className="flex items-center justify-between"><p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">VERIFIED SOLUTION</p><span className="text-xs text-[var(--muted)]">{time} ms</span></div>
      <p className="mt-2 min-h-12 text-xl font-bold leading-8 tracking-wide">{solution.join(" ") || "—"}</p>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{solution.map((move, i) => <button key={`${move}-${i}`} disabled={animating} onClick={() => { setPlaying(false); setStep(i + 1); }} className={`min-w-11 rounded-xl border p-3 font-extrabold disabled:opacity-50 ${i === step - 1 ? "border-[var(--green)] bg-[rgba(52,208,88,.14)]" : "border-[var(--border)] bg-black/20"}`}>{move}</button>)}</div>

      <div className="mt-4"><div className="mb-2 flex justify-between text-xs font-bold text-[var(--muted)]"><span>Progress</span><span>{step} / {solution.length}</span></div><input aria-label="Solution progress" type="range" min={0} max={Math.max(solution.length, 1)} value={step} disabled={!solution.length || animating} onChange={(event) => { setPlaying(false); setStep(Number(event.target.value)); }} className="w-full accent-[var(--green)] disabled:opacity-40" /></div>

      <div className="mt-4 grid grid-cols-3 gap-2"><button disabled={step === 0 || animating} onClick={previous} className="glass rounded-xl p-3 font-bold disabled:opacity-40">Previous</button><button disabled={!solution.length || animating} onClick={togglePlay} className="cta-green rounded-xl p-3 font-extrabold disabled:opacity-40">{playing ? "Pause" : "Play"}</button><button disabled={step >= solution.length || animating} onClick={next} className="glass rounded-xl p-3 font-bold disabled:opacity-40">Next</button></div>

      <div className="mt-3 grid grid-cols-4 gap-2">{SPEEDS.map((speed, index) => <button key={speed.label} onClick={() => setSpeedIndex(index)} className={`rounded-xl border px-2 py-2 text-sm font-extrabold ${speedIndex === index ? "border-[var(--green)] bg-[rgba(52,208,88,.14)] text-[var(--green)]" : "border-[var(--border)] bg-black/20 text-[var(--muted)]"}`}>{speed.label}</button>)}</div>
    </section>

    <section className="glass overflow-hidden rounded-[22px] p-4">
      <div className="flex items-center justify-between"><div><p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">3D SOLUTION PLAYBACK</p><p className="mt-1 text-sm text-[var(--muted)]">Tap moves, scrub progress, or press Play.</p></div><span className="rounded-full border border-[var(--border)] bg-black/25 px-3 py-1 text-xs font-extrabold text-[var(--green)]">{step} / {solution.length}</span></div>
      <div className="cube-card relative mt-4 h-[320px] overflow-hidden rounded-[22px]"><div className="platform-ring absolute bottom-[58px] left-1/2 z-[1] h-[66px] w-[230px] -translate-x-1/2 rounded-[50%]" /><div className="absolute inset-0 z-[2]"><SolverCube3D scramble={scramble} solution={solution} step={step} onAnimating={onAnimating} durationMs={SPEEDS[speedIndex].duration} /></div><div className="pointer-events-none absolute bottom-4 left-1/2 z-[3] -translate-x-1/2 whitespace-nowrap text-[13px] font-semibold text-[var(--muted)]">Drag to rotate • playback stays flash-free</div></div>
    </section>

    <details className="glass rounded-[22px] p-4"><summary className="cursor-pointer text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">DEVELOPER CHECKS</summary><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Runs 100 random 50-move sequences and immediately reverses each one. The cube engine must return to solved every time.</p><button onClick={runStressTest} className="mt-3 w-full rounded-xl border border-[var(--border)] bg-black/20 p-3 font-extrabold">RUN 10,000-MOVE TEST</button><p className="mt-3 text-center text-sm font-bold text-[var(--green)]">{stressResult}</p></details>
  </div>;
}
