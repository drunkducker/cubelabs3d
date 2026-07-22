"use client";

/**
 * 5x5 reduced-state solver with manual entry.
 *
 * Full arbitrary 5x5 reduction (centers + edge triplets) is still in
 * development (see 5X5_SOLVER_HANDOFF.md), so this ships the honest slice that
 * works today: any *reduced* 5x5 — centers solved, edge triplets paired — is
 * sampled to a 3x3, solved by the same cubejs engine as the 3x3 page, and the
 * solution is verified move-for-move on the full 5x5. States that aren't
 * reduced are scored and clearly labelled, never pretend-solved.
 *
 * The reduced solve is a single fast 3x3 call, so unlike the 4x4 this needs no
 * Web Worker.
 */
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cube from "cubejs";
import {
  buildFastModel,
  applyFastSeq,
  centerProgressFast,
  edgeProgressFast,
  isSolvedFast,
  reducedFaceletStringFast,
} from "@/lib/nxn-fast";
import { nxnNet } from "@/lib/nxn-net";

const NxNSolverCube3D = dynamic(() => import("./NxNSolverCube3D"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-[var(--faint)]">Loading 5×5 cube…</div>,
});

const SIZE = 5;
const LETTERS = ["U", "R", "F", "D", "L", "B"] as const;
const COLORS = ["#f7f7f2", "#e53935", "#24c45a", "#ffd21f", "#ff7a18", "#1464e8"];
const NET = nxnNet(SIZE);
const PER_COLOR = SIZE * SIZE; // 25
const CENTER_TARGET = 6 * (SIZE - 2) * (SIZE - 2); // 54
const MODEL = buildFastModel(SIZE);
const FACE_TURNS = ["U", "R", "F", "D", "L", "B"];
const SUFFIX = ["", "'", "2"];
const SPEEDS = [
  { label: "0.5×", duration: 760 },
  { label: "1×", duration: 460 },
  { label: "1.5×", duration: 300 },
  { label: "2×", duration: 220 },
];

type Mode = "scramble" | "manual";

const faceletsToString = (facelets: number[]) => facelets.map((v) => (v < 0 ? "?" : LETTERS[v])).join("");

function initManual(): number[] {
  // odd cube: the six face-centre stickers are fixed and pre-filled
  const arr = Array(6 * SIZE * SIZE).fill(-1);
  for (let f = 0; f < 6; f++) arr[f * SIZE * SIZE + Math.floor((SIZE * SIZE) / 2)] = f;
  return arr;
}

function reducedScramble(count = 40): string[] {
  const out: string[] = [];
  let last = "";
  while (out.length < count) {
    const face = FACE_TURNS[Math.floor(Math.random() * FACE_TURNS.length)];
    if (face === last) continue;
    last = face;
    out.push(`${face}${SUFFIX[Math.floor(Math.random() * SUFFIX.length)]}`);
  }
  return out;
}

function fullScramble(count = 50): string[] {
  const faces = FACE_TURNS.flatMap((f) => [f, `${f}w`]);
  const out: string[] = [];
  let last = "";
  while (out.length < count) {
    const base = faces[Math.floor(Math.random() * faces.length)];
    if (base[0] === last) continue;
    last = base[0];
    out.push(`${base}${SUFFIX[Math.floor(Math.random() * SUFFIX.length)]}`);
  }
  return out;
}

// Standard 3x3 solvability check — must run before cubejs.solve(), which
// otherwise hangs the tab on an illegal state (same guard the 3x3 page uses).
function permutationParity(perm: number[]) {
  const seen = Array(perm.length).fill(false);
  let parity = 0;
  for (let i = 0; i < perm.length; i++) {
    if (seen[i]) continue;
    let len = 0, j = i;
    while (!seen[j]) { seen[j] = true; j = perm[j]; len++; }
    parity += len - 1;
  }
  return parity % 2;
}
function isLegal3x3(cube: Cube) {
  const isPerm = (p: number[], n: number) => p.length === n && new Set(p).size === n && p.every((v) => v >= 0 && v < n);
  if (!isPerm(cube.cp, 8) || !isPerm(cube.ep, 12)) return false;
  if (cube.co.reduce((a: number, b: number) => a + b, 0) % 3 !== 0) return false;
  if (cube.eo.reduce((a: number, b: number) => a + b, 0) % 2 !== 0) return false;
  return permutationParity(cube.cp) === permutationParity(cube.ep);
}

export default function FiveSolver() {
  const [mode, setMode] = useState<Mode>("scramble");
  const [cubeFacelets, setCubeFacelets] = useState<number[]>(() => Array.from(MODEL.solvedState));
  const [manualFacelets, setManualFacelets] = useState<number[]>(initManual);
  const [paintColor, setPaintColor] = useState(0);
  const [sourceMoves, setSourceMoves] = useState("");
  const [solution, setSolution] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Preparing 5×5 solver…");
  const [time, setTime] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const autoplay = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onAnimating = useCallback((v: boolean) => setAnimating(v), []);

  useEffect(() => {
    const id = setTimeout(() => {
      try { Cube.initSolver(); setReady(true); setStatus("Reduced 5×5 solver ready"); }
      catch { setStatus("Solver failed to initialize"); }
    }, 30);
    return () => clearTimeout(id);
  }, []);

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

  const summary = useMemo(() => {
    if (displayFacelets.includes(-1)) return null;
    const state = Uint8Array.from(displayFacelets);
    return { centers: centerProgressFast(MODEL, state), edges: edgeProgressFast(MODEL, state) };
  }, [displayFacelets]);
  const isReduced = summary != null && summary.centers === CENTER_TARGET && summary.edges === 12;

  const initialString = faceletsToString(displayFacelets.some((v) => v < 0) ? Array.from(MODEL.solvedState) : displayFacelets);
  const canShow3D = mode === "scramble" || manualComplete;

  const resetSolution = () => { setSolution([]); setStep(0); setPlaying(false); setTime(0); };

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    resetSolution();
    setStatus(next === "manual" ? "Tap a color, then tap stickers to match your cube" : "Load a reduced scramble to solve.");
  };

  const loadScramble = (moves: string[], reducedKind: boolean) => {
    const state = applyFastSeq(MODEL, MODEL.solvedState.slice(), moves);
    setCubeFacelets(Array.from(state));
    setSourceMoves(moves.join(" "));
    resetSolution();
    const centers = centerProgressFast(MODEL, state), edges = edgeProgressFast(MODEL, state);
    setStatus(reducedKind
      ? "Reduced 5×5 ready — press Solve."
      : `Full 5×5 loaded — not reduced yet (centers ${centers}/${CENTER_TARGET}, edge bars ${edges}/12). Full reduction is in development.`);
  };

  const paintCell = (slot: number) => setManualFacelets((prev) => { const n = [...prev]; n[slot] = paintColor; return n; });
  const clearManual = () => { setManualFacelets(initManual()); resetSolution(); setStatus("Entry cleared"); };

  const solve = () => {
    if (!ready) return;
    const facelets = mode === "manual" ? manualFacelets : cubeFacelets;
    if (facelets.includes(-1)) { setStatus("Fill in every sticker first"); return; }
    if (mode === "manual") {
      const counts = COLORS.map((_, i) => facelets.filter((v) => v === i).length);
      if (counts.some((c) => c !== PER_COLOR)) { setStatus(`Each color must appear ${PER_COLOR} times — check your entry`); return; }
    }
    const state = Uint8Array.from(facelets);
    const centers = centerProgressFast(MODEL, state), edges = edgeProgressFast(MODEL, state);
    if (centers !== CENTER_TARGET || edges !== 12) {
      resetSolution();
      setStatus(`This 5×5 isn't reduced yet — centers ${centers}/${CENTER_TARGET}, edge bars ${edges}/12. Full center + edge reduction is in development.`);
      return;
    }
    const start = performance.now();
    try {
      const facelet3x3 = reducedFaceletStringFast(MODEL, state);
      const parsed = Cube.fromString(facelet3x3);
      if (!isLegal3x3(parsed)) {
        resetSolution();
        setStatus("These colors don't form a solvable reduced cube — check for a swapped sticker.");
        return;
      }
      const text = parsed.solve().trim();
      const moves = text ? text.split(/\s+/) : [];
      const verified = isSolvedFast(applyFastSeq(MODEL, state, moves), MODEL);
      setSolution(moves);
      setStep(0);
      setPlaying(false);
      setTime(Math.round(performance.now() - start));
      setStatus(verified ? `Verified solution — ${moves.length} moves` : "Solved, but verification failed");
    } catch {
      setStatus("This reduced 5×5 state could not be solved.");
    }
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
      <div className="mb-3 flex items-center justify-between gap-3"><span className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">LIVE 5×5 STATE</span><span className="text-right text-xs font-bold text-[var(--green)]">{status}</span></div>
      <div className="mx-auto grid max-w-[430px] gap-[2px]" style={{ gridTemplateColumns: `repeat(${NET.cols}, minmax(0, 1fr))`, aspectRatio: `${NET.cols} / ${NET.rows}` }}>
        {Array.from({ length: NET.rows * NET.cols }, (_, i) => {
          const row = Math.floor(i / NET.cols), col = i % NET.cols;
          const cell = NET.cellAt(row, col);
          if (!cell) return <div key={i} />;
          const value = displayFacelets[cell.slot];
          const filled = value >= 0;
          const editable = mode === "manual" && !cell.isCenter;
          return <div key={i} onClick={editable ? () => paintCell(cell.slot) : undefined}
            className={`rounded-[2px] border ${filled ? "border-white/15" : "border-dashed border-white/20"} ${editable ? "cursor-pointer active:scale-95" : ""}`}
            style={{ background: filled ? COLORS[value] : "rgba(255,255,255,.03)" }} />;
        })}
      </div>
    </section>

    <section className="grid grid-cols-2 gap-3">
      <div className="glass rounded-[18px] p-4"><p className="text-xs font-extrabold tracking-[.14em] text-[var(--muted)]">CENTERS</p><p className="mt-2 text-2xl font-extrabold text-[var(--text)]">{summary ? summary.centers : "—"} / {CENTER_TARGET}</p></div>
      <div className="glass rounded-[18px] p-4"><p className="text-xs font-extrabold tracking-[.14em] text-[var(--muted)]">EDGE BARS</p><p className="mt-2 text-2xl font-extrabold text-[var(--text)]">{summary ? summary.edges : "—"} / 12</p></div>
    </section>

    {mode === "scramble" ? <>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => loadScramble(reducedScramble(), true)} disabled={animating} className="glass rounded-2xl p-4 font-extrabold disabled:opacity-50">REDUCED SCRAMBLE</button>
        <button onClick={() => loadScramble(fullScramble(), false)} disabled={animating} className="glass rounded-2xl p-4 font-extrabold disabled:opacity-50">FULL SCRAMBLE</button>
      </div>
      <button onClick={solve} disabled={!ready || animating || !isReduced} className="cta-green w-full rounded-2xl p-4 font-extrabold disabled:opacity-50">SOLVE 5×5</button>
      <section className="glass rounded-[22px] p-4"><p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">SOURCE MOVES</p><p className="mt-2 min-h-12 leading-7 text-[var(--text)] break-words">{sourceMoves || "Reduced scramble solves fully. Full scramble shows how much reduction is left."}</p></section>
    </> : <>
      <section className="glass rounded-[22px] p-4">
        <div className="mb-3 flex items-center justify-between gap-3"><span className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">TAP A COLOR, THEN TAP STICKERS</span><Link href="/cube-notation" className="text-xs font-bold text-[var(--green)]">Learn notation →</Link></div>
        <div className="grid grid-cols-6 gap-2">
          {COLORS.map((hex, i) => {
            const count = colorCounts[i];
            return <button key={hex} onClick={() => setPaintColor(i)} className={`flex flex-col items-center gap-1 rounded-xl border p-2 ${paintColor === i ? "border-[var(--green)] bg-[rgba(52,208,88,.14)]" : "border-[var(--border)] bg-black/20"}`}>
              <span className="h-8 w-full rounded-lg border border-white/15" style={{ background: hex }} />
              <span className={`text-[11px] font-extrabold ${count > PER_COLOR ? "text-[var(--gold)]" : "text-[var(--muted)]"}`}>{count}/{PER_COLOR}</span>
            </button>;
          })}
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={clearManual} disabled={animating} className="glass rounded-2xl p-4 font-extrabold disabled:opacity-50">CLEAR ENTRY</button>
        <button onClick={solve} disabled={!ready || animating || !manualComplete} className="cta-green rounded-2xl p-4 font-extrabold disabled:opacity-50">SOLVE MY CUBE</button>
      </div>
      <section className="glass rounded-[22px] p-4 text-sm leading-6 text-[var(--muted)]"><p><strong className="text-[var(--text)]">Face centers are fixed</strong> and pre-filled. This solves cubes that are already <strong className="text-[var(--text)]">reduced</strong> (centers solved, edge bars paired) — full center + edge reduction is in development, so it will tell you how far along an unreduced cube is.</p></section>
    </>}

    <section className="glass rounded-[22px] p-4">
      <div className="flex items-center justify-between"><p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">VERIFIED SOLUTION</p><span className="text-xs text-[var(--muted)]">{time ? `${time} ms` : ""}</span></div>
      <p className="mt-2 min-h-12 text-lg font-bold leading-8 tracking-wide break-words">{solution.join(" ") || "—"}</p>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{solution.map((move, i) => <button key={`${move}-${i}`} disabled={animating} onClick={() => { setPlaying(false); setStep(i + 1); }} className={`min-w-11 rounded-xl border p-3 font-extrabold disabled:opacity-50 ${i === step - 1 ? "border-[var(--green)] bg-[rgba(52,208,88,.14)]" : "border-[var(--border)] bg-black/20"}`}>{move}</button>)}</div>
      <div className="mt-4"><div className="mb-2 flex justify-between text-xs font-bold text-[var(--muted)]"><span>Progress</span><span>{step} / {solution.length}</span></div><input aria-label="Solution progress" type="range" min={0} max={Math.max(solution.length, 1)} value={step} disabled={!solution.length || animating} onChange={(e) => { setPlaying(false); setStep(Number(e.target.value)); }} className="w-full accent-[var(--green)] disabled:opacity-40" /></div>
      <div className="mt-4 grid grid-cols-3 gap-2"><button disabled={step === 0 || animating} onClick={previous} className="glass rounded-xl p-3 font-bold disabled:opacity-40">Previous</button><button disabled={!solution.length || animating} onClick={togglePlay} className="cta-green rounded-xl p-3 font-extrabold disabled:opacity-40">{playing ? "Pause" : "Play"}</button><button disabled={step >= solution.length || animating} onClick={next} className="glass rounded-xl p-3 font-bold disabled:opacity-40">Next</button></div>
      <div className="mt-3 grid grid-cols-4 gap-2">{SPEEDS.map((speed, index) => <button key={speed.label} onClick={() => setSpeedIndex(index)} className={`rounded-xl border px-2 py-2 text-sm font-extrabold ${speedIndex === index ? "border-[var(--green)] bg-[rgba(52,208,88,.14)] text-[var(--green)]" : "border-[var(--border)] bg-black/20 text-[var(--muted)]"}`}>{speed.label}</button>)}</div>
    </section>

    <section className="glass overflow-hidden rounded-[22px] p-4">
      <div className="flex items-center justify-between"><div><p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">5×5 SOLUTION PLAYBACK</p><p className="mt-1 text-sm text-[var(--muted)]">{canShow3D ? "Tap moves, scrub progress, or press Play." : "Fill in every sticker to preview your cube in 3D."}</p></div><span className="rounded-full border border-[var(--border)] bg-black/25 px-3 py-1 text-xs font-extrabold text-[var(--green)]">{step} / {solution.length}</span></div>
      <div className="cube-card relative mt-4 h-[350px] overflow-hidden rounded-[22px]"><div className="platform-ring absolute bottom-[58px] left-1/2 z-[1] h-[66px] w-[230px] -translate-x-1/2 rounded-[50%]" />{canShow3D ? <><div className="absolute inset-0 z-[2]"><NxNSolverCube3D size={SIZE} initialFacelets={initialString} solution={solution} step={step} onAnimating={onAnimating} durationMs={SPEEDS[speedIndex].duration} /></div><div className="pointer-events-none absolute bottom-4 left-1/2 z-[3] -translate-x-1/2 whitespace-nowrap text-[13px] font-semibold text-[var(--muted)]">Drag to rotate • verified playback</div></> : <div className="absolute inset-0 z-[2] grid place-items-center px-6 text-center text-sm text-[var(--faint)]">Your cube will appear here once every sticker is filled in.</div>}</div>
    </section>

    <section className="glass rounded-[22px] p-4 text-sm leading-6 text-[var(--muted)]"><b className="text-[var(--text)]">Reduced 5×5 mode:</b> a reduced cube (centers solved, edge triplets paired) is sampled to a 3×3, solved by the same engine as the 3×3 page, and verified move-for-move on the full 5×5. Full arbitrary-state reduction (building centers and pairing edges from any scramble) is the next build layer.</section>
  </div>;
}
