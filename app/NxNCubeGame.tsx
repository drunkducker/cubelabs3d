"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Axis = "x" | "y" | "z";
type Direction = 1 | -1;
type Move = { axis: Axis; layer: number; direction: Direction; label: string };
type Cubie = { mesh: THREE.Mesh; grid: THREE.Vector3; home: THREE.Vector3 };

const COLORS = { R: "#e52b3d", L: "#ff7a00", U: "#f5f1e8", D: "#ffd500", F: "#00a85a", B: "#1557d5", I: "#111319" };
const axisVector = (axis: Axis) => axis === "x" ? new THREE.Vector3(1,0,0) : axis === "y" ? new THREE.Vector3(0,1,0) : new THREE.Vector3(0,0,1);
const snap = (value: number, size: number) => Math.round(value + (size - 1) / 2) - (size - 1) / 2;

export default function NxNCubeGame({ size = 10 }: { size?: number }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<{ turn: (move: Move) => void; scramble: () => void; reset: () => void } | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(`${size}×${size} ready`);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#070912");
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
    const distance = Math.max(15, size * 2.05);
    camera.position.set(distance * 0.78, distance * 0.66, distance);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = size * 1.45;
    controls.maxDistance = size * 3.2;

    scene.add(new THREE.HemisphereLight("#ffffff", "#223052", 2.2));
    const key = new THREE.DirectionalLight("#ffffff", 2.4);
    key.position.set(8, 12, 10);
    scene.add(key);
    const rim = new THREE.DirectionalLight("#5c7cff", 1.4);
    rim.position.set(-10, 3, -8);
    scene.add(rim);

    const root = new THREE.Group();
    scene.add(root);
    const edge = (size - 1) / 2;
    const geometry = new THREE.BoxGeometry(0.92, 0.92, 0.92);
    const cubies: Cubie[] = [];
    const material = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.38, metalness: 0.02 });

    for (let xi = 0; xi < size; xi++) for (let yi = 0; yi < size; yi++) for (let zi = 0; zi < size; zi++) {
      const exterior = xi === 0 || yi === 0 || zi === 0 || xi === size - 1 || yi === size - 1 || zi === size - 1;
      if (!exterior) continue;
      const x = xi - edge, y = yi - edge, z = zi - edge;
      const mats = [material(x === edge ? COLORS.R : COLORS.I), material(x === -edge ? COLORS.L : COLORS.I), material(y === edge ? COLORS.U : COLORS.I), material(y === -edge ? COLORS.D : COLORS.I), material(z === edge ? COLORS.F : COLORS.I), material(z === -edge ? COLORS.B : COLORS.I)];
      const mesh = new THREE.Mesh(geometry, mats);
      mesh.position.set(x, y, z);
      root.add(mesh);
      cubies.push({ mesh, grid: new THREE.Vector3(x, y, z), home: new THREE.Vector3(x, y, z) });
    }

    const queue: Move[] = [];
    let active = false;
    const runNext = () => {
      if (active || !queue.length) return;
      active = true;
      setBusy(true);
      const move = queue.shift()!;
      const selected = cubies.filter(c => Math.abs(c.grid[move.axis] - move.layer) < 0.01);
      const pivot = new THREE.Group();
      root.add(pivot);
      selected.forEach(c => pivot.attach(c.mesh));
      const started = performance.now();
      const duration = 230;
      const animate = (now: number) => {
        const p = Math.min(1, (now - started) / duration);
        pivot.rotation[move.axis] = move.direction * Math.PI * 0.5 * (1 - Math.pow(1 - p, 3));
        if (p < 1) return requestAnimationFrame(animate);
        pivot.updateMatrixWorld(true);
        const rot = new THREE.Matrix4().makeRotationAxis(axisVector(move.axis), move.direction * Math.PI * 0.5);
        selected.forEach(c => {
          root.attach(c.mesh);
          c.mesh.position.set(snap(c.mesh.position.x,size), snap(c.mesh.position.y,size), snap(c.mesh.position.z,size));
          c.grid.applyMatrix4(rot).set(snap(c.grid.x,size), snap(c.grid.y,size), snap(c.grid.z,size));
        });
        root.remove(pivot);
        setMoves(v => v + 1);
        setStatus(`${move.label} complete`);
        active = false;
        setBusy(queue.length > 0);
        runNext();
      };
      requestAnimationFrame(animate);
    };

    const faceMoves: Record<string, Move> = {
      R:{axis:"x",layer:edge,direction:-1,label:"R"}, L:{axis:"x",layer:-edge,direction:1,label:"L"},
      U:{axis:"y",layer:edge,direction:-1,label:"U"}, D:{axis:"y",layer:-edge,direction:1,label:"D"},
      F:{axis:"z",layer:edge,direction:-1,label:"F"}, B:{axis:"z",layer:-edge,direction:1,label:"B"},
    };
    const turn = (move: Move) => { queue.push(move); runNext(); };
    const scramble = () => {
      if (active) return;
      const labels = Object.keys(faceMoves);
      for (let i = 0; i < 14; i++) { const label = labels[Math.floor(Math.random()*labels.length)]; const m = faceMoves[label]; queue.push({ ...m, direction: Math.random() > .5 ? m.direction : (m.direction * -1) as Direction }); }
      setStatus(`Scrambling ${size}×${size}…`);
      runNext();
    };
    const reset = () => {
      if (active) return;
      queue.length = 0;
      cubies.forEach(c => { c.mesh.position.copy(c.home); c.mesh.quaternion.identity(); c.grid.copy(c.home); });
      setMoves(0); setStatus(`${size}×${size} reset`);
      camera.position.set(distance * 0.78, distance * 0.66, distance); controls.target.set(0,0,0); controls.update();
    };
    actionsRef.current = { turn, scramble, reset };

    const resize = () => { const w = Math.max(1,mount.clientWidth), h = Math.max(1,mount.clientHeight); renderer.setSize(w,h,false); camera.aspect = w/h; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(mount); resize();
    let frame = 0;
    const render = () => { frame = requestAnimationFrame(render); controls.update(); renderer.render(scene,camera); };
    render();

    return () => { cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); actionsRef.current = null; cubies.forEach(c => (Array.isArray(c.mesh.material) ? c.mesh.material : [c.mesh.material]).forEach(m => m.dispose())); geometry.dispose(); renderer.dispose(); renderer.domElement.remove(); };
  }, [size]);

  const edge = (size - 1) / 2;
  const faceMoves: Record<string, Move> = { R:{axis:"x",layer:edge,direction:-1,label:"R"}, L:{axis:"x",layer:-edge,direction:1,label:"L"}, U:{axis:"y",layer:edge,direction:-1,label:"U"}, D:{axis:"y",layer:-edge,direction:1,label:"D"}, F:{axis:"z",layer:edge,direction:-1,label:"F"}, B:{axis:"z",layer:-edge,direction:1,label:"B"} };

  return <main className="min-h-dvh bg-[#05070d] px-3 py-5 text-[#eef3fb]">
    <div className="mx-auto w-full max-w-[980px]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-extrabold tracking-[.16em] text-[#70b7ff]">UNIVERSAL ENGINE TEST</p><h1 className="text-4xl font-extrabold sm:text-6xl">{size}×{size} Cube</h1><p className="mt-2 text-[#9da9ba]">Our Cube Labs renderer scaled up while the current 3×3 stays untouched.</p></div>
        <Link href="/solve" className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-bold">Back to solvers</Link>
      </div>
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#080b14] shadow-2xl">
        <div className="flex justify-between border-b border-white/10 px-4 py-3 text-sm text-[#aeb8c8]"><span>{status}</span><strong className="text-white">{moves} moves</strong></div>
        <div ref={mountRef} className="h-[58dvh] min-h-[440px] touch-none sm:h-[68dvh] sm:min-h-[520px]" />
      </section>
      <section className="mt-3 grid gap-2">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{Object.entries(faceMoves).map(([label,move]) => <button key={label} disabled={busy} onClick={() => actionsRef.current?.turn(move)} className="min-h-12 rounded-xl border border-white/10 bg-white/5 font-extrabold disabled:opacity-40">{label}</button>)}</div>
        <div className="grid grid-cols-2 gap-2"><button disabled={busy} onClick={() => actionsRef.current?.scramble()} className="min-h-12 rounded-xl bg-gradient-to-r from-[#4d7cff] to-[#2ea6ff] font-extrabold text-[#06101e] disabled:opacity-40">Scramble</button><button disabled={busy} onClick={() => actionsRef.current?.reset()} className="min-h-12 rounded-xl border border-white/10 bg-white/10 font-extrabold disabled:opacity-40">Reset</button></div>
      </section>
      <p className="mt-3 text-sm leading-6 text-[#8d98aa]">Drag to rotate and pinch or scroll to zoom. This first test covers generation, mobile rendering, and animated outer-layer turns.</p>
    </div>
  </main>;
}
