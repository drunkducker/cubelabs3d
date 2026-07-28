"use client";

import { useMemo, useState } from "react";
import KilominxNotationFlat from "@/components/KilominxNotationFlat";
import {
  KILOMINX_LEARN_FACES,
  kilominxLearnMove,
} from "@/lib/kilominx-learn-adapter";
import {
  getLearnPuzzleModel,
  learnPuzzleOrder,
  type LearnPuzzleId,
} from "@/lib/learn-model-engine";

export default function LearnModelExplorer() {
  const [puzzleId, setPuzzleId] = useState<LearnPuzzleId>("3x3");
  const [stepIndex, setStepIndex] = useState(0);
  const model = useMemo(() => getLearnPuzzleModel(puzzleId), [puzzleId]);
  const step = (model.starterAlgorithm.steps[stepIndex] ?? model.starterAlgorithm.steps[0])!;
  const kilominxActiveFace = puzzleId === "kilominx" ? kilominxLearnMove(step.move).face : null;

  function choosePuzzle(id: LearnPuzzleId) {
    setPuzzleId(id);
    setStepIndex(0);
  }

  return (
    <section className="rounded-[22px] border border-[var(--border)] bg-[rgba(255,255,255,.045)] p-5 shadow-[0_18px_40px_rgba(0,0,0,.45)]">
      <div className="mb-5 flex flex-wrap gap-2" aria-label="Choose a puzzle model">
        {learnPuzzleOrder.map((id) => {
          const item = getLearnPuzzleModel(id);
          const active = id === puzzleId;
          return (
            <button
              key={id}
              type="button"
              onClick={() => choosePuzzle(id)}
              aria-pressed={active}
              className={[
                "rounded-full border px-3 py-2 text-sm font-semibold transition",
                active
                  ? "border-violet-400 bg-violet-500/20 text-white"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20",
              ].join(" ")}
            >
              {item.name}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(240px,.8fr)]">
        <div>
          <div className="mb-3">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-violet-300">Labeled flat model</p>
            <h2 className="mt-1 text-2xl font-extrabold text-white">{model.name}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{model.subtitle}</p>
          </div>

          {puzzleId === "kilominx" ? (
            <KilominxNotationFlat activeMove={step.move} />
          ) : (
            <svg
              viewBox={model.viewBox}
              role="img"
              aria-label={`${model.name} labeled notation model`}
              className="mx-auto block w-full max-w-[420px]"
            >
              <defs>
                <filter id="learn-active-glow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {model.faces.map((face) => {
                const active = face.id === step.faceId;
                return (
                  <g key={face.id} filter={active ? "url(#learn-active-glow)" : undefined}>
                    <polygon
                      points={face.polygon}
                      fill={face.color}
                      fillOpacity={active ? 1 : 0.8}
                      stroke={active ? "#c4b5fd" : "rgba(5,7,13,.8)"}
                      strokeWidth={active ? 5 : 3}
                      strokeLinejoin="round"
                    />
                    <text
                      x={face.textX}
                      y={face.textY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={face.color === "#f4f6f8" || face.color === "#ffd21f" ? "#080b12" : "#fff"}
                      fontSize="17"
                      fontWeight="900"
                      style={{ paintOrder: "stroke", stroke: "rgba(5,7,13,.28)", strokeWidth: 2 }}
                    >
                      {face.notation}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Face labels</p>
            <dl className="mt-3 max-h-[430px] space-y-2 overflow-y-auto pr-1">
              {puzzleId === "kilominx" ? KILOMINX_LEARN_FACES.map((face) => (
                <div key={face.face} className={kilominxActiveFace === face.face ? "rounded-xl bg-violet-500/10 p-2" : "p-2"}>
                  <dt className="font-bold text-white">{face.notation} — {face.name}</dt>
                  <dd className="mt-1 text-sm leading-5 text-slate-400">{face.description}</dd>
                </div>
              )) : model.faces.map((face) => (
                <div key={face.id} className={step.faceId === face.id ? "rounded-xl bg-violet-500/10 p-2" : "p-2"}>
                  <dt className="font-bold text-white">{face.notation} — {face.name}</dt>
                  <dd className="mt-1 text-sm leading-5 text-slate-400">{face.description}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-violet-300">Algorithm preview</p>
            <h3 className="mt-2 text-lg font-extrabold text-white">{model.starterAlgorithm.name}</h3>
            <p className="mt-1 font-mono text-sm text-violet-100">{model.starterAlgorithm.notation}</p>
            <p className="mt-4 text-sm text-slate-300">
              <strong className="text-white">Step {stepIndex + 1}: {step.move}</strong><br />
              {step.explanation}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setStepIndex((current) => (current - 1 + model.starterAlgorithm.steps.length) % model.starterAlgorithm.steps.length)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-white"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setStepIndex((current) => (current + 1) % model.starterAlgorithm.steps.length)}
                className="flex-1 rounded-xl bg-violet-600 px-3 py-2 text-sm font-bold text-white"
              >
                Next move
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
