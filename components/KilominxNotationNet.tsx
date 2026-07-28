"use client";

import { useEffect, useRef, useState } from "react";
import {
  CORNER_FACES,
  FACE_COLORS,
  applyMoveIndex,
  applyMoves,
  faceOfMove,
  inverseMoveIndex,
  inverseSequence,
  isSolved,
  moveLabel,
  parseMove,
  simplify,
  solved,
  type KiloState,
} from "@/lib/kilominx-engine";
import { FACE_CORNERS_CCW, kilominxNet } from "@/lib/kilominx-net-layout";

const NET = kilominxNet();
const LETTERS = ["A", "B", "C", "D", "E"] as const;

function kitePoints(quad: readonly [number, number][], shrink = 0.9) {
  const cx = quad.reduce((sum, point) => sum + point[0], 0) / quad.length;
  const cy = quad.reduce((sum, point) => sum + point[1], 0) / quad.length;
  return quad.map(([x, y]) => `${cx + (x - cx) * shrink},${cy + (y - cy) * shrink}`).join(" ");
}

function kiteCenter(quad: readonly [number, number][]) {
  return [
    quad.reduce((sum, point) => sum + point[0], 0) / quad.length,
    quad.reduce((sum, point) => sum + point[1], 0) / quad.length,
  ] as const;
}

function readableText(color: string) {
  return color === "#f5f5f5" || color === "#ffd500" || color === "#59a7ff" || color === "#8fe36b" || color === "#9aa3ad" ? "#0b0d12" : "#ffffff";
}

function readSequenceSection(labelText: "SCRAMBLE") {
  const labels = Array.from(document.querySelectorAll<HTMLElement>("p,span,h2,h3"));
  const label = labels.find(node => node.textContent?.trim().toUpperCase() === labelText);
  const section = label?.closest("section");
  if (!section) return "";
  const text = Array.from(section.querySelectorAll("p"))
    .filter(node => node !== label)
    .map(node => node.textContent?.trim() ?? "")
    .find(Boolean) ?? "";
  if (!text || /tap .*scramble|already solved|loading/i.test(text)) return "";
  const tokens = text.split(/\s+/).filter(Boolean);
  try { tokens.forEach(parseMove); return tokens.join(" "); } catch { return ""; }
}

function parseSequence(sequence: string) {
  return sequence.trim().split(/\s+/).filter(Boolean).flatMap(token => {
    try { return [parseMove(token)]; } catch { return []; }
  });
}

function readModelStatus() {
  const anchor = document.querySelector<HTMLElement>("[data-kilominx-direction-anchor]");
  const model = anchor?.closest("section");
  const header = model?.firstElementChild;
  return header?.querySelector("span")?.textContent?.trim() ?? "";
}

function committedMoveFromStatus(status: string) {
  const match = status.match(/^Turn\s+(.+?)\s+from sticker\b/i);
  if (!match?.[1]) return null;
  try { return parseMove(match[1]); } catch { return null; }
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
  return `${sourceFace + 1}${LETTERS[Math.max(0, sourceKite)]}`;
}

export default function KilominxNotationNet() {
  const [puzzleState, setPuzzleState] = useState<KiloState>(() => solved());
  const [guidedRoute, setGuidedRoute] = useState<number[]>([]);
  const importedScramble = useRef("");
  const observedStatus = useRef("");
  const stateRef = useRef<KiloState>(solved());
  const routeRef = useRef<number[]>([]);
  const pendingScrambleState = useRef<KiloState | null>(null);
  const pendingScrambleRoute = useRef<number[]>([]);
  const pendingMove = useRef<number | null>(null);
  const scrambleActive = useRef(false);

  const commitSnapshot = (state: KiloState, route: number[]) => {
    stateRef.current = state;
    routeRef.current = route;
    setPuzzleState(state);
    setGuidedRoute(route);
  };

  const activeMove = guidedRoute[0];
  const activeFace = activeMove === undefined ? null : faceOfMove(activeMove);
  const activeKite = 0;
  const activeNetKite = activeFace === null
    ? null
    : NET.kites.find(kite => kite.face === activeFace && kite.kite === activeKite) ?? null;
  const activeStickerFace = activeNetKite ? stickerFaceAt(puzzleState, activeNetKite.slot, activeNetKite.face) : null;
  const activeStickerColor = activeStickerFace === null ? null : FACE_COLORS[activeStickerFace]!;
  const activeStickerLabel = activeNetKite ? stickerLabelAt(puzzleState, activeNetKite.slot, activeNetKite.face) : null;
  const solvedNow = isSolved(puzzleState);

  useEffect(() => {
    const syncFromModel = () => {
      const scramble = readSequenceSection("SCRAMBLE");
      if (scramble !== importedScramble.current) {
        importedScramble.current = scramble;
        if (!scramble) {
          pendingScrambleState.current = null;
          pendingScrambleRoute.current = [];
          pendingMove.current = null;
          scrambleActive.current = false;
          commitSnapshot(solved(), []);
        } else {
          const scrambleMoves = parseSequence(scramble);
          pendingScrambleState.current = scrambleMoves.length ? applyMoves(solved(), scrambleMoves) : solved();
          pendingScrambleRoute.current = simplify(inverseSequence(scrambleMoves));
          pendingMove.current = null;
          scrambleActive.current = true;
          setGuidedRoute([]);
        }
      }

      const status = readModelStatus();
      if (!status || status === observedStatus.current) return;
      observedStatus.current = status;

      const committedMove = committedMoveFromStatus(status);
      if (committedMove !== null) {
        pendingMove.current = committedMove;
        return;
      }

      const moveFinished = status === "Kilominx ready" || status === "Solved";
      if (!moveFinished) return;

      if (scrambleActive.current && pendingScrambleState.current) {
        commitSnapshot(pendingScrambleState.current, pendingScrambleRoute.current);
        pendingScrambleState.current = null;
        pendingScrambleRoute.current = [];
        scrambleActive.current = false;
        return;
      }

      if (pendingMove.current !== null) {
        const move = pendingMove.current;
        pendingMove.current = null;
        const previousRoute = routeRef.current;
        const followedGuide = previousRoute[0] === move;
        const nextState = applyMoveIndex(stateRef.current, move);
        const nextRoute = followedGuide
          ? previousRoute.slice(1)
          : simplify([inverseMoveIndex(move), ...previousRoute]);
        commitSnapshot(nextState, nextRoute);
      }
    };

    syncFromModel();
    const observer = new MutationObserver(syncFromModel);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  return (
    <section className="kilominx-print-surface rounded-[22px] border border-[var(--border)] bg-[rgba(255,255,255,.045)] p-4 shadow-[0_18px_40px_rgba(0,0,0,.42)] print:border-0 print:bg-white print:p-0 print:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[var(--green)]">Shared guided route</p>
          <h2 className="mt-1 text-2xl font-extrabold text-white">Same plan as the 3D guide</h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--muted)]">The flower no longer runs a second solver. It mirrors the same stable route, move, and remaining count shown above.</p>
        </div>
        <button type="button" onClick={() => window.print()} className="rounded-xl border border-[var(--border)] bg-black/25 px-4 py-2 text-sm font-extrabold text-white">Print current state</button>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold print:hidden">
        <span className="text-[var(--muted)]">NEXT TWIST</span>
        <span style={{ color: activeStickerColor ?? undefined }}>
          {solvedNow ? "Solved" : activeMove === undefined ? "Scrambling…" : `${moveLabel(activeMove)} · face ${(activeFace ?? 0) + 1}`}
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] print:block">
        <svg viewBox={`0 0 ${NET.width} ${NET.height}`} className="mx-auto block w-full max-w-[560px] overflow-visible print:max-w-none" role="img" aria-label="Live labeled Kilominx human solve guide">
          {NET.kites.map(kite => {
            const stickerFace = stickerFaceAt(puzzleState, kite.slot, kite.face);
            const color = FACE_COLORS[stickerFace]!;
            const label = stickerLabelAt(puzzleState, kite.slot, kite.face);
            const active = activeNetKite?.face === kite.face && activeNetKite?.kite === kite.kite;
            const [cx, cy] = kiteCenter(kite.quad);
            return <g key={`${kite.face}-${kite.kite}`} className="print:cursor-default">
              <polygon
                points={kitePoints(kite.quad, 0.9)}
                fill={color}
                fillOpacity={active ? 1 : 0.9}
                stroke={active ? "#ffffff" : "#0b0d12"}
                strokeWidth={active ? 0.1 : 0.035}
                strokeLinejoin="round"
                style={active ? { filter: `drop-shadow(0 0 0.14px ${color}) drop-shadow(0 0 0.3px ${color})` } : undefined}
              />
              {active ? <circle cx={cx} cy={cy} r={0.075} fill="#ffffff" stroke="#0b0d12" strokeWidth={0.018} /> : null}
              <text x={cx} y={cy + 0.045} fontSize={active ? 0.13 : 0.115} fontWeight={900} fill={active ? "#0b0d12" : readableText(color)} textAnchor="middle" paintOrder="stroke" stroke={active ? "rgba(255,255,255,.75)" : readableText(color) === "#ffffff" ? "rgba(0,0,0,.45)" : "rgba(255,255,255,.38)"} strokeWidth={0.018}>{label}</text>
            </g>;
          })}
          {NET.faceCenters.map(center => {
            const color = FACE_COLORS[center.face];
            return <g key={center.face} className="print:cursor-default">
              <circle cx={center.at[0]} cy={center.at[1]} r={0.19} fill={color} stroke="#0b0d12" strokeWidth={0.025} />
              <text x={center.at[0]} y={center.at[1] + 0.058} fontSize={0.16} fontWeight={900} fill={readableText(color)} textAnchor="middle">{center.face + 1}</text>
            </g>;
          })}
        </svg>

        <div className="space-y-3 print:hidden">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4" style={{ boxShadow: activeStickerColor ? `inset 0 0 28px ${activeStickerColor}22` : undefined }}>
            <p className="text-xs font-extrabold uppercase tracking-[.16em]" style={{ color: activeStickerColor ?? undefined }}>Do this next</p>
            <p className="mt-2 text-3xl font-black text-white">{solvedNow ? "Solved" : activeMove === undefined ? "Wait" : moveLabel(activeMove)}</p>
            <p className="mt-1 text-sm font-bold" style={{ color: activeStickerColor ?? undefined }}>{solvedNow ? "No twist needed" : activeMove === undefined ? "Scramble in progress" : `Turn face ${(activeFace ?? 0) + 1}`}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">This is the same next move and the same remaining route as the 3D guide above.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[var(--muted)]">Current guided route</p>
            <p className="mt-2 break-words font-mono text-sm leading-6 text-white">{guidedRoute.length ? guidedRoute.map(moveLabel).join(" ") : solvedNow ? "Puzzle solved" : "Waiting for scramble"}</p>
            <p className="mt-2 text-xs font-bold text-[var(--muted)]">{guidedRoute.length} guided move{guidedRoute.length === 1 ? "" : "s"} remaining</p>
          </div>
        </div>
      </div>

      <div className="hidden print:block print:pt-4 print:text-center print:text-sm print:text-black"><strong>Cube Lab 3D — Kilominx shared human guide</strong><br />The flat map mirrors the same stable route used by the interactive 3D guide.</div>
    </section>
  );
}
