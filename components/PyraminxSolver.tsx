"use client";

/**
 * Manual-entry Pyraminx solver.
 *
 * Scramble mode creates a legal state from notation. Manual mode paints all 36
 * stickers: 12 tips, 12 axial-center stickers, and 12 edge stickers. Both
 * modes feed the same engine state, verified solution, and flat-net step
 * playback. No puzzle combinatorics are duplicated in this component.
 */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  applySequence,
  isSolved,
  randomScramble,
  solve,
  solved,
  type PyraState,
} from "@/lib/pyraminx-engine";
import {
  PYRAMINX_COLORS,
  emptyManualPyraminxFacelets,
  isSolvablePyraminxState,
  pyraminxFaceletsToState,
  stateToPyraminxFacelets,
} from "@/lib/pyraminx-facelets";
import { pyraminxNet, type PyraNetPoint } from "@/lib/pyraminx-net-layout";

const NET = pyraminxNet();
const FACE_NAMES = ["Green", "Red", "Blue", "Yellow"] as const;
const FACE_SHORT = ["G", "R", "B", "Y"] as const;
const SPEEDS = [
  { label: "0.5×", interval: 760 },
  { label: "1×", interval: 440 },
  { label: "1.5×", interval: 280 },
  { label: "2×", interval: 170 },
];

type Mode = "scramble" | "manual";

function polygonPoints(points: readonly PyraNetPoint[], shrink: number) {
  const centerX = points.reduce((sum, point) => sum + point[0], 0) / points.length;
  const centerY = points.reduce((sum, point) => sum + point[1], 0) / points.length;
  return points.map(([x, y]) => `${(centerX + (x - centerX) * shrink).toFixed(3)},${(centerY + (y - centerY) * shrink).toFixed(3)}`).join(" ");
}

export default function PyraminxSolver() {
  const [mode, setMode] = useState<Mode>("scramble");
  const [scrambleState, setScrambleState] = useState<PyraState>(() => solved());
  const [scrambleText, setScrambleText] = useState("");
  const [manualFacelets, setManualFacelets] = useState<number[]>(emptyManualPyraminxFacelets);
  const [manualBase, setManualBase] = useState<PyraState | null>(null);
  const [paintColor, setPaintColor] = useState(0);
  const [solution, setSolution] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Preparing exact solver…");
  const [solveTime, setSolveTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [movesExpanded, setMovesExpanded] = useState(false);
  const autoplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetSolution = useCallback(() => {
    setPlaying(false);
    setSolution([]);
    setStep(0);
    setSolveTime(0);
    setMovesExpanded(false);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        solve(solved()); // Builds and caches the solved-side core table off first paint.
        setReady(true);
        setStatus("Solver ready");
      } catch {
        setStatus("Solver failed to initialize");
      }
    }, 30);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (autoplayTimer.current) window.clearTimeout(autoplayTimer.current);
    if (!playing || step >= solution.length) {
      if (step >= solution.length) setPlaying(false);
      return;
    }
    autoplayTimer.current = window.setTimeout(() => setStep((value) => Math.min(solution.length, value + 1)), SPEEDS[speedIndex].interval);
    return () => { if (autoplayTimer.current) window.clearTimeout(autoplayTimer.current); };
  }, [playing, solution.length, speedIndex, step]);

  const loadScramble = useCallback((sequence: string) => {
    const normalized = sequence.trim();
    if (!normalized) return;
    try {
      const next = applySequence(solved(), normalized);
      setMode("scramble");
      setScrambleState(next);
      setScrambleText(normalized);
      setManualBase(null);
      resetSolution();
      setStatus("Saved scramble loaded");
    } catch {
      setStatus("That scramble contains invalid Pyraminx notation");
    }
  }, [resetSolution]);

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ puzzleType?: string; scramble?: string }>).detail;
      if (detail?.puzzleType !== "pyraminx" || !detail.scramble) return;
      loadScramble(detail.scramble);
    };
    window.addEventListener("cube-labs:load-scramble", listener);
    return () => window.removeEventListener("cube-labs:load-scramble", listener);
  }, [loadScramble]);

  const manualComplete = !manualFacelets.includes(-1);
  const colorCounts = useMemo(() => PYRAMINX_COLORS.map((_, color) => manualFacelets.filter((value) => value === color).length), [manualFacelets]);

  const displayFacelets = useMemo(() => {
    const base = mode === "scramble" ? scrambleState : manualBase;
    if (base) return stateToPyraminxFacelets(applySequence(base, solution.slice(0, step).join(" ")));
    return manualFacelets;
  }, [manualBase, manualFacelets, mode, scrambleState, solution, step]);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setManualBase(null);
    resetSolution();
    setStatus(next === "manual" ? "Match all 36 stickers on your Pyraminx" : "Tap Random Scramble to create a test puzzle");
  };

  const paintCell = (index: number) => {
    setManualFacelets((previous) => {
      const next = [...previous];
      next[index] = paintColor;
      return next;
    });
  };

  const clearManualEntry = () => {
    setManualFacelets(emptyManualPyraminxFacelets());
    setManualBase(null);
    resetSolution();
    setStatus("Sticker entry cleared");
  };

  const scramblePuzzle = () => {
    const sequence = randomScramble(10);
    setScrambleState(applySequence(solved(), sequence));
    setScrambleText(sequence);
    resetSolution();
    setStatus("Scrambled Pyraminx ready");
  };

  const generateSolution = (base: PyraState, source: "scramble" | "manual") => {
    if (!ready) return;
    if (isSolved(base)) {
      if (source === "manual") setManualBase(base);
      resetSolution();
      setStatus("Already solved");
      return;
    }
    const started = performance.now();
    try {
      const moves = solve(base);
      const verified = isSolved(applySequence(base, moves.join(" ")));
      if (!verified) {
        setStatus("This sticker state is impossible — check the entry");
        return;
      }
      if (source === "manual") setManualBase(base);
      setPlaying(false);
      setSolution(moves);
      setStep(0);
      setSolveTime(Math.round(performance.now() - started));
      setStatus(`Verified solution — ${moves.length} moves`);
    } catch {
      setStatus("This Pyraminx state could not be solved");
    }
  };

  const solveScramble = () => generateSolution(scrambleState, "scramble");

  const solveManual = () => {
    if (!ready || !manualComplete) return;
    const parsed = pyraminxFaceletsToState(manualFacelets);
    if (!parsed) {
      setManualBase(null);
      resetSolution();
      setStatus("Those colours do not form the four real centers, four real tips, and six real edges — check the entry");
      return;
    }
    if (!isSolvablePyraminxState(parsed)) {
      setManualBase(null);
      resetSolution();
      setStatus("The pieces are real, but the arrangement is impossible — check for a swapped or flipped edge");
      return;
    }
    generateSolution(parsed, "manual");
  };

  const previous = () => { setPlaying(false); setStep((value) => Math.max(0, value - 1)); };
  const next = () => setStep((value) => Math.min(solution.length, value + 1));
  const togglePlay = () => {
    if (!solution.length) return;
    if (step >= solution.length) setStep(0);
    setPlaying((value) => !value);
  };

  const entryOpen = mode === "manual" && !manualBase;

  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-2">
      <button onClick={() => switchMode("scramble")} className={`rounded-2xl p-3 font-extrabold ${mode === "scramble" ? "cta-purple" : "glass"}`}>SCRAMBLE DEMO</button>
      <button onClick={() => switchMode("manual")} className={`rounded-2xl p-3 font-extrabold ${mode === "manual" ? "cta-purple" : "glass"}`}>ENTER MY PUZZLE</button>
    </div>

    <section className="glass rounded-[22px] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div><p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">FOUR-FACE PYRAMINX NET</p><p className="mt-1 text-xs text-[var(--faint)]">The G/R/B/Y badges are solved-face references; all 36 stickers can move.</p></div>
        <span className="max-w-[155px] text-right text-xs font-bold leading-5 text-[var(--green)]">{status}</span>
      </div>
      <svg viewBox={`0 0 ${NET.width} ${NET.height}`} className="mx-auto block w-full max-w-[430px]" role="img" aria-label="Pyraminx sticker-entry net">
        {NET.cells.map((cell) => {
          const value = displayFacelets[cell.index];
          const filled = value >= 0;
          return <polygon
            key={cell.index}
            points={polygonPoints(cell.triangle, 0.87)}
            fill={filled ? PYRAMINX_COLORS[value] : "rgba(255,255,255,.055)"}
            stroke="#080b12"
            strokeWidth={0.055}
            strokeLinejoin="round"
            onClick={entryOpen ? () => paintCell(cell.index) : undefined}
            className={entryOpen ? "cursor-pointer" : ""}
            style={{ strokeDasharray: filled ? undefined : "0.12 0.08" }}
          ><title>{FACE_NAMES[cell.face]} face — {cell.target.kind}</title></polygon>;
        })}
        {NET.faceLabels.map(({ face, at }) => <g key={face} pointerEvents="none">
          <circle cx={at[0]} cy={at[1]} r={0.23} fill="rgba(7,10,16,.78)" stroke="rgba(255,255,255,.35)" strokeWidth={0.03} />
          <text x={at[0]} y={at[1] + 0.075} fontSize={0.22} fontWeight={900} fill="#ffffff" textAnchor="middle">{FACE_SHORT[face]}</text>
        </g>)}
      </svg>
    </section>

    {mode === "scramble" ? <>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={scramblePuzzle} className="glass rounded-2xl p-4 font-extrabold">RANDOM SCRAMBLE</button>
        <button disabled={!ready} onClick={solveScramble} className="cta-green rounded-2xl p-4 font-extrabold disabled:opacity-50">SOLVE PUZZLE</button>
      </div>
      <section className="glass rounded-[22px] p-4" data-puzzle-scramble={scrambleText}>
        <p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">SCRAMBLE</p>
        <p className="mt-2 min-h-12 break-words font-mono text-sm leading-7 text-[var(--text)]">{scrambleText || "Tap Random Scramble to create a legal test state."}</p>
      </section>
    </> : <>
      <section className="glass rounded-[22px] p-4">
        <p className="mb-3 text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">TAP A COLOUR, THEN TAP A STICKER</p>
        <div className="grid grid-cols-4 gap-2">
          {PYRAMINX_COLORS.map((hex, color) => {
            const count = colorCounts[color];
            const invalid = count > 9;
            return <button key={hex} onClick={() => setPaintColor(color)} className={`flex flex-col items-center gap-1 rounded-xl border p-2 ${paintColor === color ? "border-[var(--green)] bg-[rgba(52,208,88,.14)]" : "border-[var(--border)] bg-black/20"}`}>
              <span className="h-9 w-full rounded-lg border border-white/15" style={{ background: hex }} />
              <span className={`text-[11px] font-extrabold ${invalid ? "text-[var(--gold)]" : "text-[var(--muted)]"}`}>{count}/9</span>
            </button>;
          })}
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={clearManualEntry} className="glass rounded-2xl p-4 font-extrabold">CLEAR ENTRY</button>
        <button disabled={!ready || !manualComplete} onClick={solveManual} className="cta-green rounded-2xl p-4 font-extrabold disabled:opacity-50">SOLVE MY PUZZLE</button>
      </div>
      <section className="glass rounded-[22px] p-4 text-sm leading-6 text-[var(--muted)]">
        <p><strong className="text-[var(--text)]">Use the solved-face references.</strong> Rotate the whole physical puzzle until its colour scheme matches the G/R/B/Y net, then enter every tip, center, and edge sticker.</p>
        <p className="mt-2"><strong className="text-[var(--text)]">Impossible states are rejected.</strong> The solver checks colour counts, all four tips, all four axial centers, all six edges, core reachability, and the final solved result.</p>
      </section>
    </>}

    <section className="glass rounded-[22px] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">VERIFIED SOLUTION</p>
        <div className="flex items-center gap-3">
          {solution.length > 0 && <button onClick={() => setMovesExpanded((value) => !value)} aria-expanded={movesExpanded} className="text-xs font-extrabold text-[var(--green)]">{movesExpanded ? "Collapse ▴" : `Show all ${solution.length} ▾`}</button>}
          <span className="text-xs text-[var(--muted)]">{solveTime} ms</span>
        </div>
      </div>
      {solution.length === 0 ? <p className="mt-2 min-h-12 text-xl font-bold leading-8 tracking-wide">—</p> : <p className={`mt-2 font-mono text-xl font-bold leading-8 tracking-wide ${movesExpanded ? "" : "line-clamp-2"}`}>{solution.join(" ")}</p>}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{solution.map((move, index) => <button key={`${move}-${index}`} onClick={() => { setPlaying(false); setStep(index + 1); }} className={`min-w-11 rounded-xl border p-3 font-extrabold ${index === step - 1 ? "border-[var(--green)] bg-[rgba(52,208,88,.14)]" : "border-[var(--border)] bg-black/20"}`}>{move}</button>)}</div>
      <div className="mt-4"><div className="mb-2 flex justify-between text-xs font-bold text-[var(--muted)]"><span>Net playback</span><span>{step} / {solution.length}</span></div><input aria-label="Solution progress" type="range" min={0} max={Math.max(solution.length, 1)} value={step} disabled={!solution.length} onChange={(event: ChangeEvent<HTMLInputElement>) => { setPlaying(false); setStep(Number(event.target.value)); }} className="w-full accent-[var(--green)] disabled:opacity-40" /></div>
      <div className="mt-4 grid grid-cols-3 gap-2"><button disabled={step === 0} onClick={previous} className="glass rounded-xl p-3 font-bold disabled:opacity-40">Previous</button><button disabled={!solution.length} onClick={togglePlay} className="cta-green rounded-xl p-3 font-extrabold disabled:opacity-40">{playing ? "Pause" : "Play"}</button><button disabled={step >= solution.length} onClick={next} className="glass rounded-xl p-3 font-bold disabled:opacity-40">Next</button></div>
      <div className="mt-3 grid grid-cols-4 gap-2">{SPEEDS.map((speed, index) => <button key={speed.label} onClick={() => setSpeedIndex(index)} className={`rounded-xl border px-2 py-2 text-sm font-extrabold ${speedIndex === index ? "border-[var(--green)] bg-[rgba(52,208,88,.14)] text-[var(--green)]" : "border-[var(--border)] bg-black/20 text-[var(--muted)]"}`}>{speed.label}</button>)}</div>
    </section>

    <section className="glass rounded-[22px] p-4 text-sm leading-6 text-[var(--muted)]">
      <p><strong className="text-[var(--text)]">Notation:</strong> U/L/R/B turn a full vertex layer. Lowercase u/l/r/b twist only the small tip. An apostrophe means the opposite direction.</p>
    </section>

    <Link href="/play/pyraminx" className="glass flex items-center justify-between rounded-[22px] p-4 font-extrabold"><span>Play the Pyraminx in 3D</span><span className="text-[var(--green)]">→</span></Link>
  </div>;
}
