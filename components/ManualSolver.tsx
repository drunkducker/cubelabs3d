"use client";

/**
 * Real mobile solver, two ways to load a cube:
 *  - "Scramble Demo": our engine generates a scramble, Kociemba solves it,
 *    verified against our engine, played back on the 3D cube.
 *  - "Enter My Cube": the player taps colors onto the flat net to match
 *    their own physical cube, then the same Kociemba solve + playback runs
 *    against whatever they entered.
 *
 * Both modes feed the same solution/step/playback state below — only how
 * the *starting* cube is produced differs. Manual entry never builds one of
 * our own permutation-based CubeState values (lib/cube-engine.ts's cp/co/
 * ep/eo) at all: a raw 54-color facelet string is sufficient input for both
 * the solver (Cube.fromString, lib/cube3x3-solver.ts) and SolverCube3D's
 * playback (it turns physical cubie matrices directly and never calls back
 * into our engine), so there's no facelet->CubeState reconstruction to write
 * or maintain.
 */
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cube, { type Cube3x3 } from "@/lib/cube3x3-solver";
import { applySequence, isSolved, randomScramble, solved, toFacelets, toFaceletString, type CubeState } from "@/lib/cube-engine";
import { NET_COLS, NET_FACES, NET_ROWS, netCellAt } from "@/lib/cube-net-layout";

const SolverCube3D = dynamic(() => import("./SolverCube3D"), { ssr: false, loading: () => <div className="grid h-full place-items-center text-sm text-[var(--faint)]">Loading 3D cube…</div> });
const COLORS = ["#f5f1e8", "#e52b3d", "#00a85a", "#ffd500", "#ff7a00", "#1557d5"];
const SPEEDS = [
  { label: "0.5×", duration: 760 },
  { label: "1×", duration: 460 },
  { label: "1.5×", duration: 300 },
  { label: "2×", duration: 220 },
];

type Mode = "scramble" | "manual";

function inverseSequence(sequence: string) {
  return sequence.trim().split(/\s+/).filter(Boolean).reverse().map((move) => move.endsWith("2") ? move : move.endsWith("'") ? move[0] : `${move}'`).join(" ");
}

// Parity of a permutation array via cycle decomposition: sum of (cycle
// length - 1) over all cycles, mod 2. Two swapped elements = one 2-cycle =
// odd; three elements rotated = one 3-cycle = even; etc.
function permutationParity(perm: number[]) {
  const visited = Array(perm.length).fill(false);
  let parity = 0;
  for (let i = 0; i < perm.length; i++) {
    if (visited[i]) continue;
    let length = 0, j = i;
    while (!visited[j]) { visited[j] = true; j = perm[j]; length++; }
    parity += length - 1;
  }
  return parity % 2;
}

/**
 * Cube.fromString() reads sticker colors positionally with no validity check
 * at all — it just matches each corner/edge's observed colors against known
 * piece color-triples/pairs. A single misread sticker (an easy, likely
 * mistake when a person is typing in their own physical cube) produces an
 * impossible permutation that still parses "successfully" into defined
 * cp/co/ep/eo arrays. Calling solve() on that isn't a fast failure — the
 * two-phase search has no way to recognize "this coset is empty," so it
 * explores every depth up to its bound (22) synchronously on the main
 * thread, which in practice means the page freezes for a long time
 * (confirmed: 15+ seconds and counting on a single two-sticker swap) rather
 * than erroring out.
 *
 * The three checks below are the standard, complete solvability conditions
 * for a Rubik's cube (not a heuristic — any state failing one of these is
 * mathematically unreachable from solved, and any state passing all three
 * is guaranteed reachable): corner and edge permutations must each be a
 * genuine bijection over their 8/12 pieces, total corner twist must be
 * divisible by 3, total edge flip must be divisible by 2, and the two
 * permutations' parities must match. Checking this is O(20) array work —
 * always fast — so it runs before solve() ever gets a chance to hang.
 */
function isLegalCubeState(cube: Cube3x3) {
  const isPermutation = (perm: number[], size: number) =>
    perm.length === size && new Set(perm).size === size && perm.every((v) => Number.isInteger(v) && v >= 0 && v < size);
  if (!isPermutation(cube.cp, 8) || !isPermutation(cube.ep, 12)) return false;
  if (!cube.co.every((v) => Number.isInteger(v) && v >= 0 && v <= 2) || cube.co.reduce((a, b) => a + b, 0) % 3 !== 0) return false;
  if (!cube.eo.every((v) => Number.isInteger(v) && v >= 0 && v <= 1) || cube.eo.reduce((a, b) => a + b, 0) % 2 !== 0) return false;
  return permutationParity(cube.cp) === permutationParity(cube.ep);
}

// 54 slots, same U/R/F/D/L/B-block-of-9 ordering as lib/cube-engine.ts's
// toFacelets(). -1 means "not entered yet"; centers are pre-filled and
// never editable, since a real cube's center pieces never move — they're
// what tells you which face is which in the first place.
function initManualFacelets(): number[] {
  const arr = Array(54).fill(-1);
  NET_FACES.forEach((face, faceSlot) => { arr[faceSlot * 9 + 4] = faceSlot; });
  return arr;
}

export default function ManualSolver() {
  const [mode, setMode] = useState<Mode>("scramble");
  const [cube, setCube] = useState<CubeState>(() => solved());
  const [scramble, setScramble] = useState("");
  const [manualFacelets, setManualFacelets] = useState<number[]>(initManualFacelets);
  const [paintColor, setPaintColor] = useState(0);
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
  const onAnimating = useCallback((value: boolean) => setAnimating(value), []);

  const manualComplete = !manualFacelets.includes(-1);
  const manualFaceletString = manualComplete ? manualFacelets.map((v) => NET_FACES[v]).join("") : "";
  const colorCounts = useMemo(() => COLORS.map((_, i) => manualFacelets.filter((v) => v === i).length), [manualFacelets]);

  // The flat net always shows exactly what was typed/entered for that mode.
  // In scramble mode it also tracks solution playback (matching the 3D view)
  // since that's a cheap side effect of already having a permutation-based
  // CubeState there; manual entry has no such state to advance, so its net
  // stays a static "what you entered" view — the 3D panel below is what
  // shows solve progress for that mode.
  const displayFacelets = mode === "manual" ? manualFacelets : toFacelets(visible);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setPlaying(false);
    setSolution([]);
    setStep(0);
    setStatus(next === "manual" ? "Tap a color, then tap a sticker to match your cube" : "Tap Random Scramble to create a test cube.");
  };

  const paintCell = (slot: number) => {
    setManualFacelets((prev) => { const next = [...prev]; next[slot] = paintColor; return next; });
  };

  const clearManualEntry = () => {
    setManualFacelets(initManualFacelets());
    setPlaying(false);
    setSolution([]);
    setStep(0);
    setStatus("Entry cleared");
  };

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
    // Short-circuit before ever building a facelet string or touching the
    // solver (same guard app/PyraminxGame.tsx uses before calling its own
    // solver) — skips the work entirely and shows a clearer status than a
    // generic "Verified solution — 0 moves".
    if (isSolved(cube)) { setPlaying(false); setSolution([]); setStep(0); setTime(0); setStatus("Already solved"); return; }
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

  const solveManualCube = () => {
    if (!ready || !manualComplete) return;
    const parsed = Cube.fromString(manualFaceletString);
    // Must run before solve() ever gets called — see isLegalCubeState's
    // comment above for why an illegal state isn't just "wrong," it's a
    // frozen page.
    if (!isLegalCubeState(parsed)) {
      setPlaying(false); setSolution([]); setStep(0); setTime(0);
      setStatus("These colors don't form a real cube — check for a misread or swapped sticker");
      return;
    }
    // Same already-solved short-circuit as solveCube() above — a player
    // legitimately might enter a cube that's already solved (testing the
    // tool, or it really is solved).
    if (parsed.isSolved()) { setPlaying(false); setSolution([]); setStep(0); setTime(0); setStatus("Already solved"); return; }
    const start = performance.now();
    try {
      const text = parsed.solve().trim();
      const moves = text ? text.split(/\s+/) : [];
      const verified = parsed.move(text).isSolved();
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

  const canShow3D = mode === "scramble" || manualComplete;
  const initialFaceletsForPlayback = mode === "scramble" ? toFaceletString(applySequence(solved(), scramble)) : manualFaceletString;

  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-2">
      <button onClick={() => switchMode("scramble")} className={`rounded-2xl p-3 font-extrabold ${mode === "scramble" ? "cta-purple" : "glass"}`}>SCRAMBLE DEMO</button>
      <button onClick={() => switchMode("manual")} className={`rounded-2xl p-3 font-extrabold ${mode === "manual" ? "cta-purple" : "glass"}`}>ENTER MY CUBE</button>
    </div>

    <section className="glass rounded-[22px] p-4">
      <div className="mb-3 flex items-center justify-between gap-3"><span className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">LIVE CUBE STATE</span><span className="text-right text-xs font-bold text-[var(--green)]">{status}</span></div>
      <div className="mx-auto grid aspect-[12/9] max-w-[390px] grid-cols-12 gap-1">
        {Array.from({ length: NET_ROWS * NET_COLS }, (_, i) => {
          const row = Math.floor(i / NET_COLS), col = i % NET_COLS;
          const cell = netCellAt(row, col);
          if (!cell) return <div key={i} />;
          const value = displayFacelets[cell.slot];
          const filled = value !== -1;
          const editable = mode === "manual" && !cell.isCenter;
          return <div
            key={i}
            onClick={editable ? () => paintCell(cell.slot) : undefined}
            className={`rounded-[5px] border ${filled ? "border-white/15" : "border-dashed border-white/20"} ${editable ? "cursor-pointer active:scale-95" : ""}`}
            style={{ background: filled ? COLORS[value] : "rgba(255,255,255,.03)" }}
          />;
        })}
      </div>
    </section>

    {mode === "scramble" ? <>
      <div className="grid grid-cols-2 gap-3"><button onClick={scrambleCube} disabled={animating} className="glass rounded-2xl p-4 font-extrabold disabled:opacity-50">RANDOM SCRAMBLE</button><button disabled={!ready || animating} onClick={solveCube} className="cta-green rounded-2xl p-4 font-extrabold disabled:opacity-50">SOLVE CUBE</button></div>
      <section className="glass rounded-[22px] p-4"><p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">SCRAMBLE</p><p className="mt-2 min-h-12 leading-7 text-[var(--text)]">{scramble || "Tap Random Scramble to create a test cube."}</p></section>
    </> : <>
      <section className="glass rounded-[22px] p-4">
        <div className="mb-3 flex items-center justify-between gap-3"><span className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">TAP A COLOR, THEN TAP A STICKER</span><Link href="/cube-notation" className="text-xs font-bold text-[var(--green)]">Learn notation →</Link></div>
        <div className="grid grid-cols-6 gap-2">
          {COLORS.map((hex, i) => {
            const count = colorCounts[i];
            const over = count > 9;
            return <button key={hex} onClick={() => setPaintColor(i)} className={`flex flex-col items-center gap-1 rounded-xl border p-2 ${paintColor === i ? "border-[var(--green)] bg-[rgba(52,208,88,.14)]" : "border-[var(--border)] bg-black/20"}`}>
              <span className="h-8 w-full rounded-lg border border-white/15" style={{ background: hex }} />
              <span className={`text-[11px] font-extrabold ${over ? "text-[var(--gold)]" : "text-[var(--muted)]"}`}>{count}/9</span>
            </button>;
          })}
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3"><button onClick={clearManualEntry} disabled={animating} className="glass rounded-2xl p-4 font-extrabold disabled:opacity-50">CLEAR ENTRY</button><button disabled={!ready || animating || !manualComplete} onClick={solveManualCube} className="cta-green rounded-2xl p-4 font-extrabold disabled:opacity-50">SOLVE MY CUBE</button></div>
      <section className="glass rounded-[22px] p-4 text-sm leading-6 text-[var(--muted)]">
        <p><strong className="text-[var(--text)]">Center stickers are fixed</strong> — they never move on a real cube, so they define which face is which.</p>
        <p><strong className="text-[var(--text)]">Not sure which face is which?</strong> Tap &quot;Learn notation&quot; above for a labeled reference.</p>
      </section>
    </>}

    <section className="glass rounded-[22px] p-4">
      <div className="flex items-center justify-between"><p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">VERIFIED SOLUTION</p><span className="text-xs text-[var(--muted)]">{time} ms</span></div>
      <p className="mt-2 min-h-12 text-xl font-bold leading-8 tracking-wide">{solution.join(" ") || "—"}</p>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{solution.map((move, i) => <button key={`${move}-${i}`} disabled={animating} onClick={() => { setPlaying(false); setStep(i + 1); }} className={`min-w-11 rounded-xl border p-3 font-extrabold disabled:opacity-50 ${i === step - 1 ? "border-[var(--green)] bg-[rgba(52,208,88,.14)]" : "border-[var(--border)] bg-black/20"}`}>{move}</button>)}</div>

      <div className="mt-4"><div className="mb-2 flex justify-between text-xs font-bold text-[var(--muted)]"><span>Progress</span><span>{step} / {solution.length}</span></div><input aria-label="Solution progress" type="range" min={0} max={Math.max(solution.length, 1)} value={step} disabled={!solution.length || animating} onChange={(event) => { setPlaying(false); setStep(Number(event.target.value)); }} className="w-full accent-[var(--green)] disabled:opacity-40" /></div>

      <div className="mt-4 grid grid-cols-3 gap-2"><button disabled={step === 0 || animating} onClick={previous} className="glass rounded-xl p-3 font-bold disabled:opacity-40">Previous</button><button disabled={!solution.length || animating} onClick={togglePlay} className="cta-green rounded-xl p-3 font-extrabold disabled:opacity-40">{playing ? "Pause" : "Play"}</button><button disabled={step >= solution.length || animating} onClick={next} className="glass rounded-xl p-3 font-bold disabled:opacity-40">Next</button></div>

      <div className="mt-3 grid grid-cols-4 gap-2">{SPEEDS.map((speed, index) => <button key={speed.label} onClick={() => setSpeedIndex(index)} className={`rounded-xl border px-2 py-2 text-sm font-extrabold ${speedIndex === index ? "border-[var(--green)] bg-[rgba(52,208,88,.14)] text-[var(--green)]" : "border-[var(--border)] bg-black/20 text-[var(--muted)]"}`}>{speed.label}</button>)}</div>
    </section>

    <section className="glass overflow-hidden rounded-[22px] p-4">
      <div className="flex items-center justify-between"><div><p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">3D SOLUTION PLAYBACK</p><p className="mt-1 text-sm text-[var(--muted)]">{canShow3D ? "Tap moves, scrub progress, or press Play." : "Fill in every sticker above to preview your cube in 3D."}</p></div><span className="rounded-full border border-[var(--border)] bg-black/25 px-3 py-1 text-xs font-extrabold text-[var(--green)]">{step} / {solution.length}</span></div>
      <div className="cube-card relative mt-4 h-[320px] overflow-hidden rounded-[22px]"><div className="platform-ring absolute bottom-[58px] left-1/2 z-[1] h-[66px] w-[230px] -translate-x-1/2 rounded-[50%]" />{canShow3D ? <><div className="absolute inset-0 z-[2]"><SolverCube3D initialFacelets={initialFaceletsForPlayback} solution={solution} step={step} onAnimating={onAnimating} durationMs={SPEEDS[speedIndex].duration} /></div><div className="pointer-events-none absolute bottom-4 left-1/2 z-[3] -translate-x-1/2 whitespace-nowrap text-[13px] font-semibold text-[var(--muted)]">Drag to rotate • playback stays flash-free</div></> : <div className="absolute inset-0 z-[2] grid place-items-center px-6 text-center text-sm text-[var(--faint)]">Your cube will appear here once every sticker is filled in.</div>}</div>
    </section>

    <details className="glass rounded-[22px] p-4"><summary className="cursor-pointer text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">DEVELOPER CHECKS</summary><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Runs 100 random 50-move sequences and immediately reverses each one. The cube engine must return to solved every time.</p><button onClick={runStressTest} className="mt-3 w-full rounded-xl border border-[var(--border)] bg-black/20 p-3 font-extrabold">RUN 10,000-MOVE TEST</button><p className="mt-3 text-center text-sm font-bold text-[var(--green)]">{stressResult}</p></details>
  </div>;
}
