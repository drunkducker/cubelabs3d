"use client";

/**
 * Skewb rev3 — a fully standalone Skewb experience.
 *
 * Own engine (lib/skewb3-engine), own 3D renderer (SkewbRev3Cube), own design.
 * Nothing here is shared with rev1/rev2. Moves flow through a small animation
 * queue so scrambles and solutions play back one twist at a time; the optimal
 * solver returns a shortest (≤11 move) solution which is verified before it is
 * shown.
 */
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  solved, applyMove, isSolved, invertMove, solve, verifySolution,
  randomScramble, formatMoves, MOVE_AXES,
  type Move, type MoveAxis, type SkewbState,
} from "@/lib/skewb3-engine";
import type { Anim } from "./SkewbRev3Cube";
import styles from "./SkewbRev3.module.css";

const Cube = dynamic(() => import("./SkewbRev3Cube"), {
  ssr: false,
  loading: () => <div className={styles.cubeLoading}>Loading Skewb…</div>,
});

const fmtTime = (ms: number) => {
  const s = ms / 1000;
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, "0")}`;
};

export default function SkewbRev3() {
  const [state, setState] = useState<SkewbState>(solved);
  const [queue, setQueue] = useState<Move[]>([]);
  const [anim, setAnim] = useState<Anim>(null);
  const [status, setStatus] = useState("Scramble to begin, or twist a corner.");
  const [userMoves, setUserMoves] = useState(0);
  const [assisted, setAssisted] = useState(false);
  const [scrambleText, setScrambleText] = useState("");
  const [solutionText, setSolutionText] = useState("");
  const [elapsed, setElapsed] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef<number | null>(null);
  const playingBack = useRef(false); // true while a scramble/solution auto-plays

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

  // detect solved
  useEffect(() => {
    if (queue.length === 0 && !anim && isSolved(state) && (userMoves > 0 || assisted) && startedAt.current !== null) {
      stopTimer();
      const finalMs = Date.now() - (startedAt.current ?? Date.now());
      setElapsed(finalMs);
      startedAt.current = null;
      playingBack.current = false;
      setStatus(assisted ? `Solved by the app in ${solutionText ? solutionText.split(" ").length : 0} moves.` : `Solved! ${userMoves} moves · ${fmtTime(finalMs)} 🎉`);
    }
  }, [state, queue.length, anim, userMoves, assisted, solutionText, stopTimer]);

  const busy = anim !== null || queue.length > 0;

  const enqueue = (moves: Move[]) => setQueue((q) => [...q, ...moves]);

  const twist = (axis: MoveAxis, dir: 1 | -1) => {
    if (playingBack.current) return;
    if (startedAt.current === null && !isSolved(state)) startTimer();
    else if (startedAt.current === null) startTimer();
    setUserMoves((n) => n + 1);
    setAssisted(false);
    setSolutionText("");
    setStatus("Nice — keep going.");
    enqueue([{ axis, dir }]);
  };

  const onGrab = useCallback((axis: MoveAxis, e: { shiftKey?: boolean }) => {
    twist(axis, e?.shiftKey ? -1 : 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, queue, anim]);

  const scramble = () => {
    if (busy) return;
    stopTimer(); startedAt.current = null; setElapsed(0);
    const moves = randomScramble(12);
    setState(solved());
    setUserMoves(0);
    setAssisted(false);
    setSolutionText("");
    setScrambleText(formatMoves(moves));
    setStatus("Scrambling…");
    playingBack.current = true;
    enqueue(moves);
    // playback flag clears when the user next twists or on solve; also clear when queue drains
    setTimeout(() => { playingBack.current = false; setStatus("Your turn — solve it, or tap Solve."); }, moves.length * 360 + 200);
  };

  const solveIt = () => {
    if (busy) return;
    if (isSolved(state)) { setStatus("Already solved."); return; }
    let solution: Move[];
    try { solution = solve(state); } catch { setStatus("Couldn't find a solution."); return; }
    if (!verifySolution(state, solution)) { setStatus("Solver produced an unverified solution — aborting."); return; }
    setSolutionText(formatMoves(solution));
    setAssisted(true);
    if (startedAt.current === null) startTimer();
    setStatus(`Solving in ${solution.length} moves…`);
    playingBack.current = true;
    enqueue(solution);
  };

  const reset = () => {
    stopTimer(); startedAt.current = null;
    setState(solved()); setQueue([]); setAnim(null);
    setUserMoves(0); setAssisted(false); setScrambleText(""); setSolutionText(""); setElapsed(0);
    setStatus("Reset. Scramble to begin, or twist a corner.");
  };

  const solvedNow = useMemo(() => isSolved(state) && !busy, [state, busy]);

  return (
    <div className={styles.root}>
      <div className={styles.aurora} aria-hidden />
      <header className={styles.header}>
        <Link href="/solve" className={styles.back} aria-label="All solvers">←</Link>
        <div className={styles.title}>
          <span className={styles.kicker}>CUBE LABS · STANDALONE</span>
          <h1>SKEWB <span className={styles.rev}>rev3</span></h1>
        </div>
        <div className={styles.headerLinks}>
          <Link href="/solver/skewb" className={styles.ghostLink}>rev2</Link>
          <Link href="/solver/skewb/rev1" className={styles.ghostLink}>rev1</Link>
        </div>
      </header>

      <section className={styles.stats}>
        <div className={styles.stat}><span>TIME</span><strong>{fmtTime(elapsed)}</strong></div>
        <div className={styles.stat}><span>MOVES</span><strong>{userMoves}</strong></div>
        <div className={`${styles.stat} ${solvedNow ? styles.good : ""}`}><span>STATE</span><strong>{solvedNow ? "SOLVED" : busy ? "…" : "MIXED"}</strong></div>
      </section>

      <div className={styles.stageWrap}>
        <div className={styles.stage}>
          <Cube state={state} anim={anim} onGrab={onGrab} />
          <div className={styles.hint}>Drag to orbit · tap a top corner to twist (⇧ for reverse)</div>
        </div>
        <p className={styles.status}>{status}</p>
      </div>

      <section className={styles.pad} aria-label="Twist controls">
        {MOVE_AXES.map((axis) => (
          <div key={axis} className={styles.padCol}>
            <button className={styles.padBtn} disabled={busy} onClick={() => twist(axis, 1)}>{axis}</button>
            <button className={`${styles.padBtn} ${styles.prime}`} disabled={busy} onClick={() => twist(axis, -1)}>{axis}′</button>
          </div>
        ))}
      </section>

      <section className={styles.actions}>
        <button className={`${styles.action} ${styles.primary}`} disabled={busy} onClick={scramble}>SCRAMBLE</button>
        <button className={`${styles.action} ${styles.accent}`} disabled={busy || solvedNow} onClick={solveIt}>SOLVE</button>
        <button className={styles.action} disabled={busy} onClick={reset}>RESET</button>
      </section>

      {(scrambleText || solutionText) && (
        <section className={styles.readouts}>
          {scrambleText && <div><span>SCRAMBLE</span><code>{scrambleText}</code></div>}
          {solutionText && <div><span>SOLUTION</span><code>{solutionText}</code></div>}
        </section>
      )}

      <footer className={styles.footer}>
        Independent build — own engine, renderer, and design. The solver returns a shortest
        (≤11-move) solution and verifies it before playback.
      </footer>
    </div>
  );
}
