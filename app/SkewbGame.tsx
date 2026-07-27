"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import SiteHeader from "@/components/SiteHeader";
import {
  AXES,
  CENTER_POSITIONS,
  CORNER_POSITIONS,
  type AxisName,
  type Direction,
  type PieceTransform,
  type SkewbMove,
  applyMove,
  inverseMove,
  inverseSequence,
  isSolved as skewbIsSolved,
  moveLabel,
  parseSequence,
  randomScramble,
  solved as skewbSolved,
} from "@/lib/skewb-engine";

type MovePhase = "play" | "scramble" | "load" | "undo" | "solve";
type QueuedMove = SkewbMove & {
  record?: boolean;
  track?: boolean;
  fast?: boolean;
  phase?: MovePhase;
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
    // FACE_DATA uses outward-facing u × v bases. Reverse the fan order so
    // Three.js front-face culling keeps the colored stickers visible.
    [points[0], points[i + 1], points[i]].forEach(point => {
      const local = point.clone().sub(anchor);
      positions.push(local.x, local.y, local.z);
    });
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function samePosition(a: readonly number[], b: THREE.Vector3) {
  return a[0] === b.x && a[1] === b.y && a[2] === b.z;
}

export default function SkewbGame() {
  const mountRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<{
    turn: (axis: AxisName, direction: Direction) => void;
    scramble: () => void;
    undo: () => void;
    solve: () => void;
    resetPuzzle: () => void;
    resetView: () => void;
    loadScramble: (notation: string) => void;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Skewb ready");
  const [moves, setMoves] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [isSolved, setIsSolved] = useState(true);
  const [scrambleText, setScrambleText] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);

  const accumulatedMsRef = useRef(0);
  const segmentStartRef = useRef<number | null>(null);
  const startTimer = () => {
    if (segmentStartRef.current === null) segmentStartRef.current = performance.now();
  };
  const stopTimer = () => {
    if (segmentStartRef.current === null) return;
    accumulatedMsRef.current += performance.now() - segmentStartRef.current;
    segmentStartRef.current = null;
    setElapsedMs(accumulatedMsRef.current);
  };
  const resetTimer = () => {
    accumulatedMsRef.current = 0;
    segmentStartRef.current = null;
    setElapsedMs(0);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      if (segmentStartRef.current !== null) {
        setElapsedMs(accumulatedMsRef.current + performance.now() - segmentStartRef.current);
      }
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
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
    const groupFor = (keyName: string, anchor: THREE.Vector3, kind: "corner" | "center") => {
      let group = pieceGroups.find(candidate => candidate.userData.keyName === keyName);
      if (!group) {
        group = new THREE.Group();
        group.position.copy(anchor);
        group.userData.keyName = keyName;
        group.userData.kind = kind;
        group.userData.pieceIndex = (kind === "corner" ? CORNER_POSITIONS : CENTER_POSITIONS)
          .findIndex(position => samePosition(position, anchor));
        pieceGroups.push(group);
        root.add(group);
      }
      return group;
    };

    FACE_DATA.forEach((face, faceIndex) => {
      const plane = face.normal.clone().multiplyScalar(1.035);
      const point = (x: number, y: number) => plane.clone().addScaledVector(face.u, x).addScaledVector(face.v, y);
      const middle = 0.37;
      const polygons = [
        { points: [point(0, middle), point(middle, 0), point(0, -middle), point(-middle, 0)], kind: "center" as const, signs: [0, 0] },
        { points: [point(-0.93, 0.93), point(0, 0.93), point(-middle, 0), point(-0.93, 0)], kind: "corner" as const, signs: [-1, 1] },
        { points: [point(0, 0.93), point(0.93, 0.93), point(0.93, 0), point(middle, 0)], kind: "corner" as const, signs: [1, 1] },
        { points: [point(0.93, 0), point(0.93, -0.93), point(0, -0.93), point(middle, 0)], kind: "corner" as const, signs: [1, -1] },
        { points: [point(0, -0.93), point(-0.93, -0.93), point(-0.93, 0), point(-middle, 0)], kind: "corner" as const, signs: [-1, -1] },
      ];

      polygons.forEach(poly => {
        const anchor = poly.kind === "center"
          ? face.normal.clone()
          : face.normal.clone().addScaledVector(face.u, poly.signs[0]).addScaledVector(face.v, poly.signs[1])
            .set(
              Math.sign(face.normal.x + face.u.x * poly.signs[0] + face.v.x * poly.signs[1]),
              Math.sign(face.normal.y + face.u.y * poly.signs[0] + face.v.y * poly.signs[1]),
              Math.sign(face.normal.z + face.u.z * poly.signs[0] + face.v.z * poly.signs[1]),
            );
        const keyName = `${poly.kind}:${anchor.x},${anchor.y},${anchor.z}`;
        const group = groupFor(keyName, anchor, poly.kind);
        const geometry = polygonGeometry(poly.points, anchor);
        const material = new THREE.MeshStandardMaterial({
          color: FACE_COLORS[faceIndex],
          roughness: 0.42,
          metalness: 0,
          polygonOffset: true,
          polygonOffsetFactor: -3,
          polygonOffsetUnits: -3,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        group.add(mesh);
        geometries.push(geometry);
        materials.push(material);
      });
    });

    let logicalState = skewbSolved();
    const queue: QueuedMove[] = [];
    const history: SkewbMove[] = [];
    const stateMoves: SkewbMove[] = [];
    let active = false;
    let moveFrame = 0;
    let disposed = false;

    const pieceState = (group: THREE.Group): PieceTransform => {
      const collection = group.userData.kind === "corner" ? logicalState.corners : logicalState.centers;
      return collection[group.userData.pieceIndex as number];
    };

    // Snap every animated group back to the engine's exact discrete transform.
    // This prevents floating-point drift from changing later layer selection.
    const syncRenderer = () => {
      pieceGroups.forEach(group => {
        const piece = pieceState(group);
        const [a, b, c, d, e, f, g, h, i] = piece.orientation;
        const rotation = new THREE.Matrix4().set(
          a, b, c, 0,
          d, e, f, 0,
          g, h, i, 0,
          0, 0, 0, 1,
        );
        group.position.set(...piece.position);
        group.quaternion.setFromRotationMatrix(rotation);
        group.scale.set(1, 1, 1);
        group.updateMatrix();
      });
    };

    const syncUi = () => {
      const solvedNow = skewbIsSolved(logicalState);
      setMoves(history.length);
      setCanUndo(history.length > 0);
      setIsSolved(solvedNow);
      if (solvedNow) {
        stopTimer();
        setStatus("Solved!");
      }
    };

    const hardReset = () => {
      queue.length = 0;
      history.length = 0;
      stateMoves.length = 0;
      logicalState = skewbSolved();
      syncRenderer();
      resetTimer();
      setMoves(0);
      setCanUndo(false);
      setIsSolved(true);
    };

    const runNext = () => {
      if (active || !queue.length) return;
      active = true;
      setBusy(true);
      const move = queue.shift()!;
      const axisTuple = AXES[move.axis];
      const axis = new THREE.Vector3(...axisTuple).normalize();
      const selected = pieceGroups.filter(group => {
        const position = pieceState(group).position;
        return position[0] * axisTuple[0] + position[1] * axisTuple[1] + position[2] * axisTuple[2] > 0;
      });
      const pivot = new THREE.Group();
      root.add(pivot);
      selected.forEach(group => pivot.attach(group));
      const started = performance.now();
      const angle = move.direction * (2 * Math.PI / 3);
      const duration = move.fast ? 115 : 300;
      const animate = (now: number) => {
        if (disposed) return;
        const progress = Math.min(1, (now - started) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        pivot.quaternion.setFromAxisAngle(axis, angle * eased);
        if (progress < 1) {
          moveFrame = requestAnimationFrame(animate);
          return;
        }

        logicalState = applyMove(logicalState, move);
        pivot.updateMatrixWorld(true);
        selected.forEach(group => root.attach(group));
        root.remove(pivot);
        syncRenderer();

        const recordedMove: SkewbMove = { axis: move.axis, direction: move.direction };
        if (move.record !== false) history.push(recordedMove);
        if (move.track !== false) stateMoves.push(recordedMove);
        syncUi();

        active = false;
        if (!queue.length) {
          setBusy(false);
          if (!skewbIsSolved(logicalState)) {
            setStatus(move.phase === "scramble" || move.phase === "load" ? "Your turn" : "Keep going");
            if (move.phase === "scramble" || move.phase === "load") startTimer();
          }
        }
        runNext();
      };
      moveFrame = requestAnimationFrame(animate);
    };

    const enqueue = (move: QueuedMove) => {
      queue.push(move);
      runNext();
    };
    const turn = (axis: AxisName, direction: Direction) => {
      if (active || queue.length) return;
      if (skewbIsSolved(logicalState)) {
        resetTimer();
        startTimer();
      }
      enqueue({ axis, direction, phase: "play" });
    };
    const loadMoves = (sequence: SkewbMove[], notation: string, phase: "scramble" | "load") => {
      if (active || queue.length || !sequence.length) return;
      hardReset();
      setScrambleText(notation);
      setStatus(phase === "scramble" ? "Scrambling…" : "Loading scramble…");
      queue.push(...sequence.map(move => ({ ...move, record: false, fast: true, phase })));
      runNext();
    };
    const scramble = () => {
      const sequence = randomScramble(10);
      loadMoves(sequence, sequence.map(moveLabel).join(" "), "scramble");
    };
    const loadScramble = (notation: string) => {
      try {
        const sequence = parseSequence(notation);
        if (!sequence.length) {
          setStatus("Enter a Skewb scramble first.");
          return;
        }
        loadMoves(sequence, sequence.map(moveLabel).join(" "), "load");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Invalid Skewb scramble.");
      }
    };
    const undo = () => {
      if (active || queue.length || !history.length) return;
      const move = history.pop()!;
      stateMoves.pop();
      enqueue({ ...inverseMove(move), record: false, track: false, phase: "undo" });
    };
    const solve = () => {
      if (active || queue.length || skewbIsSolved(logicalState) || !stateMoves.length) return;
      setStatus("Solving…");
      const solution = inverseSequence(stateMoves);
      history.length = 0;
      stateMoves.length = 0;
      queue.push(...solution.map(move => ({ ...move, record: false, track: false, phase: "solve" as const })));
      runNext();
    };
    const resetPuzzle = () => {
      if (active || queue.length) return;
      hardReset();
      setScrambleText("");
      setStatus("Skewb ready");
    };

    actionsRef.current = {
      turn,
      scramble,
      undo,
      solve,
      resetPuzzle,
      resetView: () => controls.reset(),
      loadScramble,
    };

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
    const render = () => {
      frame = requestAnimationFrame(render);
      controls.update();
      renderer.render(scene, camera);
    };
    render();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(moveFrame);
      observer.disconnect();
      controls.dispose();
      actionsRef.current = null;
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      body.geometry.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  useEffect(() => {
    const onLoadScramble = (event: Event) => {
      const detail = (event as CustomEvent<{ puzzleType?: string; scramble?: string }>).detail;
      if (detail?.puzzleType !== "skewb" || typeof detail.scramble !== "string") return;
      actionsRef.current?.loadScramble(detail.scramble);
    };
    window.addEventListener("cube-labs:load-scramble", onLoadScramble);
    return () => window.removeEventListener("cube-labs:load-scramble", onLoadScramble);
  }, []);

  const axes = Object.keys(AXES) as AxisName[];
  return <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-5 pb-[calc(92px+env(safe-area-inset-bottom))] pt-[22px]">
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
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button disabled={busy} onClick={() => actionsRef.current?.resetPuzzle()} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">Reset Puzzle</button>
          <button onClick={() => actionsRef.current?.resetView()} className="glass min-h-12 rounded-xl font-extrabold">Reset View</button>
        </div>
      </section>
    </div>
  </main>;
}
