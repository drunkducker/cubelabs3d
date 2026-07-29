"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import SiteHeader from "@/components/SiteHeader";

type Player = import("cubing/twisty").TwistyPlayer;
type Runtime = {
  Alg: typeof import("cubing/alg").Alg;
  puzzles: typeof import("cubing/puzzles").puzzles;
  solveSkewb: typeof import("cubing/search").solveSkewb;
};

const EXAMPLE = "[x: [R', F]]";

export default function SkewbCubingProof() {
  const setupHost = useRef<HTMLDivElement>(null);
  const solutionHost = useRef<HTMLDivElement>(null);
  const setupPlayer = useRef<Player | null>(null);
  const solutionPlayer = useRef<Player | null>(null);
  const runtime = useRef<Runtime | null>(null);
  const [setupText, setSetupText] = useState(EXAMPLE);
  const [solutionText, setSolutionText] = useState("");
  const [status, setStatus] = useState("Loading cubing.js…");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let disposed = false;
    void Promise.all([
      import("cubing/alg"),
      import("cubing/puzzles"),
      import("cubing/search"),
      import("cubing/twisty"),
    ]).then(([algModule, puzzleModule, searchModule, twistyModule]) => {
      if (disposed || !setupHost.current || !solutionHost.current) return;
      runtime.current = {
        Alg: algModule.Alg,
        puzzles: puzzleModule.puzzles,
        solveSkewb: searchModule.solveSkewb,
      };
      const setup = new twistyModule.TwistyPlayer({
        puzzle: "skewb",
        alg: algModule.Alg.fromString(EXAMPLE),
        background: "none",
        controlPanel: "none",
        experimentalDragInput: "auto",
        hintFacelets: "none",
        tempoScale: 0.85,
      });
      const solution = new twistyModule.TwistyPlayer({
        puzzle: "skewb",
        background: "none",
        hintFacelets: "none",
        tempoScale: 0.8,
      });
      for (const player of [setup, solution]) {
        player.style.width = "100%";
        player.style.height = "100%";
        player.style.display = "block";
      }
      setupHost.current.replaceChildren(setup);
      solutionHost.current.replaceChildren(solution);
      setupPlayer.current = setup;
      solutionPlayer.current = solution;
      setStatus("Drag the puzzle, load an algorithm, or solve its current state.");
      setBusy(false);
    }).catch((error: unknown) => {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "Unable to load cubing.js.");
      setBusy(false);
    });
    return () => {
      disposed = true;
      setupPlayer.current?.remove();
      solutionPlayer.current?.remove();
    };
  }, []);

  function loadSetup() {
    if (!runtime.current || !setupPlayer.current) return;
    try {
      setupPlayer.current.alg = runtime.current.Alg.fromString(setupText.trim());
      setSolutionText("");
      setStatus("Setup loaded. You can still drag the Skewb before solving.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Invalid Skewb algorithm.");
    }
  }

  function reset() {
    if (!runtime.current || !setupPlayer.current || !solutionPlayer.current) return;
    const empty = new runtime.current.Alg();
    setupPlayer.current.alg = empty;
    solutionPlayer.current.experimentalSetupAlg = empty;
    solutionPlayer.current.alg = empty;
    setSetupText("");
    setSolutionText("");
    setStatus("Solved Skewb ready.");
  }

  async function solveCurrent() {
    if (!runtime.current || !setupPlayer.current || !solutionPlayer.current || busy) return;
    setBusy(true);
    setStatus("Solving the exact cubing.js state…");
    try {
      const setupAlg = await setupPlayer.current.experimentalGet.alg();
      const kpuzzle = await runtime.current.puzzles.skewb.kpuzzle();
      const pattern = kpuzzle.defaultPattern().applyAlg(setupAlg);
      const solution = await runtime.current.solveSkewb(pattern);
      solutionPlayer.current.experimentalSetupAlg = setupAlg;
      solutionPlayer.current.alg = solution;
      setSetupText(setupAlg.toString());
      setSolutionText(solution.toString() || "Already solved");
      setStatus("Solution generated from the same state used by the renderer.");
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "Unable to solve this state.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell relative min-h-dvh w-full max-w-[560px] overflow-hidden px-4 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))]">
      <div className="orb orb-a" /><div className="orb orb-b" />
      <div className="relative z-[1]">
        <SiteHeader />
        <Link href="/solver/skewb" className="mt-3 inline-flex min-h-10 items-center text-sm font-bold text-[var(--muted)]">← Stable Skewb</Link>
        <section className="mt-3">
          <p className="text-xs font-extrabold tracking-[.18em] text-[var(--blue)]">CUBING.JS PROOF</p>
          <h1 className="mt-2 text-[38px] font-extrabold leading-[1.02] tracking-[-1.2px]">Real Skewb geometry.<br /><span className="accent-text">One state model.</span></h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">A separate test route using cubing.js for legal geometry, animation, state, and solution playback.</p>
        </section>

        <section className="cube-card mt-4 overflow-hidden rounded-[26px]">
          <div className="min-h-12 border-b border-[var(--border)] px-4 py-3 text-xs font-bold text-[var(--muted)]">{status}</div>
          <div ref={setupHost} className="h-[430px] w-full sm:h-[500px]" />
          <div className="border-t border-[var(--border)] px-4 py-3 text-center text-xs font-semibold text-[var(--muted)]">Drag the actual puzzle. cubing.js owns the moving geometry.</div>
        </section>

        <section className="glass mt-3 rounded-[20px] p-4">
          <label htmlFor="proof-alg" className="text-xs font-extrabold tracking-[.14em] text-[var(--muted)]">SETUP ALGORITHM</label>
          <textarea id="proof-alg" value={setupText} onChange={(event) => setSetupText(event.target.value)} spellCheck={false} className="mt-2 min-h-20 w-full rounded-xl border border-[var(--border)] bg-black/25 p-3 font-mono text-sm text-[var(--text)]" />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button disabled={busy} onClick={loadSetup} className="cta-blue min-h-12 rounded-xl font-extrabold disabled:opacity-40">Load</button>
            <button disabled={busy} onClick={() => void solveCurrent()} className="cta-green min-h-12 rounded-xl font-extrabold disabled:opacity-40">Solve</button>
            <button disabled={busy} onClick={reset} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">Reset</button>
          </div>
        </section>

        <section className="glass mt-3 overflow-hidden rounded-[20px]">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <p className="text-xs font-extrabold tracking-[.14em] text-[var(--green)]">VERIFIED SOLUTION</p>
            <p className="mt-1 min-h-5 break-words font-mono text-sm text-[var(--text)]">{solutionText || "Solve the current state to create playback."}</p>
          </div>
          <div ref={solutionHost} className="h-[330px] w-full" />
        </section>
      </div>
    </main>
  );
}
