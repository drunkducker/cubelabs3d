"use client";

/**
 * Real Kilominx solver, two ways to load a cube — the same two-mode shape as
 * the 3x3 ManualSolver:
 *  - "Scramble Demo": the engine generates a scramble, its verified reduction
 *    solver solves it, and the solution plays back on the flat net.
 *  - "Enter My Cube": the player taps the 60 corner stickers of the flat
 *    pentagon net to match their own physical Kilominx, then the same verified
 *    solver runs on whatever they entered.
 *
 * Both modes drive one shared solution/step/playback state; only how the
 * STARTING cube is produced differs. All geometry, moves, the solver, and the
 * facelet<->state mapping come from lib/kilominx-engine.ts (independently
 * tested); the flat-net coordinates come from lib/kilominx-net-layout.ts, which
 * is derived from that same geometry. This component only paints, solves, and
 * scrubs — it re-derives no combinatorics.
 *
 * A Kilominx has no fixed centre pieces (it is corners-only), so there is no
 * physical anchor telling you which face is which — entry is relative to the
 * standard colour scheme. Each face's centre shows its reference colour and
 * number so the player can orient their cube to match; every one of the 60
 * kites is editable.
 */
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  solved, applyMoves, isSolved, randomScramble, scrambleToNotation, solve,
  moveLabel, faceletsToState, isSolvableKiloState, stateToFacelets, FACELET_COUNT,
  FACE_COLORS, type KiloState,
} from "@/lib/kilominx-engine";
import { kilominxNet } from "@/lib/kilominx-net-layout";

const KilominxSolverCube3D = dynamic(() => import("./KilominxSolverCube3D"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-[var(--faint)]">Loading Kilominx…</div>,
});

const COLORS = FACE_COLORS as readonly string[];
const NET = kilominxNet();
// Each speed sets the on-cube twist duration; autoplay advances a step only once
// the previous twist has settled (see the autoplay effect), so the twist pace,
// not a fixed timer, drives playback — the same model the 4×4 solver uses.
const SPEEDS = [
  { label: "0.5×", duration: 560 },
  { label: "1×", duration: 340 },
  { label: "1.5×", duration: 220 },
  { label: "2×", duration: 150 },
];

type Mode = "scramble" | "manual";

const emptyFacelets = () => new Array<number>(FACELET_COUNT).fill(-1);

/** Points attribute for a kite quad, shrunk slightly toward its centroid so the
 * dark backing shows through as thin gaps between stickers. */
function kitePoints(quad: readonly [number, number][], shrink: number) {
  const cx = quad.reduce((s, p) => s + p[0], 0) / quad.length;
  const cy = quad.reduce((s, p) => s + p[1], 0) / quad.length;
  return quad.map(([x, y]) => `${(cx + (x - cx) * shrink).toFixed(3)},${(cy + (y - cy) * shrink).toFixed(3)}`).join(" ");
}

export default function KilominxSolver() {
  const [mode, setMode] = useState<Mode>("scramble");
  const [scrambleState, setScrambleState] = useState<KiloState>(() => solved());
  const [scrambleText, setScrambleText] = useState("");
  const [manualFacelets, setManualFacelets] = useState<number[]>(emptyFacelets);
  const [manualBase, setManualBase] = useState<KiloState | null>(null);
  const [paintColor, setPaintColor] = useState(0);
  const [solution, setSolution] = useState<number[]>([]);
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Preparing solver…");
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [animating, setAnimating] = useState(false);
  const [locked, setLocked] = useState(false);
  const autoplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onAnimating = useCallback((value: boolean) => setAnimating(value), []);

  // Warm up the solver's lazily-built tables once, off the first paint, so the
  // first real solve doesn't hitch. solve(solved()) is a no-op that builds them.
  useEffect(() => {
    const id = setTimeout(() => {
      try { solve(solved()); setReady(true); setStatus("Solver ready"); }
      catch { setStatus("Solver failed to initialize"); }
    }, 30);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (autoplayTimer.current) clearTimeout(autoplayTimer.current);
    if (!playing || animating || step >= solution.length) { if (step >= solution.length) setPlaying(false); return; }
    autoplayTimer.current = setTimeout(() => setStep((v) => Math.min(solution.length, v + 1)), 120);
    return () => { if (autoplayTimer.current) clearTimeout(autoplayTimer.current); };
  }, [playing, animating, step, solution.length]);

  const manualComplete = !manualFacelets.includes(-1);
  const colorCounts = useMemo(() => COLORS.map((_, i) => manualFacelets.filter((v) => v === i).length), [manualFacelets]);

  // The net always shows the current mode's cube, advanced to `step` of the
  // solution when one exists (so the net doubles as the playback view).
  const displayFacelets = useMemo(() => {
    const base = mode === "scramble" ? scrambleState : manualBase;
    if (base) return stateToFacelets(applyMoves(base, solution.slice(0, step)));
    return manualFacelets; // manual entry not yet solved: show what was typed
  }, [mode, scrambleState, manualBase, solution, step, manualFacelets]);

  // The state the 3D playback starts from: the scramble, or the entered cube
  // (its solved base once solved, else the valid cube the stickers describe).
  // Colours come from this base; the solution then twists it back to solid.
  const playbackBase = useMemo<KiloState | null>(() => {
    if (mode === "scramble") return scrambleState;
    if (manualBase) return manualBase;
    return manualComplete ? faceletsToState(manualFacelets) : null;
  }, [mode, scrambleState, manualBase, manualComplete, manualFacelets]);
  const playbackFacelets = useMemo(() => (playbackBase ? stateToFacelets(playbackBase) : null), [playbackBase]);
  const canShow3D = playbackFacelets !== null;

  const resetSolution = useCallback(() => { setPlaying(false); setSolution([]); setStep(0); setTime(0); }, []);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    resetSolution();
    setManualBase(null);
    setStatus(next === "manual" ? "Tap a colour, then tap a sticker to match your cube" : "Tap Random Scramble to create a test cube.");
  };

  const paintCell = (index: number) => setManualFacelets((prev) => { const next = [...prev]; next[index] = paintColor; return next; });

  const clearManualEntry = () => {
    setManualFacelets(emptyFacelets());
    setManualBase(null);
    resetSolution();
    setStatus("Entry cleared");
  };

  const scrambleCube = () => {
    const seq = randomScramble(30);
    setScrambleState(applyMoves(solved(), seq));
    setScrambleText(scrambleToNotation(seq));
    resetSolution();
    setStatus("Scrambled cube ready");
  };

  const solveScramble = () => {
    if (!ready) return;
    if (isSolved(scrambleState)) { resetSolution(); setStatus("Already solved"); return; }
    const start = performance.now();
    try {
      const moves = solve(scrambleState);
      const verified = isSolved(applyMoves(scrambleState, moves));
      setPlaying(false); setSolution(moves); setStep(0);
      setTime(Math.round(performance.now() - start));
      setStatus(verified ? `Verified solution — ${moves.length} moves` : "Solution verification failed");
    } catch { setStatus("This cube state could not be solved"); }
  };

  const solveManualCube = () => {
    if (!ready || !manualComplete) return;
    const parsed = faceletsToState(manualFacelets);
    if (!parsed) { setManualBase(null); resetSolution(); setStatus("These colours don't form a real cube — check for a misread or swapped sticker"); return; }
    if (!isSolvableKiloState(parsed)) { setManualBase(null); resetSolution(); setStatus("These colours form real pieces but an impossible cube — check a swapped or flipped corner"); return; }
    if (isSolved(parsed)) { setManualBase(parsed); resetSolution(); setStatus("Already solved"); return; }
    const start = performance.now();
    try {
      const moves = solve(parsed);
      const verified = isSolved(applyMoves(parsed, moves));
      setManualBase(parsed);
      setPlaying(false); setSolution(moves); setStep(0);
      setTime(Math.round(performance.now() - start));
      setStatus(verified ? `Verified solution — ${moves.length} moves` : "Solution verification failed");
    } catch { setStatus("This cube state could not be solved"); }
  };

  const previous = () => { setPlaying(false); setStep((v) => Math.max(0, v - 1)); };
  const next = () => setStep((v) => Math.min(solution.length, v + 1));
  const togglePlay = () => { if (!solution.length) return; if (step >= solution.length) setStep(0); setPlaying((v) => !v); };

  const showReference = mode === "manual" && !manualBase;

  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-2">
      <button onClick={() => switchMode("scramble")} className={`rounded-2xl p-3 font-extrabold ${mode === "scramble" ? "cta-purple" : "glass"}`}>SCRAMBLE DEMO</button>
      <button onClick={() => switchMode("manual")} className={`rounded-2xl p-3 font-extrabold ${mode === "manual" ? "cta-purple" : "glass"}`}>ENTER MY CUBE</button>
    </div>

    <section className="glass rounded-[22px] p-4">
      <div className="mb-3 flex items-center justify-between gap-3"><span className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">LIVE CUBE STATE</span><span className="text-right text-xs font-bold text-[var(--green)]">{status}</span></div>
      <svg viewBox={`0 0 ${NET.width} ${NET.height}`} className="mx-auto block w-full max-w-[420px]" role="img" aria-label="Kilominx net">
        {NET.kites.map((k) => {
          const index = k.face * 5 + k.kite;
          const value = displayFacelets[index];
          const filled = value !== -1;
          const editable = mode === "manual" && !manualBase;
          return <polygon
            key={index}
            points={kitePoints(k.quad, 0.9)}
            onClick={editable ? () => paintCell(index) : undefined}
            fill={filled ? COLORS[value] : "rgba(255,255,255,.05)"}
            stroke="#0b0d12"
            strokeWidth={0.03}
            strokeLinejoin="round"
            className={editable ? "cursor-pointer" : ""}
            style={{ strokeDasharray: filled ? undefined : "0.06 0.05" }}
          />;
        })}
        {showReference && NET.faceCenters.map((f) => <g key={f.face}>
          <circle cx={f.at[0]} cy={f.at[1]} r={0.17} fill={COLORS[f.face]} stroke="#0b0d12" strokeWidth={0.02} />
          <text x={f.at[0]} y={f.at[1] + 0.06} fontSize={0.16} fontWeight={800} fill="#0b0d12" textAnchor="middle">{f.face + 1}</text>
        </g>)}
      </svg>
    </section>

    {mode === "scramble" ? <>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={scrambleCube} className="glass rounded-2xl p-4 font-extrabold">RANDOM SCRAMBLE</button>
        <button disabled={!ready} onClick={solveScramble} className="cta-green rounded-2xl p-4 font-extrabold disabled:opacity-50">SOLVE CUBE</button>
      </div>
      <section className="glass rounded-[22px] p-4"><p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">SCRAMBLE</p><p className="mt-2 min-h-12 break-words leading-7 text-[var(--text)]">{scrambleText || "Tap Random Scramble to create a test cube."}</p></section>
    </> : <>
      <section className="glass rounded-[22px] p-4">
        <div className="mb-3 flex items-center justify-between gap-3"><span className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">TAP A COLOUR, THEN TAP A STICKER</span><Link href="/cube-notation" className="text-xs font-bold text-[var(--green)]">Learn notation →</Link></div>
        <div className="grid grid-cols-6 gap-2">
          {COLORS.map((hex, i) => {
            const count = colorCounts[i];
            const over = count > 5;
            return <button key={hex} onClick={() => setPaintColor(i)} className={`flex flex-col items-center gap-1 rounded-xl border p-2 ${paintColor === i ? "border-[var(--green)] bg-[rgba(52,208,88,.14)]" : "border-[var(--border)] bg-black/20"}`}>
              <span className="h-8 w-full rounded-lg border border-white/15" style={{ background: hex }} />
              <span className={`text-[11px] font-extrabold ${over ? "text-[var(--gold)]" : "text-[var(--muted)]"}`}>{count}/5</span>
            </button>;
          })}
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={clearManualEntry} className="glass rounded-2xl p-4 font-extrabold">CLEAR ENTRY</button>
        <button disabled={!ready || !manualComplete} onClick={solveManualCube} className="cta-green rounded-2xl p-4 font-extrabold disabled:opacity-50">SOLVE MY CUBE</button>
      </div>
      <section className="glass rounded-[22px] p-4 text-sm leading-6 text-[var(--muted)]">
        <p><strong className="text-[var(--text)]">No fixed centres.</strong> A Kilominx is corners-only, so the numbered centre swatch on each face is just a colour reference — orient your cube to match the standard scheme, then paint all five corner stickers of every face.</p>
        <p><strong className="text-[var(--text)]">Not sure which face is which?</strong> Tap &quot;Learn notation&quot; above for a labeled reference.</p>
      </section>
    </>}

    <section className="glass rounded-[22px] p-4">
      <div className="flex items-center justify-between"><p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">VERIFIED SOLUTION</p><span className="text-xs text-[var(--muted)]">{time} ms</span></div>
      <p className="mt-2 min-h-12 text-xl font-bold leading-8 tracking-wide">{solution.map(moveLabel).join(" ") || "—"}</p>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{solution.map((move, i) => <button key={i} disabled={animating} onClick={() => { setPlaying(false); setStep(i + 1); }} className={`min-w-11 rounded-xl border p-3 font-extrabold disabled:opacity-50 ${i === step - 1 ? "border-[var(--green)] bg-[rgba(52,208,88,.14)]" : "border-[var(--border)] bg-black/20"}`}>{moveLabel(move)}</button>)}</div>

      <div className="mt-4"><div className="mb-2 flex justify-between text-xs font-bold text-[var(--muted)]"><span>Progress</span><span>{step} / {solution.length}</span></div><input aria-label="Solution progress" type="range" min={0} max={Math.max(solution.length, 1)} value={step} disabled={!solution.length || animating} onChange={(e) => { setPlaying(false); setStep(Number(e.target.value)); }} className="w-full accent-[var(--green)] disabled:opacity-40" /></div>

      <div className="mt-4 grid grid-cols-3 gap-2"><button disabled={step === 0 || animating} onClick={previous} className="glass rounded-xl p-3 font-bold disabled:opacity-40">Previous</button><button disabled={!solution.length || animating} onClick={togglePlay} className="cta-green rounded-xl p-3 font-extrabold disabled:opacity-40">{playing ? "Pause" : "Play"}</button><button disabled={step >= solution.length || animating} onClick={next} className="glass rounded-xl p-3 font-bold disabled:opacity-40">Next</button></div>

      <div className="mt-3 grid grid-cols-4 gap-2">{SPEEDS.map((speed, i) => <button key={speed.label} onClick={() => setSpeedIndex(i)} className={`rounded-xl border px-2 py-2 text-sm font-extrabold ${speedIndex === i ? "border-[var(--green)] bg-[rgba(52,208,88,.14)] text-[var(--green)]" : "border-[var(--border)] bg-black/20 text-[var(--muted)]"}`}>{speed.label}</button>)}</div>
    </section>

    <section className="glass overflow-hidden rounded-[22px] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">KILOMINX SOLUTION PLAYBACK</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{canShow3D ? "Tap moves, scrub progress, or press Play." : "Scramble or fully enter a cube to preview it in 3D."}</p>
        </div>
        <span className="rounded-full border border-[var(--border)] bg-black/25 px-3 py-1 text-xs font-extrabold text-[var(--green)]">{step} / {solution.length}</span>
      </div>
      <div className="cube-card relative mt-4 h-[360px] overflow-hidden rounded-[22px]">
        <div className="platform-ring absolute bottom-[58px] left-1/2 z-[1] h-[66px] w-[230px] -translate-x-1/2 rounded-[50%]" />
        {canShow3D ? <>
          <div className="absolute inset-0 z-[2]">
            <KilominxSolverCube3D initialFacelets={playbackFacelets!} solution={solution} step={step} onAnimating={onAnimating} durationMs={SPEEDS[speedIndex].duration} locked={locked} />
          </div>
          <button
            onClick={() => setLocked((v) => !v)}
            aria-pressed={locked}
            className={`absolute right-3 top-3 z-[3] rounded-full border px-3 py-1.5 text-xs font-extrabold backdrop-blur ${locked ? "border-[var(--purple)] bg-[rgba(139,92,246,.18)] text-[var(--text)]" : "border-[var(--border)] bg-black/40 text-[var(--muted)]"}`}
          >{locked ? "🔒 Rotation locked" : "🔓 Lock rotation"}</button>
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-[3] -translate-x-1/2 whitespace-nowrap text-[13px] font-semibold text-[var(--muted)]">{locked ? "Rotation locked • verified playback" : "Drag to rotate • verified playback"}</div>
        </> : <div className="absolute inset-0 z-[2] grid place-items-center px-6 text-center text-sm text-[var(--faint)]">Your Kilominx will appear here once it&apos;s scrambled or fully entered.</div>}
      </div>
    </section>

    <Link href="/play/kilominx" className="glass flex items-center justify-between rounded-[22px] p-4 font-extrabold"><span>Play the Kilominx in 3D</span><span className="text-[var(--green)]">→</span></Link>
  </div>;
}
