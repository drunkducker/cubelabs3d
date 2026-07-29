"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NotationCube3D, { type NotationCube3DHandle } from "@/components/notation/NotationCube3D";
import NotationNetLive from "@/components/notation/NotationNetLive";
import {
  applyMove,
  applySequence,
  isSolved,
  randomScramble,
  solved,
  toFacelets,
  tokenize,
  type CubeState,
} from "@/lib/cube-engine";
import {
  FACE_COLORS,
  FACE_NAMES,
  faceOfToken,
  inverseSequence,
  inverseToken,
  simplify,
  toQuarterTurns,
  turnsOf,
  type Face,
} from "@/lib/cube-notation";

const SCRAMBLE_LENGTH = 18;

const dirOfToken = (token: string): "cw" | "ccw" => (turnsOf(token) === 3 ? "ccw" : "cw");
const dirWords = (dir: "cw" | "ccw") => (dir === "ccw" ? "counter-clockwise" : "clockwise");

/**
 * 3×3 Notation Lab — the Learn page's interactive trainer.
 *
 * This component is the single source of truth. It holds one CubeState. The 3D
 * cube reports each committed face turn; this component applies it to the state,
 * recomputes the guided "route back to solved", and passes the resulting facelet
 * colours + active guide down to the flat net. The 3D cube and flat net are two
 * renderings of the same state, so they cannot drift — no DOM scraping, no
 * MutationObserver, no second engine, which is the main improvement over the
 * Kilominx notation beta.
 */
export default function CubeNotationLab() {
  const cubeRef = useRef<NotationCube3DHandle>(null);

  const stateRef = useRef<CubeState>(solved());
  const routeRef = useRef<string[]>([]);
  const humanRef = useRef(0);

  const [facelets, setFacelets] = useState<number[]>(() => toFacelets(solved()));
  const [route, setRoute] = useState<string[]>([]);
  const [humanMoves, setHumanMoves] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Swipe a sticker to turn • tap to identify");
  const [scrambleText, setScrambleText] = useState("");
  const [feedback, setFeedback] = useState("Tap Scramble to load a puzzle and follow the glowing target home.");
  const [solvedNow, setSolvedNow] = useState(true);

  const guideToken = route[0] ?? null;
  const guideFace: Face | null = guideToken ? faceOfToken(guideToken) : null;
  const guideDir = guideToken ? dirOfToken(guideToken) : null;

  const commit = useCallback((state: CubeState, nextRoute: string[]) => {
    stateRef.current = state;
    routeRef.current = nextRoute;
    setFacelets(toFacelets(state));
    setRoute(nextRoute);
    setSolvedNow(isSolved(state));
  }, []);

  // Drive the 3D flick guide from the shared route (declarative: guide == route[0]).
  useEffect(() => {
    cubeRef.current?.setGuide(solvedNow ? null : guideToken);
  }, [guideToken, solvedNow]);

  const handleCommit = useCallback(
    (token: string) => {
      const previousRoute = routeRef.current;
      const followed = previousRoute[0] === token;
      const nextState = applyMove(stateRef.current, token);
      const nextRoute = followed
        ? previousRoute.slice(1)
        : toQuarterTurns(simplify([inverseToken(token), ...previousRoute]));
      const nowSolved = isSolved(nextState);
      const completed = humanRef.current + 1;
      humanRef.current = completed;
      setHumanMoves(completed);
      commit(nextState, nextRoute);
      // Non-solved feedback comes from the swipe grade (onSwipeGrade); only the
      // terminal "solved" message overrides it here.
      if (nowSolved) setFeedback("Solved! Every sticker is home. Scramble again to keep practising.");
    },
    [commit],
  );

  const [gradeQuality, setGradeQuality] = useState<"great" | "ok" | "off" | null>(null);
  const handleSwipeGrade = useCallback((grade: { text: string; quality: "great" | "ok" | "off" }) => {
    setFeedback(grade.text);
    setGradeQuality(grade.quality);
  }, []);

  const scramble = useCallback(() => {
    if (cubeRef.current?.isBusy()) return;
    const tokens = tokenize(randomScramble(SCRAMBLE_LENGTH));
    const nextState = applySequence(solved(), tokens.join(" "));
    const nextRoute = toQuarterTurns(simplify(inverseSequence(tokens)));
    humanRef.current = 0;
    setHumanMoves(0);
    setGradeQuality(null);
    setScrambleText(tokens.join(" "));
    setFeedback("Touch the glowing sticker and flick along the arrow — that's the real play gesture.");
    commit(nextState, nextRoute);
    cubeRef.current?.reset();
    cubeRef.current?.playMoves(tokens, { fast: true });
  }, [commit]);

  const solveNow = useCallback(() => {
    if (cubeRef.current?.isBusy()) return;
    const tokens = routeRef.current;
    if (tokens.length === 0) return;
    cubeRef.current?.playMoves(tokens);
    commit(solved(), []);
    setScrambleText("");
    setGradeQuality(null);
    setFeedback(`Played the ${tokens.length}-move guided route back to solved.`);
  }, [commit]);

  const reset = useCallback(() => {
    if (cubeRef.current?.isBusy()) return;
    cubeRef.current?.reset();
    humanRef.current = 0;
    setHumanMoves(0);
    setScrambleText("");
    setGradeQuality(null);
    setFeedback("Back to solved. Tap a sticker to read its face, or scramble to start a guided solve.");
    commit(solved(), []);
  }, [commit]);

  const remaining = route.length;
  const guideColor = guideFace ? FACE_COLORS[guideFace] : undefined;

  const guideCard = useMemo(() => {
    if (solvedNow || !guideFace || !guideToken) return null;
    return (
      <div
        className="pointer-events-none absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-white/20 bg-black/80 px-4 py-2 shadow-[0_18px_38px_rgba(0,0,0,.6)] backdrop-blur"
        aria-hidden="true"
      >
        <span
          className="grid h-9 w-9 place-items-center rounded-lg text-lg font-black text-white"
          style={{ background: guideColor }}
        >
          {guideToken}
        </span>
        <span className="text-left">
          <span className="block text-[13px] font-black text-white">Flick the glowing sticker</span>
          <span className="block text-[11px] font-bold uppercase tracking-[.1em] text-white/65">
            {FACE_NAMES[guideFace]} · {dirWords(guideDir ?? "cw")}
          </span>
        </span>
      </div>
    );
  }, [solvedNow, guideFace, guideToken, guideDir, guideColor]);

  const feedbackColor =
    gradeQuality === "great" ? "var(--green)" : gradeQuality === "off" ? "#ff8f6a" : gradeQuality === "ok" ? "var(--blue)" : undefined;

  return (
    <div className="space-y-3">
      <section className="cube-card relative h-[min(58dvh,500px)] min-h-[390px] overflow-hidden rounded-[22px]">
        {!guideCard && (
          <div className="absolute left-3 top-3 z-[4] rounded-[11px] border border-[var(--border)] bg-black/35 px-3 py-1.5 text-xs font-bold text-[var(--muted)]">
            EXPLAINER CUBE
          </div>
        )}
        {guideCard}
        <NotationCube3D ref={cubeRef} onCommit={handleCommit} onStatus={setStatus} onBusyChange={setBusy} onSwipeGrade={handleSwipeGrade} />
      </section>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={scramble}
          className="cta-purple min-h-11 rounded-xl text-sm font-extrabold text-white disabled:opacity-40"
        >
          Scramble
        </button>
        <button
          type="button"
          disabled={busy || solvedNow}
          onClick={solveNow}
          className="cta-green min-h-11 rounded-xl text-sm font-extrabold disabled:opacity-40"
        >
          Solve route
        </button>
        <button
          type="button"
          disabled={busy || solvedNow}
          onClick={reset}
          className="glass min-h-11 rounded-xl text-sm font-extrabold text-[var(--text)] disabled:opacity-40"
        >
          Reset
        </button>
      </div>

      <div className="glass flex items-center justify-between gap-3 rounded-[14px] px-4 py-3 text-sm">
        <span className="font-semibold text-[var(--muted)]">{status}</span>
        <span className="font-extrabold text-[var(--text)]">
          {solvedNow ? "Solved" : `${remaining} move${remaining === 1 ? "" : "s"} left`}
        </span>
      </div>

      <section className="glass rounded-[22px] p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">LIVE FLAT NET</p>
          {humanMoves > 0 && <span className="text-xs font-bold text-[var(--muted)]">{humanMoves} human move{humanMoves === 1 ? "" : "s"}</span>}
        </div>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
          The unfolded cube mirrors the 3D state exactly — it renders from the same puzzle state, not a copy. The ringed
          centre marks the same next move.
        </p>
        <div className="mt-3">
          <NotationNetLive facelets={facelets} guideFace={solvedNow ? null : guideFace} guideDir={guideDir} />
        </div>
        <p
          className="mt-3 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-center text-xs font-bold"
          style={{ color: feedbackColor ?? "rgba(255,255,255,.75)" }}
        >
          {feedback}
        </p>
      </section>

      {scrambleText && (
        <section className="glass rounded-[18px] p-4">
          <p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">SCRAMBLE</p>
          <p className="mt-2 break-words font-mono text-sm leading-6 text-[var(--text)]">{scrambleText}</p>
          {route.length > 0 && (
            <>
              <p className="mt-3 text-xs font-extrabold tracking-[.16em] text-[var(--green)]">GUIDED ROUTE</p>
              <p className="mt-2 break-words font-mono text-sm leading-6 text-[var(--text)]">{route.join(" ")}</p>
            </>
          )}
        </section>
      )}
    </div>
  );
}
