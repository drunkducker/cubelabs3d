"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FACE_COLORS, faceOfMove, moveLabel, parseMove } from "@/lib/kilominx-engine";
import { kilominxNet } from "@/lib/kilominx-net-layout";

const NET = kilominxNet();
const DEFAULT_ALGORITHM = "1 2 1' 2'";
const SPEEDS = [900, 560, 320, 180];

function kitePoints(quad: readonly [number, number][], shrink = 0.9) {
  const cx = quad.reduce((sum, point) => sum + point[0], 0) / quad.length;
  const cy = quad.reduce((sum, point) => sum + point[1], 0) / quad.length;
  return quad.map(([x, y]) => `${cx + (x - cx) * shrink},${cy + (y - cy) * shrink}`).join(" ");
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
  if (!tokens.length) return "";
  try {
    tokens.forEach(parseMove);
    return tokens.join(" ");
  } catch {
    return "";
  }
}

export default function KilominxNotationNet() {
  const [algorithmText, setAlgorithmText] = useState(DEFAULT_ALGORITHM);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedFace, setSelectedFace] = useState<number | null>(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const importedSequence = useRef("");

  const moves = useMemo(() => algorithmText.trim().split(/\s+/).filter(Boolean).flatMap(token => {
    try { return [parseMove(token)]; } catch { return []; }
  }), [algorithmText]);
  const activeMove = moves[Math.min(step, Math.max(0, moves.length - 1))];
  const activeFace = activeMove === undefined ? selectedFace : faceOfMove(activeMove);

  useEffect(() => {
    const syncFromModel = () => {
      const sequence = readSequenceSection("SOLUTION") || readSequenceSection("SCRAMBLE");
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
    if (timer.current) clearTimeout(timer.current);
    if (!playing || !moves.length) return;
    timer.current = setTimeout(() => {
      setStep(current => {
        if (current + 1 >= moves.length) {
          setPlaying(false);
          return current;
        }
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

  return (
    <section className="kilominx-print-surface rounded-[22px] border border-[var(--border)] bg-[rgba(255,255,255,.045)] p-4 shadow-[0_18px_40px_rgba(0,0,0,.42)] print:border-0 print:bg-white print:p-0 print:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[var(--green)]">Flat labeled reference</p>
          <h2 className="mt-1 text-2xl font-extrabold text-white">Kilominx face map</h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--muted)]">The same twelve engine faces unfolded into two flowers. Scramble and Solve above automatically transfer here for highlighting and playback.</p>
        </div>
        <button type="button" onClick={() => window.print()} className="rounded-xl border border-[var(--border)] bg-black/25 px-4 py-2 text-sm font-extrabold text-white">Print reference</button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] print:block">
        <svg viewBox={`0 0 ${NET.width} ${NET.height}`} className="mx-auto block w-full max-w-[560px] print:max-w-none" role="img" aria-label="Printable labeled Kilominx two-flower net">
          {NET.kites.map(kite => {
            const active = kite.face === activeFace;
            return <polygon
              key={`${kite.face}-${kite.kite}`}
              points={kitePoints(kite.quad, 0.9)}
              fill={FACE_COLORS[kite.face]}
              fillOpacity={active ? 1 : 0.82}
              stroke={active ? "#8b5cf6" : "#0b0d12"}
              strokeWidth={active ? 0.08 : 0.035}
              strokeLinejoin="round"
              onClick={() => { setSelectedFace(kite.face); setPlaying(false); }}
              className="cursor-pointer print:cursor-default"
            />;
          })}
          {NET.faceCenters.map(center => {
            const active = center.face === activeFace;
            const color = FACE_COLORS[center.face];
            return <g key={center.face} onClick={() => { setSelectedFace(center.face); setPlaying(false); }} className="cursor-pointer print:cursor-default">
              <circle cx={center.at[0]} cy={center.at[1]} r={active ? 0.23 : 0.19} fill={color} stroke={active ? "#8b5cf6" : "#0b0d12"} strokeWidth={active ? 0.07 : 0.025} />
              <text x={center.at[0]} y={center.at[1] + 0.058} fontSize={0.16} fontWeight={900} fill={readableText(color)} textAnchor="middle">{center.face + 1}</text>
            </g>;
          })}
        </svg>

        <div className="space-y-3 print:hidden">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <label htmlFor="kilominx-algorithm" className="text-xs font-extrabold uppercase tracking-[.16em] text-[var(--muted)]">Algorithm</label>
            <textarea id="kilominx-algorithm" value={algorithmText} onChange={event => { importedSequence.current = event.target.value.trim(); setAlgorithmText(event.target.value); setStep(0); setPlaying(false); }} rows={3} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-sm text-white outline-none focus:border-violet-400" />
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Uses the engine&apos;s numbered face notation: 1–12, with an apostrophe for reverse turns.</p>
          </div>

          <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-violet-300">Current grab point</p>
            <p className="mt-2 text-3xl font-black text-white">{activeMove === undefined ? `Face ${(activeFace ?? 0) + 1}` : moveLabel(activeMove)}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">Highlighting engine face {(activeFace ?? 0) + 1}. Grab any sticker on this pentagonal face and turn it 72° in the direction shown by the move.</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button type="button" onClick={previous} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-white">Previous</button>
              <button type="button" onClick={togglePlay} className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-bold text-white">{playing ? "Pause" : "Play"}</button>
              <button type="button" onClick={next} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-white">Next</button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-[var(--muted)]">Step {moves.length ? step + 1 : 0} / {moves.length}</span>
              <select value={speed} onChange={event => setSpeed(Number(event.target.value))} className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs font-bold text-white">
                <option value={0}>0.5×</option><option value={1}>1×</option><option value={2}>1.5×</option><option value={3}>2×</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {FACE_COLORS.map((color, face) => <button key={face} type="button" onClick={() => { setSelectedFace(face); setPlaying(false); }} className="rounded-xl border p-2 text-xs font-black" style={{ background: color, color: readableText(color), borderColor: activeFace === face ? "#8b5cf6" : "rgba(255,255,255,.15)" }}>Face {face + 1}</button>)}
          </div>
        </div>
      </div>

      <div className="hidden print:block print:pt-4 print:text-center print:text-sm print:text-black">
        <strong>Cube Lab 3D — Kilominx notation reference</strong><br />Faces 1–12 use the same numbering and colors as the Kilominx engine and solver.
      </div>
    </section>
  );
}
