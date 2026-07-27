"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import SiteHeader from "@/components/SiteHeader";

type AxisName = "U" | "R" | "L" | "B";
type Direction = 1 | -1;
type Move = { axis: AxisName; direction: Direction; record?: boolean };

const AXES: Record<AxisName, THREE.Vector3> = {
  U: new THREE.Vector3(1, 1, 1).normalize(),
  R: new THREE.Vector3(1, -1, -1).normalize(),
  L: new THREE.Vector3(-1, 1, -1).normalize(),
  B: new THREE.Vector3(-1, -1, 1).normalize(),
};

const FACE_COLORS = ["#f4f4f1", "#ffd500", "#00a85a", "#1557d5", "#ef3340", "#ff7a00"];
const FACE_DATA = [
  { normal: new THREE.Vector3(0, 1, 0), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 0, -1) },
  { normal: new THREE.Vector3(0, -1, 0), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 0, 1) },
  { normal: new THREE.Vector3(0, 0, 1), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 1, 0) },
  { normal: new THREE.Vector3(0, 0, -1), u: new THREE.Vector3(-1, 0, 0), v: new THREE.Vector3(0, 1, 0) },
  { normal: new THREE.Vector3(1, 0, 0), u: new THREE.Vector3(0, 0, -1), v: new THREE.Vector3(0, 1, 0) },
  { normal: new THREE.Vector3(-1, 0, 0), u: new THREE.Vector3(0, 0, 1), v: new THREE.Vector3(0, 1, 0) },
];

function formatElapsed(ms: number) {
  const tenths = Math.floor(ms / 100);
  return `${Math.floor(tenths / 600)}:${String(Math.floor((tenths % 600) / 10)).padStart(2, "0")}.${tenths % 10}`;
}

function polygonGeometry(points: THREE.Vector3[], anchor: THREE.Vector3) {
  const positions: number[] = [];
  for (let i = 1; i < points.length - 1; i++) {
    [points[0], points[i], points[i + 1]].forEach(p => {
      const q = p.clone().sub(anchor);
      positions.push(q.x, q.y, q.z);
    });
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function label(move: Move) { return `${move.axis}${move.direction === -1 ? "'" : ""}`; }
function inverse(move: Move): Move { return { axis: move.axis, direction: move.direction === 1 ? -1 : 1, record: false }; }

export default function SkewbGame() {
  const mountRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<{ turn: (axis: AxisName, direction: Direction) => void; scramble: () => void; undo: () => void; solve: () => void; resetView: () => void } | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Skewb ready");
  const [moves, setMoves] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [isSolved, setIsSolved] = useState(true);
  const [scrambleText, setScrambleText] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      if (startRef.current !== null) setElapsedMs(performance.now() - startRef.current);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#d8dde3");
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(5.4, 4.7, 6.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 4.2;
    controls.maxDistance = 11;
    controls.target.set(0, 0, 0);
    controls.update();
    controls.saveState();

    scene.add(new THREE.HemisphereLight("#ffffff", "#77808b", 2.3));
    const key = new THREE.DirectionalLight("#ffffff", 3.1);
    key.position.set(7, 10, 8);
    key.castShadow = true;
    scene.add(key);

    const root = new THREE.Group();
    root.rotation.y = -0.18;
    scene.add(root);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.04, 2.04, 2.04),
      new THREE.MeshStandardMaterial({ color: "#08090b", roughness: 0.56, metalness: 0.02 }),
    );
    body.castShadow = true;
    body.receiveShadow = true;
    root.add(body);

    const pieceGroups: THREE.Group[] = [];
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [body.material as THREE.Material];
    const groupFor = (keyName: string, anchor: THREE.Vector3) => {
      let group = pieceGroups.find(g => g.userData.keyName === keyName);
      if (!group) {
        group = new THREE.Group();
        group.position.copy(anchor);
        group.userData.keyName = keyName;
        group.userData.kind = keyName.startsWith("corner") ? "corner" : "center";
        pieceGroups.push(group);
        root.add(group);
      }
      return group;
    };

    FACE_DATA.forEach((face, faceIndex) => {
      const plane = face.normal.clone().multiplyScalar(1.035);
      const p = (x: number, y: number) => plane.clone().addScaledVector(face.u, x).addScaledVector(face.v, y);
      const m = 0.37;
      const polygons = [
        { points: [p(0, m), p(m, 0), p(0, -m), p(-m, 0)], kind: "center" as const, signs: [0, 0] },
        { points: [p(-0.93, 0.93), p(0, 0.93), p(-m, 0), p(-0.93, 0)], kind: "corner" as const, signs: [-1, 1] },
        { points: [p(0, 0.93), p(0.93, 0.93), p(0.93, 0), p(m, 0)], kind: "corner" as const, signs: [1, 1] },
        { points: [p(0.93, 0), p(0.93, -0.93), p(0, -0.93), p(m, 0)], kind: "corner" as const, signs: [1, -1] },
        { points: [p(0, -0.93), p(-0.93, -0.93), p(-0.93, 0), p(-m, 0)], kind: "corner" as const, signs: [-1, -1] },
      ];

      polygons.forEach(poly => {
        let anchor: THREE.Vector3;
        let keyName: string;
        if (poly.kind === "center") {
          anchor = face.normal.clone();
          keyName = `center:${face.normal.x},${face.normal.y},${face.normal.z}`;
        } else {
          anchor = face.normal.clone().addScaledVector(face.u, poly.signs[0]).addScaledVector(face.v, poly.signs[1]);
          anchor.set(Math.sign(anchor.x), Math.sign(anchor.y), Math.sign(anchor.z));
          keyName = `corner:${anchor.x},${anchor.y},${anchor.z}`;
        }
        const group = groupFor(keyName, anchor);
        const geometry = polygonGeometry(poly.points, anchor);
        const material = new THREE.MeshStandardMaterial({
          color: FACE_COLORS[faceIndex], roughness: 0.42, metalness: 0,
          polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        group.add(mesh);
        geometries.push(geometry);
        materials.push(material);
      });
    });

    const queue: Move[] = [];
    const history: Move[] = [];
    let active = false;
    let animationFrame = 0;
    let disposed = false;

    const syncUi = () => {
      setMoves(history.length);
      setCanUndo(history.length > 0);
      setIsSolved(history.length === 0);
      if (history.length === 0) {
        setStatus("Solved!");
        startRef.current = null;
      } else if (startRef.current === null) {
        startRef.current = performance.now() - elapsedMs;
      }
    };

    const runNext = () => {
      if (active || !queue.length) return;
      active = true;
      setBusy(true);
      const move = queue.shift()!;
      const axis = AXES[move.axis];
      const selected = pieceGroups.filter(group => {
        const world = new THREE.Vector3();
        group.getWorldPosition(world);
        root.worldToLocal(world);
        return world.dot(axis) > 0.2;
      });
      const pivot = new THREE.Group();
      root.add(pivot);
      selected.forEach(group => pivot.attach(group));
      const started = performance.now();
      const angle = move.direction * (2 * Math.PI / 3);
      const animate = (now: number) => {
        if (disposed) return;
        const t = Math.min(1, (now - started) / 300);
        const eased = 1 - Math.pow(1 - t, 3);
        pivot.quaternion.setFromAxisAngle(axis, angle * eased);
        if (t < 1) { animationFrame = requestAnimationFrame(animate); return; }
        pivot.updateMatrixWorld(true);
        selected.forEach(group => root.attach(group));
        root.remove(pivot);
        if (move.record !== false) history.push(move);
        syncUi();
        active = false;
        setBusy(queue.length > 0);
        runNext();
      };
      animationFrame = requestAnimationFrame(animate);
    };

    const enqueue = (move: Move) => { queue.push(move); runNext(); };
    const turn = (axis: AxisName, direction: Direction) => enqueue({ axis, direction });
    const scramble = () => {
      if (active || queue.length) return;
      history.length = 0;
      setMoves(0); setCanUndo(false); setIsSolved(false); setElapsedMs(0);
      startRef.current = performance.now();
      const names = Object.keys(AXES) as AxisName[];
      const sequence: Move[] = [];
      let previous: AxisName | null = null;
      while (sequence.length < 10) {
        const axis = names[Math.floor(Math.random() * names.length)];
        if (axis === previous) continue;
        previous = axis;
        sequence.push({ axis, direction: Math.random() > 0.5 ? 1 : -1, record: false });
      }
      setScrambleText(sequence.map(label).join(" "));
      setStatus("Scrambling…");
      queue.push(...sequence);
      runNext();
    };
    const undo = () => {
      if (active || queue.length || !history.length) return;
      const move = history.pop()!;
      enqueue(inverse(move));
    };
    const solve = () => {
      if (active || queue.length || !history.length) return;
      setStatus("Solving…");
      const solution = [...history].reverse().map(inverse);
      history.length = 0;
      queue.push(...solution);
      runNext();
    };
    actionsRef.current = { turn, scramble, undo, solve, resetView: () => controls.reset() };

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    let frame = 0;
    const render = () => { frame = requestAnimationFrame(render); controls.update(); renderer.render(scene, camera); };
    render();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      controls.dispose();
      actionsRef.current = null;
      geometries.forEach(g => g.dispose());
      materials.forEach(m => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const axes = Object.keys(AXES) as AxisName[];
  return <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[22px]">
    <div className="orb orb-a" /><div className="orb orb-b" />
    <div className="relative z-[1]">
      <SiteHeader />
      <Link href="/solve" className="mt-4 inline-flex text-sm font-bold text-[var(--muted)]">← Back to solvers</Link>
      <section className="mt-5">
        <p className="text-xs font-extrabold tracking-[.18em] text-[var(--blue)]">SKEWB</p>
        <h1 className="mt-2 text-[39px] font-extrabold leading-[1.02] tracking-[-1px]">Twist corners.<br /><span className="accent-text">Shift every face.</span></h1>
        <p className="mt-3 text-[15px] leading-6 text-[var(--muted)]">A playable corner-axis puzzle with true 120° layer turns, scramble, undo, timer, and reverse-playback solve.</p>
      </section>
      <section className="mt-4 overflow-hidden rounded-[24px] border border-black/10 bg-[#d8dde3] shadow-[0_18px_55px_rgba(0,0,0,.3)]">
        <div className="flex items-center justify-between border-b border-black/10 bg-white/55 px-4 py-3 text-sm text-slate-700">
          <span>{status}</span><span className="flex gap-3"><span className="tabular-nums">{formatElapsed(elapsedMs)}</span><strong>{moves} moves</strong></span>
        </div>
        <div ref={mountRef} className="h-[430px] w-full touch-none sm:h-[480px]" />
        <div className="bg-white/45 px-4 py-3 text-center text-[13px] font-semibold text-slate-600">Drag to rotate view • Use buttons for corner turns</div>
      </section>
      <section className="glass mt-3 rounded-[18px] p-4"><p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">SCRAMBLE</p><p className="mt-2 min-h-6 break-words text-sm leading-6 text-[var(--text)]">{scrambleText || "Tap Scramble to begin."}</p></section>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button disabled={busy} onClick={() => actionsRef.current?.scramble()} className="cta-purple min-h-12 rounded-xl font-extrabold disabled:opacity-40">Scramble</button>
        <button disabled={busy || !canUndo} onClick={() => actionsRef.current?.undo()} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">↶ Undo</button>
        <button disabled={busy || isSolved} onClick={() => actionsRef.current?.solve()} className="cta-green min-h-12 rounded-xl font-extrabold disabled:opacity-40">Solve</button>
      </div>
      <section className="glass mt-3 rounded-[18px] p-3">
        <p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">CORNER TURNS</p>
        <div className="mt-3 grid grid-cols-4 gap-2">{axes.map(axis => <button key={axis} disabled={busy} onClick={() => actionsRef.current?.turn(axis, 1)} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">{axis}</button>)}</div>
        <div className="mt-2 grid grid-cols-4 gap-2">{axes.map(axis => <button key={`${axis}'`} disabled={busy} onClick={() => actionsRef.current?.turn(axis, -1)} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">{axis}&apos;</button>)}</div>
        <button onClick={() => actionsRef.current?.resetView()} className="glass mt-3 min-h-12 w-full rounded-xl font-extrabold">Reset View</button>
      </section>
    </div>
  </main>;
}
