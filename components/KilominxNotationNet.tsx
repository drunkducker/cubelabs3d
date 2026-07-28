"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CORNER_FACES,
  FACE_COLORS,
  applyMoves,
  faceOfMove,
  moveLabel,
  parseMove,
  solved,
  type KiloState,
} from "@/lib/kilominx-engine";
import { FACE_CORNERS_CCW, kilominxNet } from "@/lib/kilominx-net-layout";

const NET = kilominxNet();
const DEFAULT_ALGORITHM = "1 2 1' 2'";
const SPEEDS = [900, 560, 320, 180];
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

function readSequenceSection(labelText: "SOLUTION" | "SCRAMBLE") {
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
  const [algorithmText, setAlgorithmText] = useState(DEFAULT_ALGORITHM);
  const [puzzleState, setPuzzleState] = useState<KiloState>(() => solved());
  const [hasScramble, setHasScramble] = useState(false);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedFace, setSelectedFace] = useState<number | null>(0);
  const [selectedKite, setSelectedKite] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const importedSequence = useRef("");
  const importedScramble = useRef("");

  const moves = useMemo(() => parseSequence(algorithmText), [algorithmText]);
  const activeMove = moves[Math.min(step, Math.max(0, moves.length - 1))];
  const activeFace = activeMove === undefined ? selectedFace : faceOfMove(activeMove);
  const activeKite = activeMove === undefined ? selectedKite : step % 5;
  const activeNetKite = activeFace === null ? null : NET.kites.find(kite => kite.face === activeFace && kite.kite === activeKite) ?? null;
  const activeStickerFace = activeNetKite ? stickerFaceAt(puzzleState, activeNetKite.slot, activeNetKite.face) : null;
  const activeStickerColor = activeStickerFace === null ? null : FACE_COLORS[activeStickerFace]!;
  const activeStickerLabel = activeNetKite ? stickerLabelAt(puzzleState, activeNetKite.slot, activeNetKite.face) : null;

  useEffect(() => {
    const syncFromModel = () => {
      const scramble = readSequenceSection("SCRAMBLE");
      const solution = readSequenceSection("SOLUTION");
      const sequence = solution || scramble;
      if (scramble !== importedScramble.current) {
        importedScramble.current = scramble;
        const scrambleMoves = parseSequence(scramble);
        setPuzzleState(scrambleMoves.length ? applyMoves(solved(), scrambleMoves) : solved());
        setHasScramble(scrambleMoves.length > 0);
      }
      if (!sequence || sequence === importedSequence.current) return;
      importedSequence.current = sequence;
      setAlgorithmText(sequence);
      setStep(0);
      setPlaying(false);
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
  }, [activeFace, activeMove, activeKite, activeStickerLabel, activeStickerColor]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!playing || !moves.length) return;
    timer.current = setTimeout(() => {
      setStep(current => {
        if (current + 1 >= moves.length) { setPlaying(false); return current; }
        return current + 1;
      });
    }, SPEEDS[speed]);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [playing, step, moves.length, speed]);

  const previous = () => { setPlaying(false); setStep(current => Math.max(0, current - 1)); };
  const next = () => { setPlaying(false); setStep(current => Math.min(Math.max(0, moves.length - 1), current + 1)); };
  const togglePlay = () => {
    if (!moves.length) return;
    if (step >= moves.length - 1) setStep(0);
    setPlaying(value => !value);
  };
  const selectSticker = (face: number, kite: number) => {
    setSelectedFace(face);
    setSelectedKite(kite);
    setPlaying(false);
  };

  return (
    <section className="kilominx-print-surface rounded-[22px] border border-[var(--border)] bg-[rgba(255,255,255,.045)] p-4 shadow-[0_18px_40px_rgba(0,0,0,.42)] print:border-0 print:bg-white print:p-0 print:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[var(--green)]">Live flat puzzle state</p>
          <h2 className="mt-1 text-2xl font-extrabold text-white">Kilominx flower map</h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--muted)]">One sticker is targeted per lesson step. Its own color glows on both the flower and the 3D Kilominx.</p>
        </div>
        <button type="button" onClick={() => window.print()} className="rounded-xl border border-[var(--border)] bg-black/25 px-4 py-2 text-sm font-extrabold text-white">Print current state</button>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold print:hidden">
        <span className="text-[var(--muted)]">TARGET STICKER</span>
        <span style={{ color: activeStickerColor ?? undefined }}>{activeStickerLabel ?? "None"} · {hasScramble ? "scrambled" : "solved"}</span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] print:block">
        <svg viewBox={`0 0 ${NET.width} ${NET.height}`} className="mx-auto block w-full max-w-[560px] overflow-visible print:max-w-none" role="img" aria-label="Live labeled Kilominx two-flower state">
          {NET.kites.map(kite => {
            const stickerFace = stickerFaceAt(puzzleState, kite.slot, kite.face);
            const color = FACE_COLORS[stickerFace]!;
            const label = stickerLabelAt(puzzleState, kite.slot, kite.face);
            const active = label === activeStickerLabel;
            const [cx, cy] = kiteCenter(kite.quad);
            return <g key={`${kite.face}-${kite.kite}`} onClick={() => selectSticker(kite.face, kite.kite)} className="cursor-pointer print:cursor-default">
              <polygon
                points={kitePoints(kite.quad, 0.9)}
                fill={color}
                fillOpacity={active ? 1 : 0.9}
                stroke={active ? color : "#0b0d12"}
                strokeWidth={active ? 0.09 : 0.035}
                strokeLinejoin="round"
                style={active ? { filter: `drop-shadow(0 0 0.14px ${color}) drop-shadow(0 0 0.3px ${color})` } : undefined}
              />
              <text x={cx} y={cy + 0.045} fontSize={active ? 0.13 : 0.115} fontWeight={900} fill={readableText(color)} textAnchor="middle" paintOrder="stroke" stroke={readableText(color) === "#ffffff" ? "rgba(0,0,0,.45)" : "rgba(255,255,255,.38)"} strokeWidth={0.018}>{label}</text>
            </g>;
          })}
          {NET.faceCenters.map(center => {
            const color = FACE_COLORS[center.face];
            return <g key={center.face} onClick={() => selectSticker(center.face, 0)} className="cursor-pointer print:cursor-default">
              <circle cx={center.at[0]} cy={center.at[1]} r={0.19} fill={color} stroke="#0b0d12" strokeWidth={0.025} />
              <text x={center.at[0]} y={center.at[1] + 0.058} fontSize={0.16} fontWeight={900} fill={readableText(color)} textAnchor="middle">{center.face + 1}</text>
            </g>;
          })}
        </svg>

        <div className="space-y-3 print:hidden">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <label htmlFor="kilominx-algorithm" className="text-xs font-extrabold uppercase tracking-[.16em] text-[var(--muted)]">Algorithm</label>
            <textarea id="kilominx-algorithm" value={algorithmText} onChange={event => { importedSequence.current = event.target.value.trim(); setAlgorithmText(event.target.value); setStep(0); setPlaying(false); }} rows={3} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-sm text-white outline-none focus:border-violet-400" />
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Each move step advances the target to one labeled sticker. Tap any flower tile to target it directly.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4" style={{ boxShadow: activeStickerColor ? `inset 0 0 28px ${activeStickerColor}22` : undefined }}>
            <p className="text-xs font-extrabold uppercase tracking-[.16em]" style={{ color: activeStickerColor ?? undefined }}>Current target sticker</p>
            <p className="mt-2 text-3xl font-black text-white">{activeStickerLabel ?? "None"}</p>
            <p className="mt-1 text-sm font-bold" style={{ color: activeStickerColor ?? undefined }}>{activeMove === undefined ? `Face ${(activeFace ?? 0) + 1}` : moveLabel(activeMove)}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">Only this sticker glows, using its own sticker color, on both synchronized views.</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button type="button" onClick={previous} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-white">Previous</button>
              <button type="button" onClick={togglePlay} className="rounded-xl px-3 py-2 text-sm font-bold text-black" style={{ background: activeStickerColor ?? "#63d900" }}>{playing ? "Pause" : "Play"}</button>
              <button type="button" onClick={next} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-white">Next</button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-[var(--muted)]">Step {moves.length ? step + 1 : 0} / {moves.length}</span>
              <select value={speed} onChange={event => setSpeed(Number(event.target.value))} className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs font-bold text-white"><option value={0}>0.5×</option><option value={1}>1×</option><option value={2}>1.5×</option><option value={3}>2×</option></select>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden print:block print:pt-4 print:text-center print:text-sm print:text-black"><strong>Cube Lab 3D — Kilominx live state</strong><br />Every kite color and label is derived from the engine corner permutation and orientation.</div>
    </section>
  );
}
