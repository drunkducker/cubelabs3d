"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  CORNER_FACES,
  FACE_COLORS,
  applyMoveIndex,
  applyMoves,
  dirOfMove,
  faceOfMove,
  moveLabel,
  parseMove,
  solve,
  solved,
  type KiloState,
} from "@/lib/kilominx-engine";
import { FACE_CORNERS_CCW } from "@/lib/kilominx-net-layout";
import KilominxNotationModel from "@/components/KilominxNotationModel";

const GUIDE_EVENT = "kilominx-notation-grab-face";

type SolveGuide = {
  move: number;
  label: string;
  color: string;
  remaining: number;
  clockwise: boolean;
};

function parseSequence(sequence: string) {
  return sequence.trim().split(/\s+/).filter(Boolean).flatMap(token => {
    try {
      return [parseMove(token)];
    } catch {
      return [];
    }
  });
}

function stickerFaceAt(state: KiloState, slot: number, destinationFace: number) {
  const piece = state.cp[slot]!;
  const twist = state.co[slot]!;
  const destinationSticker = CORNER_FACES[slot]!.indexOf(destinationFace);
  if (destinationSticker < 0) return destinationFace;
  return CORNER_FACES[piece]![(destinationSticker - twist + 3) % 3]!;
}

function stickerLabelAt(state: KiloState, slot: number, destinationFace: number) {
  const piece = state.cp[slot]!;
  const sourceFace = stickerFaceAt(state, slot, destinationFace);
  const sourceKite = FACE_CORNERS_CCW[sourceFace]!.indexOf(piece);
  const letter = ["A", "B", "C", "D", "E"][Math.max(0, sourceKite)] ?? "A";
  return `${sourceFace + 1}${letter}`;
}

function readModelStatus(root: HTMLElement) {
  const section = root.firstElementChild as HTMLElement | null;
  const header = section?.firstElementChild as HTMLElement | null;
  return header?.querySelector("span")?.textContent?.trim() ?? "";
}

function dispatchGuide(guide: SolveGuide | null) {
  window.dispatchEvent(new CustomEvent(GUIDE_EVENT, {
    detail: guide
      ? {
          face: faceOfMove(guide.move),
          move: guide.move,
          kite: 0,
          stickerLabel: guide.label,
          color: guide.color,
        }
      : {
          face: null,
          move: null,
          kite: null,
          stickerLabel: null,
          color: null,
        },
  }));
}

/**
 * Learn-only interaction shell.
 *
 * The additive sticker glow is presentation-only and must never become a touch
 * target. This shell also turns the glow into a live human solve guide: after a
 * scramble, the engine selects the next move, highlights a durable sticker on
 * that face, and recomputes after every turn the player performs.
 */
export default function KilominxNotationTouchGuard() {
  const modelRootRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<KiloState>(solved());
  const guideRef = useRef<SolveGuide | null>(null);
  const pendingScrambleRef = useRef<KiloState | null>(null);
  const pendingManualMoveRef = useRef<number | null>(null);
  const scrambleActiveRef = useRef(false);
  const lastScrambleRef = useRef("");
  const lastStatusRef = useRef("");
  const humanMovesRef = useRef(0);
  const [guide, setGuide] = useState<SolveGuide | null>(null);
  const [humanMoves, setHumanMoves] = useState(0);
  const [feedback, setFeedback] = useState("Tap Scramble to begin a guided solve.");

  const setActiveGuide = (nextGuide: SolveGuide | null) => {
    guideRef.current = nextGuide;
    setGuide(nextGuide);
    dispatchGuide(nextGuide);
  };

  const guideState = (state: KiloState, completedMoves: number, message?: string) => {
    const solution = solve(state);
    if (!solution.length) {
      setActiveGuide(null);
      setFeedback("Solved — scramble again or keep experimenting.");
      return;
    }

    const move = solution[0]!;
    const face = faceOfMove(move);
    const slot = FACE_CORNERS_CCW[face]![0]!;
    const stickerFace = stickerFaceAt(state, slot, face);
    const nextGuide: SolveGuide = {
      move,
      label: stickerLabelAt(state, slot, face),
      color: FACE_COLORS[stickerFace]!,
      remaining: solution.length,
      clockwise: dirOfMove(move) === 1,
    };
    setActiveGuide(nextGuide);
    setFeedback(message ?? `Find the bright dot, then follow the ${nextGuide.clockwise ? "clockwise" : "counter-clockwise"} thumb guide.`);
    humanMovesRef.current = completedMoves;
    setHumanMoves(completedMoves);
  };

  useLayoutEffect(() => {
    const originalRaycast = THREE.Sprite.prototype.raycast;

    const guardedRaycast = function (
      this: THREE.Sprite,
      raycaster: THREE.Raycaster,
      intersects: THREE.Intersection[],
    ) {
      const material = this.material;
      const isPresentationGlow =
        material instanceof THREE.SpriteMaterial &&
        material.blending === THREE.AdditiveBlending &&
        material.depthWrite === false;

      if (isPresentationGlow) return;
      originalRaycast.call(this, raycaster, intersects);
    };

    THREE.Sprite.prototype.raycast = guardedRaycast;

    const root = modelRootRef.current;
    const buttons = root ? Array.from(root.querySelectorAll<HTMLButtonElement>("button")) : [];
    const solveButton = buttons.find(button => button.textContent?.trim() === "Solve") ?? null;
    const buttonRow = solveButton?.parentElement ?? null;
    const previousDisplay = solveButton?.style.display ?? "";
    const previousColumns = buttonRow?.style.gridTemplateColumns ?? "";
    if (solveButton) solveButton.style.display = "none";
    if (buttonRow) buttonRow.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";

    return () => {
      if (THREE.Sprite.prototype.raycast === guardedRaycast) {
        THREE.Sprite.prototype.raycast = originalRaycast;
      }
      if (solveButton) solveButton.style.display = previousDisplay;
      if (buttonRow) buttonRow.style.gridTemplateColumns = previousColumns;
    };
  }, []);

  useEffect(() => {
    const root = modelRootRef.current;
    if (!root) return;

    const resetGuide = () => {
      stateRef.current = solved();
      pendingScrambleRef.current = null;
      pendingManualMoveRef.current = null;
      scrambleActiveRef.current = false;
      humanMovesRef.current = 0;
      setHumanMoves(0);
      setActiveGuide(null);
      setFeedback("Tap Scramble to begin a guided solve.");
    };

    const sync = () => {
      const scrambleText = root.querySelector<HTMLElement>("[data-puzzle-scramble]")?.textContent?.trim() ?? "";
      const status = readModelStatus(root);

      if (scrambleText !== lastScrambleRef.current) {
        lastScrambleRef.current = scrambleText;
        if (!scrambleText) {
          resetGuide();
        } else {
          const scrambleMoves = parseSequence(scrambleText);
          pendingScrambleRef.current = scrambleMoves.length ? applyMoves(solved(), scrambleMoves) : solved();
          scrambleActiveRef.current = true;
          pendingManualMoveRef.current = null;
          humanMovesRef.current = 0;
          setHumanMoves(0);
          setActiveGuide(null);
          setFeedback("Scrambling… the first bright target will appear when it stops.");
        }
      }

      if (!status || status === lastStatusRef.current) return;
      lastStatusRef.current = status;

      const turnMatch = status.match(/^Turn\s+(\d+'?)\s+from sticker/i);
      if (turnMatch) {
        try {
          pendingManualMoveRef.current = parseMove(turnMatch[1]!);
          const expected = guideRef.current?.move;
          setFeedback(expected === pendingManualMoveRef.current
            ? "Nice move — checking the next step…"
            : "That works too — recalculating a new path from here…");
        } catch {
          pendingManualMoveRef.current = null;
        }
        return;
      }

      const moveFinished = status === "Kilominx ready" || status === "Solved";
      if (!moveFinished) return;

      if (scrambleActiveRef.current && pendingScrambleRef.current) {
        stateRef.current = pendingScrambleRef.current;
        pendingScrambleRef.current = null;
        scrambleActiveRef.current = false;
        guideState(stateRef.current, 0);
        return;
      }

      if (pendingManualMoveRef.current !== null) {
        const move = pendingManualMoveRef.current;
        pendingManualMoveRef.current = null;
        stateRef.current = applyMoveIndex(stateRef.current, move);
        const completed = humanMovesRef.current + 1;
        guideState(
          stateRef.current,
          completed,
          completed >= 3
            ? "Keep playing — remaining moves are now pinned at the top."
            : "Good. Follow the new dot and thumb direction.",
        );
      }
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      dispatchGuide(null);
    };
  }, []);

  const remainingLabel = guide
    ? `${guide.remaining} move${guide.remaining === 1 ? "" : "s"} to completion`
    : "";

  return (
    <div className="relative" data-kilominx-learn-guide>
      <div ref={modelRootRef}>
        <KilominxNotationModel />
      </div>

      {guide && humanMoves >= 3 ? (
        <div className="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-full border border-white/20 bg-black/80 px-4 py-2 text-xs font-black tracking-[.08em] text-white shadow-[0_0_24px_rgba(0,0,0,.65)] backdrop-blur">
          {remainingLabel}
        </div>
      ) : null}

      {guide ? (
        <div
          className={`pointer-events-none absolute top-[46%] z-30 flex w-[108px] -translate-y-1/2 flex-col items-center rounded-2xl border border-white/20 bg-black/78 px-3 py-3 text-center shadow-[0_18px_38px_rgba(0,0,0,.6)] backdrop-blur ${guide.clockwise ? "right-2" : "left-2"}`}
          aria-hidden="true"
        >
          <span className="text-[10px] font-black uppercase tracking-[.16em] text-white/65">Slide thumb</span>
          <span className="mt-1 animate-pulse text-5xl font-black leading-none" style={{ color: guide.color }}>
            {guide.clockwise ? "↻" : "↺"}
          </span>
          <span className="mt-1 text-sm font-black text-white">{moveLabel(guide.move)}</span>
          {humanMoves < 3 ? <span className="mt-2 text-[10px] font-bold leading-4 text-white/70">{remainingLabel}</span> : null}
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-[76px] left-1/2 z-30 w-[min(88%,340px)] -translate-x-1/2 rounded-full border border-white/10 bg-black/65 px-4 py-2 text-center text-xs font-bold text-white/75 backdrop-blur">
        {feedback}
      </div>
    </div>
  );
}
