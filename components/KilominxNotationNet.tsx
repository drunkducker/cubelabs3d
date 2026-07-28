"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CORNER_FACES,
  FACE_COLORS,
  applyMoves,
  faceOfMove,
  isSolved,
  moveLabel,
  parseMove,
  solve,
  solved,
  type KiloState,
} from "@/lib/kilominx-engine";
import { FACE_CORNERS_CCW, kilominxNet } from "@/lib/kilominx-net-layout";

const NET = kilominxNet();
const LETTERS = ["A", "B", "C", "D", "E"] as const;
export const KILOMINX_GRAB_FACE_EVENT = "kilominx-notation-grab-face";

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
  const importedScramble = useRef("");
  const observedStatus = useRef("");

  const solutionMoves = useMemo(() => solve(puzzleState), [puzzleState]);
  const activeMove = solutionMoves[0];
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
        const scrambleMoves = parseSequence(scramble);
        setPuzzleState(scrambleMoves.length ? applyMoves(solved(), scrambleMoves) : solved());
      }

      const status = readModelStatus();
      if (status === observedStatus.current) return;
      observedStatus.current = status;
      const committedMove = committedMoveFromStatus(status);
      if (committedMove !== null) {
        setPuzzleState(current => applyMoves(current, [committedMove]));
      }
    };

    syncFromModel();
    const observer = new MutationObserver(syncFromModel);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(KILOMINX_GRAB_FACE_EVENT, {
      detail: {
        face: activeFace,
        move: activeMove ?? null,
        kite: activeKite,
        stickerLabel: activeStickerLabel,
        color: activeStickerColor,
      },
    }));
  }, [activeFace, activeMove, activeStickerLabel, activeStickerColor]);

  return (
    <section className="kilominx-print-surface rounded-[22px] border border-[var(--border)] bg-[rgba(255,255,255,.045)] p-4 shadow-[0_18px_40px_rgba(0,0,0,.42)] print:border-0 print:bg-white print:p-0 print:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[var(--green)]">Live human solve guide</p>
          <h2 className="mt-1 text-2xl font-extrabold text-white">Follow the glowing sticker</h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--muted)]">The engine solves the current state, targets the first required face, and recomputes after every twist you make.</p>
        </div>
        <button type="button" onClick={() => window.print()} className="rounded-xl border border-[var(--border)] bg-black/25 px-4 py-2 text-sm font-extrabold text-white">Print current state</button>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold print:hidden">
        <span className="text-[var(--muted)]">NEXT TWIST</span>
        <span style={{ color: activeStickerColor ?? undefined }}>
          {solvedNow ? "Solved" : `${moveLabel(activeMove!)} · touch ${activeStickerLabel ?? "target"}`}
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] print:block">
        <svg viewBox={`0 0 ${NET.width} ${NET.height}`} className="mx-auto block w-full max-w-[560px] overflow-visible print:max-w-none" role="img" aria-label="Live labeled Kilominx human solve guide">
          {NET.kites.map(kite => {
            const stickerFace = stickerFaceAt(puzzleState, kite.slot, kite.face);
            const color = FACE_COLORS[stickerFace]!;
            const label = stickerLabelAt(puzzleState, kite.slot, kite.face);
            const active = label === activeStickerLabel;
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
            <p className="mt-2 text-3xl font-black text-white">{solvedNow ? "Solved" : moveLabel(activeMove!)}</p>
            <p className="mt-1 text-sm font-bold" style={{ color: activeStickerColor ?? undefined }}>{solvedNow ? "No twist needed" : `Touch glowing sticker ${activeStickerLabel}`}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">Twist the highlighted face by the shown move. A correct move advances the guide. A different move causes the solver to calculate a new route from the resulting state.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[var(--muted)]">Current solver plan</p>
            <p className="mt-2 break-words font-mono text-sm leading-6 text-white">{solutionMoves.length ? solutionMoves.map(moveLabel).join(" ") : "Puzzle solved"}</p>
            <p className="mt-2 text-xs font-bold text-[var(--muted)]">{solutionMoves.length} move{solutionMoves.length === 1 ? "" : "s"} remaining</p>
          </div>
        </div>
      </div>

      <div className="hidden print:block print:pt-4 print:text-center print:text-sm print:text-black"><strong>Cube Lab 3D — Kilominx human solve guide</strong><br />The highlighted sticker marks the first move in the engine solution for this exact state.</div>
    </section>
  );
}
