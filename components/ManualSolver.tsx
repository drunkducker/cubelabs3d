"use client";

/**
 * Real mobile solver: scramble with our engine, solve with Kociemba, verify with
 * our engine, and play every verified move on the original rounded 3D cube.
 */
import dynamic from "next/dynamic";
import {useCallback,useEffect,useMemo,useState} from "react";
import Cube from "cubejs";
import {applySequence,isSolved,randomScramble,solved,toFacelets,toFaceletString,type CubeState} from "@/lib/cube-engine";

const SolverCube3D=dynamic(()=>import("./SolverCube3D"),{ssr:false,loading:()=> <div className="grid h-full place-items-center text-sm text-[var(--faint)]">Loading 3D cube…</div>});
const COLORS=["#f5f1e8","#e52b3d","#00a85a","#ffd500","#ff7a00","#1557d5"];
const POS:Record<string,[number,number]>={U:[0,3],L:[3,0],F:[3,3],R:[3,6],B:[3,9],D:[6,3]};
const INDEX:Record<string,number>={U:0,R:1,F:2,D:3,L:4,B:5};

export default function ManualSolver(){
 const [cube,setCube]=useState<CubeState>(()=>solved());
 const [scramble,setScramble]=useState("");
 const [solution,setSolution]=useState<string[]>([]);
 const [step,setStep]=useState(0);
 const [ready,setReady]=useState(false);
 const [status,setStatus]=useState("Preparing fast solver…");
 const [time,setTime]=useState(0);
 const [animating,setAnimating]=useState(false);

 useEffect(()=>{const id=setTimeout(()=>{try{Cube.initSolver();setReady(true);setStatus("Solver ready");}catch{setStatus("Solver failed to initialize");}},30);return()=>clearTimeout(id)},[]);
 const visible=useMemo(()=>solution.length?applySequence(cube,solution.slice(0,step).join(" ")):cube,[cube,solution,step]);
 const facelets=toFacelets(visible);
 const onAnimating=useCallback((value:boolean)=>setAnimating(value),[]);

 const scrambleCube=()=>{const seq=randomScramble(25);setScramble(seq);setCube(applySequence(solved(),seq));setSolution([]);setStep(0);setStatus("Scrambled cube ready");};
 const solveCube=()=>{if(!ready)return;const start=performance.now();try{const text=Cube.fromString(toFaceletString(cube)).solve().trim();const moves=text?text.split(/\s+/):[];const verified=isSolved(applySequence(cube,text));setSolution(moves);setStep(0);setTime(Math.round(performance.now()-start));setStatus(verified?`Verified solution — ${moves.length} moves`:"Solution verification failed");}catch{setStatus("This cube state could not be solved");}};
 const previous=()=>{if(!animating)setStep(v=>Math.max(0,v-1));};
 const next=()=>{if(!animating)setStep(v=>Math.min(solution.length,v+1));};

 return <div className="space-y-4">
  <section className="glass rounded-[22px] p-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">LIVE CUBE STATE</span><span className="text-xs font-bold text-[var(--green)]">{status}</span></div><div className="mx-auto grid aspect-[12/9] max-w-[390px] grid-cols-12 gap-1">{Array.from({length:108},(_,i)=>{const row=Math.floor(i/12),col=i%12;let color="transparent";for(const [face,[r,c]] of Object.entries(POS))if(row>=r&&row<r+3&&col>=c&&col<c+3)color=COLORS[facelets[INDEX[face]*9+(row-r)*3+(col-c)]];return <div key={i} className={color==="transparent"?"":"rounded-[5px] border border-white/15"} style={{background:color}}/>})}</div></section>
  <div className="grid grid-cols-2 gap-3"><button onClick={scrambleCube} disabled={animating} className="glass rounded-2xl p-4 font-extrabold disabled:opacity-50">RANDOM SCRAMBLE</button><button disabled={!ready||animating} onClick={solveCube} className="cta-green rounded-2xl p-4 font-extrabold disabled:opacity-50">SOLVE CUBE</button></div>
  <section className="glass rounded-[22px] p-4"><p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">SCRAMBLE</p><p className="mt-2 min-h-12 leading-7 text-[var(--text)]">{scramble||"Tap Random Scramble to create a test cube."}</p></section>
  <section className="glass rounded-[22px] p-4"><div className="flex items-center justify-between"><p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">VERIFIED SOLUTION</p><span className="text-xs text-[var(--muted)]">{time} ms</span></div><p className="mt-2 min-h-12 text-xl font-bold leading-8 tracking-wide">{solution.join(" ")||"—"}</p><div className="mt-3 flex gap-2 overflow-x-auto pb-1">{solution.map((move,i)=><button key={`${move}-${i}`} disabled={animating} onClick={()=>setStep(i+1)} className={`min-w-11 rounded-xl border p-3 font-extrabold disabled:opacity-50 ${i===step-1?"border-[var(--green)] bg-[rgba(52,208,88,.14)]":"border-[var(--border)] bg-black/20"}`}>{move}</button>)}</div><div className="mt-3 grid grid-cols-2 gap-3"><button disabled={step===0||animating} onClick={previous} className="glass rounded-xl p-3 font-bold disabled:opacity-40">Previous</button><button disabled={step>=solution.length||animating} onClick={next} className="glass rounded-xl p-3 font-bold disabled:opacity-40">Next move</button></div></section>

  <section className="glass overflow-hidden rounded-[22px] p-4">
   <div className="flex items-center justify-between"><div><p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">3D SOLUTION PLAYBACK</p><p className="mt-1 text-sm text-[var(--muted)]">Scrambled state at step 0, then every verified move.</p></div><span className="rounded-full border border-[var(--border)] bg-black/25 px-3 py-1 text-xs font-extrabold text-[var(--green)]">{step} / {solution.length}</span></div>
   <div className="cube-card relative mt-4 h-[320px] overflow-hidden rounded-[22px]"><div className="platform-ring absolute bottom-[58px] left-1/2 z-[1] h-[66px] w-[230px] -translate-x-1/2 rounded-[50%]"/><div className="absolute inset-0 z-[2]"><SolverCube3D scramble={scramble} solution={solution} step={step} onAnimating={onAnimating}/></div><div className="pointer-events-none absolute bottom-4 left-1/2 z-[3] -translate-x-1/2 whitespace-nowrap text-[13px] font-semibold text-[var(--muted)]">Drag to rotate • use controls above</div></div>
  </section>
 </div>;
}
