"use client";

/**
 * Skewb rev3 — a fully standalone Skewb experience.
 *
 * Own engine (lib/skewb3-engine), own 3D renderer (SkewbRev3Cube), styled with
 * the shared Cube Labs design system so it sits alongside the other solvers.
 * Twist by swiping a corner; the optimal solver returns a shortest (≤11-move)
 * solution which is verified before it plays back one twist at a time.
 */
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  solved, applyMove, isSolved, invertMove, solve, verifySolution,
  randomScramble, formatMoves,
  type Move, type MoveAxis, type SkewbState,
} from "@/lib/skewb3-engine";
import type { Anim } from "./SkewbRev3Cube";

const Cube = dynamic(() => import("./SkewbRev3Cube"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-[var(--faint)]">Loading Skewb…</div>,
});

const fmtTime = (ms: number) => {
  const s = ms / 1000;
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, "0")}`;
};

export default function SkewbRev3() {
  const [state, setState] = useState<SkewbState>(solved);
  const [queue, setQueue] = useState<Move[]>([]);
  const [anim, setAnim] = useState<Anim>(null);
  const [status, setStatus] = useState("Swipe a corner to twist, or scramble to begin.");
  const [userMoves, setUserMoves] = useState(0);
  const [assisted, setAssisted] = useState(false);
  const [scrambleText, setScrambleText] = useState("");
  const [solutionText, setSolutionText] = useState("");
  const [elapsed, setElapsed] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef<number | null>(null);
  const playingBack = useRef(false);
  const historyRef = useRef<Move[]>([]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);
  const startTimer = useCallback(() => {
    stopTimer();
    startedAt.current = Date.now();
    timerRef.current = setInterval(() => { if (startedAt.current) setElapsed(Date.now() - startedAt.current); }, 50);
  }, [stopTimer]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  // drive the animation queue: one twist at a time
  useEffect(() => {
    if (anim || queue.length === 0) return;
    const move = queue[0];
    setAnim({
      axis: move.axis,
      dir: move.dir,
      onDone: () => {
        setState((s) => applyMove(s, move));
        setQueue((q) => q.slice(1));
        setAnim(null);
      },
    });
  }, [anim, queue]);

  // solved detection
  useEffect(() => {
    if (queue.length === 0 && !anim && isSolved(state) && (userMoves > 0 || assisted) && startedAt.current !== null) {
      stopTimer();
      const finalMs = Date.now() - startedAt.current;
      setElapsed(finalMs);
      startedAt.current = null;
      playingBack.current = false;
      setStatus(assisted ? "Solved by the app 🎉" : `Solved! ${userMoves} moves · ${fmtTime(finalMs)} 🎉`);
    }
  }, [state, queue.length, anim, userMoves, assisted, stopTimer]);

  const busy = anim !== null || queue.length > 0;
  const enqueue = (moves: Move[]) => setQueue((q) => [...q, ...moves]);

  const twist = useCallback((axis: MoveAxis, dir: 1 | -1) => {
    if (playingBack.current) return;
    if (startedAt.current === null) startTimer();
    setUserMoves((n) => n + 1);
    setAssisted(false);
    setSolutionText("");
    setStatus("Nice — keep going.");
    historyRef.current.push({ axis, dir });
    enqueue([{ axis, dir }]);
  }, [startTimer]);

  const scramble = () => {
    if (busy) return;
    stopTimer(); startedAt.current = null; setElapsed(0);
    const moves = randomScramble(12);
    setState(solved());
    historyRef.current = [];
    setUserMoves(0); setAssisted(false); setSolutionText("");
    setScrambleText(formatMoves(moves));
    setStatus("Scrambling…");
    playingBack.current = true;
    enqueue(moves);
    setTimeout(() => { playingBack.current = false; setStatus("Your turn — swipe to solve, or tap Solve."); }, moves.length * 360 + 220);
  };

  const solveIt = () => {
    if (busy) return;
    if (isSolved(state)) { setStatus("Already solved."); return; }
    let solution: Move[];
    try { solution = solve(state); } catch { setStatus("Couldn't find a solution."); return; }
    if (!verifySolution(state, solution)) { setStatus("Unverified solution — aborting."); return; }
    setSolutionText(formatMoves(solution));
    setAssisted(true);
    if (startedAt.current === null) startTimer();
    setStatus(`Solving in ${solution.length} moves…`);
    playingBack.current = true;
    enqueue(solution);
  };

  const undo = () => {
    if (busy || playingBack.current) return;
    const last = historyRef.current.pop();
    if (!last) return;
    setUserMoves((n) => n + 1);
    setStatus("Undo");
    enqueue([invertMove(last)]);
  };

  const reset = () => {
    stopTimer(); startedAt.current = null;
    setState(solved()); setQueue([]); setAnim(null); historyRef.current = [];
    setUserMoves(0); setAssisted(false); setScrambleText(""); setSolutionText(""); setElapsed(0);
    setStatus("Reset. Swipe a corner to twist, or scramble.");
  };

  const solvedNow = isSolved(state) && !busy;

  const statCard = (label: string, value: string, good = false) => (
    <div className={`glass rounded-[18px] p-4 ${good ? "border-[rgba(52,208,88,.5)]" : ""}`}>
      <p className="text-xs font-extrabold tracking-[.14em] text-[var(--muted)]">{label}</p>
      <p className={`mt-2 text-2xl font-extrabold tabular-nums ${good ? "text-[var(--leaf)]" : "text-[var(--text)]"}`}>{value}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <section className="glass rounded-[22px] p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">LIVE SKEWB</span>
          <span className="text-right text-xs font-bold text-[var(--green)]">{status}</span>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        {statCard("TIME", fmtTime(elapsed))}
        {statCard("MOVES", String(userMoves))}
        {statCard("STATE", solvedNow ? "SOLVED" : busy ? "…" : "MIXED", solvedNow)}
      </section>

      <section className="glass overflow-hidden rounded-[22px] p-4">
        <div className="cube-card relative h-[350px] overflow-hidden rounded-[22px]">
          <div className="platform-ring absolute bottom-[52px] left-1/2 z-[1] h-[64px] w-[220px] -translate-x-1/2 rounded-[50%]" />
          <div className="absolute inset-0 z-[2]"><Cube state={state} anim={anim} onTwist={twist} /></div>
          <div className="pointer-events-none absolute bottom-3 left-1/2 z-[3] -translate-x-1/2 whitespace-nowrap text-[13px] font-semibold text-[var(--muted)]">Drag to orbit • swipe a corner to twist</div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={scramble} disabled={busy} className="cta-purple rounded-2xl p-4 font-extrabold disabled:opacity-50">SCRAMBLE</button>
        <button onClick={solveIt} disabled={busy || solvedNow} className="cta-green rounded-2xl p-4 font-extrabold disabled:opacity-50">{anim || queue.length ? "SOLVING…" : "SOLVE"}</button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={undo} disabled={busy || historyRef.current.length === 0} className="glass rounded-2xl p-4 font-extrabold disabled:opacity-50">UNDO</button>
        <button onClick={reset} disabled={busy} className="glass rounded-2xl p-4 font-extrabold disabled:opacity-50">RESET</button>
      </div>

      {(scrambleText || solutionText) && (
        <section className="glass rounded-[22px] p-4 space-y-3">
          {scrambleText && <div><p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">SCRAMBLE</p><p className="mt-1 text-[15px] font-bold tracking-wide text-[var(--text)] break-words">{scrambleText}</p></div>}
          {solutionText && <div><p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">SOLUTION</p><p className="mt-1 text-[15px] font-bold tracking-wide text-[var(--text)] break-words">{solutionText}</p></div>}
        </section>
      )}

      <section className="glass rounded-[22px] p-4 text-sm leading-6 text-[var(--muted)]">
        <b className="text-[var(--text)]">Standalone build:</b> own engine, 3D renderer, and design. Swipe any of the four turnable corners to twist; the solver returns a shortest (≤11-move) solution and verifies it move-for-move on the real cube before playback.
      </section>
    </div>
  );
}
