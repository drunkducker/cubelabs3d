"use client";

/**
 * Playable + solver Kilominx, mirroring app/PyraminxGame.tsx's shape: one raw
 * three.js scene, a turn queue driving pivot-group animations, and an
 * actionsRef exposing imperative controls to the React shell below.
 *
 * All puzzle GEOMETRY (dodecahedron vertices, faces, which corner touches which
 * faces) and all discrete MOVE/SOLVE logic come from lib/kilominx-engine.ts,
 * which is independently verified (see tests/kilominx-engine.test.ts). This
 * component's own job is narrow: place the 5 pentagonal "kite" stickers of each
 * face onto the 20 corner-piece groups, and physically spin the right 5 corners
 * around a face's normal when it turns. It re-derives no combinatorics.
 *
 * A Kilominx face turn axis passes through a FACE CENTER (its outward normal),
 * so — like the Pyraminx's vertex axes — the turn animation rotates each pivot
 * group with `quaternion.setFromAxisAngle(axis, angle)` rather than the NxN
 * engine's `pivot.rotation[axis] = angle` (which only works for world x/y/z).
 *
 * Each of the 20 corner groups is indexed by piece IDENTITY (its home slot).
 * A group's 3 coloured stickers never get reassigned; the group itself moves
 * between slots as turns happen. So "which 5 pieces does face f turn" must be
 * read from the CURRENT state — `state.cp[slot]` for the face's 5 slots — not
 * from the face's home corners, exactly as PyraminxGame reads `ep[slot]`.
 */
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import SiteHeader from "@/components/SiteHeader";
import {
  VERTICES, FACE_CORNERS, FACE_COLORS, faceNormal,
  solved as kiloSolved, applyMoveIndex, isSolved as kiloIsSolved,
  randomScramble, solve as kiloSolve, faceOfMove, dirOfMove, inverseMoveIndex,
  moveLabel, parseMove, type KiloState,
} from "@/lib/kilominx-engine";
import UniversalPuzzleActions from "@/components/UniversalPuzzleActions";

const toVec3 = (v: readonly [number, number, number]) => new THREE.Vector3(v[0], v[1], v[2]);
const TURN = (2 * Math.PI) / 5;

// A queued turn: a move index plus UI-only bookkeeping (record for undo/move
// count, fast for brisk auto-solve playback).
type QueuedMove = { moveIndex: number; record?: boolean; fast?: boolean };

function formatElapsed(ms: number) {
  const totalTenths = Math.floor(ms / 100);
  const minutes = Math.floor(totalTenths / 600);
  const seconds = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

/** The 5 corners of face f, ordered counterclockwise around the face normal so
 * consecutive entries are pentagon-adjacent. */
function orderedFaceCorners(f: number): number[] {
  const normal = faceNormal(f);
  const corners = FACE_CORNERS[f];
  const center = corners.reduce((a, c) => a.add(toVec3(VERTICES[c])), new THREE.Vector3()).multiplyScalar(1 / 5);
  const tangent = toVec3(VERTICES[corners[0]]).sub(center).normalize();
  const bitangent = new THREE.Vector3().crossVectors(toVec3(normal), tangent);
  const angle = (c: number) => {
    const p = toVec3(VERTICES[c]).sub(center);
    return Math.atan2(p.dot(bitangent), p.dot(tangent));
  };
  return corners.slice().sort((a, b) => angle(a) - angle(b));
}

/**
 * Split pentagonal face f into its 5 corner "kite" stickers. Each kite is the
 * quad bounded by a corner vertex, the midpoints of the two pentagon edges
 * touching it, and the face centre — so the 5 kites tile the whole pentagon and
 * meet at the centre (a solved face reads as one flat pentagon of a single
 * colour). Returns each kite's 4 corner points plus which corner PIECE it
 * belongs to.
 */
function faceKites(f: number): { corner: number; quad: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3] }[] {
  const ordered = orderedFaceCorners(f);
  const pts = ordered.map(c => toVec3(VERTICES[c]));
  const center = pts.reduce((a, p) => a.add(p.clone()), new THREE.Vector3()).multiplyScalar(1 / 5);
  const mid = (i: number, j: number) => pts[i].clone().add(pts[j]).multiplyScalar(0.5);
  return ordered.map((c, i) => {
    const prev = (i + 4) % 5, next = (i + 1) % 5;
    return { corner: c, quad: [pts[i].clone(), mid(i, next), center.clone(), mid(i, prev)] };
  });
}

/** Build a shrunk (gapped) quad sitting exactly on the true face plane — no
 * outward offset (the polygonOffset on the material resolves z-fighting with
 * the backing without pushing geometry off-plane, which on a dodecahedron's
 * sharp dihedral could poke into a neighbouring face). Two triangles. */
function quadGeometry(quad: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3], shrink: number) {
  const centroid = quad.reduce((a, p) => a.add(p.clone()), new THREE.Vector3()).multiplyScalar(0.25);
  const v = quad.map(p => new THREE.Vector3().lerpVectors(centroid, p, shrink));
  const positions = new Float32Array([
    v[0].x, v[0].y, v[0].z, v[1].x, v[1].y, v[1].z, v[2].x, v[2].y, v[2].z,
    v[0].x, v[0].y, v[0].z, v[2].x, v[2].y, v[2].z, v[3].x, v[3].y, v[3].z,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export default function KilominxGame() {
  const mountRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<{
    scramble: () => void; solveNow: () => void; resetPuzzle: () => void; resetView: () => void; undo: () => void; turnFace: (moveIndex: number) => void; loadScramble: (notation: string) => void;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Kilominx ready");
  const [moves, setMoves] = useState(0);
  const [isSolvedNow, setIsSolvedNow] = useState(true);
  const [canUndo, setCanUndo] = useState(false);
  const [scrambleText, setScrambleText] = useState("");
  const [solutionText, setSolutionText] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);

  // A single long-lived interval drives the live timer display (see the same
  // pattern in PyraminxGame): start/stop/reset are plain functions over refs,
  // not effect dependencies, so the interval never restarts and never closes
  // over stale state.
  const accumulatedMsRef = useRef(0);
  const segmentStartRef = useRef<number | null>(null);
  const startTimer = () => { if (segmentStartRef.current === null) segmentStartRef.current = performance.now(); };
  const stopTimer = () => {
    if (segmentStartRef.current === null) return;
    accumulatedMsRef.current += performance.now() - segmentStartRef.current;
    segmentStartRef.current = null;
    setElapsedMs(accumulatedMsRef.current);
  };
  const resetTimer = () => { accumulatedMsRef.current = 0; segmentStartRef.current = null; setElapsedMs(0); };
  useEffect(() => {
    const id = setInterval(() => {
      if (segmentStartRef.current !== null) setElapsedMs(accumulatedMsRef.current + (performance.now() - segmentStartRef.current));
    }, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#080b14");
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    const distance = 6.6;
    camera.position.set(distance * 0.7, distance * 0.55, distance);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.55));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearAlpha(0);
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.zoomSpeed = 0.8;
    controls.rotateSpeed = 0.75;
    controls.minDistance = 3.6;
    controls.maxDistance = 13;
    controls.target.set(0, 0, 0);
    controls.update();
    controls.saveState();

    scene.add(new THREE.HemisphereLight("#ffffff", "#223052", 2.1));
    const key = new THREE.DirectionalLight("#ffffff", 2.3); key.position.set(8, 12, 10); scene.add(key);
    const rim = new THREE.DirectionalLight("#5c7cff", 1.3); rim.position.set(-10, 3, -8); scene.add(rim);

    const root = new THREE.Group();
    scene.add(root);

    // 20 rigid corner-piece groups, indexed by piece identity (home slot).
    const cornerGroups = Array.from({ length: 20 }, () => { const g = new THREE.Group(); root.add(g); return g; });

    const materials: THREE.Material[] = [];
    const geometries: THREE.BufferGeometry[] = [];
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: "#0b0d12", roughness: 0.45, metalness: 0.06 });
    materials.push(bodyMaterial);
    const pickables: THREE.Mesh[] = [];

    for (let face = 0; face < 12; face++) {
      for (const kite of faceKites(face)) {
        const stickerGeo = quadGeometry(kite.quad, 0.9);
        const backingGeo = quadGeometry(kite.quad, 0.99);
        geometries.push(stickerGeo, backingGeo);
        const stickerMat = new THREE.MeshStandardMaterial({
          color: FACE_COLORS[face], roughness: 0.32, metalness: 0.02,
          emissive: FACE_COLORS[face], emissiveIntensity: 0.04,
          // FrontSide (not DoubleSide): winding faces outward, so the far side
          // of the solid never bleeds through the thin gaps between stickers.
          polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
        });
        materials.push(stickerMat);
        const sticker = new THREE.Mesh(stickerGeo, stickerMat);
        const backing = new THREE.Mesh(backingGeo, bodyMaterial);
        sticker.userData.isSticker = true;
        sticker.userData.face = face; // dragging this kite turns this face
        pickables.push(sticker);
        cornerGroups[kite.corner].add(backing);
        cornerGroups[kite.corner].add(sticker);
      }
    }

    // ---- Turn machinery (mirrors PyraminxGame's queue/runNext) ----
    let logicalState: KiloState = kiloSolved();
    let disposed = false;
    let moveFrame = 0;
    let active = false;
    const queue: QueuedMove[] = [];
    const history: QueuedMove[] = [];

    // The 5 corner groups face f currently turns = the pieces sitting in the
    // face's 5 slots RIGHT NOW, read from the live permutation.
    const groupsForFace = (face: number): THREE.Group[] =>
      FACE_CORNERS[face].map(slot => cornerGroups[logicalState.cp[slot]]);

    let highlighted: THREE.Group[] = [];
    const glowPiece = (group: THREE.Group, on: boolean) => {
      group.traverse(child => {
        if (!(child instanceof THREE.Mesh) || !child.userData.isSticker) return;
        const mat = child.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = on ? 0.3 : 0.04;
      });
    };
    const clearHighlight = () => { highlighted.forEach(g => glowPiece(g, false)); highlighted = []; };
    const highlightFace = (face: number) => {
      clearHighlight();
      highlighted = groupsForFace(face);
      highlighted.forEach(g => glowPiece(g, true));
    };

    const runNext = () => {
      if (active || !queue.length) return;
      active = true; setBusy(true);
      const move = queue.shift()!;
      const face = faceOfMove(move.moveIndex);
      const axisVec = toVec3(faceNormal(face));
      const angle = dirOfMove(move.moveIndex) === 1 ? TURN : -TURN;
      const pieces = groupsForFace(face);
      const pivot = new THREE.Group(); root.add(pivot);
      pieces.forEach(g => pivot.attach(g));
      const duration = move.fast ? 120 : 250;
      const started = performance.now();
      const animate = (now: number) => {
        if (disposed) return;
        const p = Math.min(1, (now - started) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        pivot.quaternion.setFromAxisAngle(axisVec, angle * eased);
        if (p < 1) { moveFrame = requestAnimationFrame(animate); return; }
        pivot.updateMatrixWorld(true);
        pieces.forEach(g => root.attach(g));
        root.remove(pivot);
        logicalState = applyMoveIndex(logicalState, move.moveIndex);
        const solvedNow = kiloIsSolved(logicalState);
        if (move.record !== false) history.push(move);
        setCanUndo(history.length > 0);
        setMoves(history.length);
        setIsSolvedNow(solvedNow);
        setStatus(solvedNow ? "Solved!" : queue.length ? "Solving…" : "Kilominx ready");
        if (solvedNow) stopTimer(); else startTimer();
        clearHighlight();
        active = false; setBusy(queue.length > 0); runNext();
      };
      moveFrame = requestAnimationFrame(animate);
    };

    const queueMove = (moveIndex: number, opts: { record?: boolean; fast?: boolean } = {}) => { queue.push({ moveIndex, ...opts }); runNext(); };
    const queueSequence = (indices: number[], opts: { record?: boolean; fast?: boolean } = {}) => { indices.forEach(moveIndex => queue.push({ moveIndex, ...opts })); runNext(); };

    const scramble = () => {
      if (active) return;
      const seq = randomScramble(30);
      setScrambleText(seq.map(moveLabel).join(" "));
      setSolutionText("");
      setStatus("Scrambling…");
      history.length = 0; setCanUndo(false); setMoves(0);
      resetTimer(); startTimer();
      queueSequence(seq, { record: false, fast: true });
    };
    const solveNow = () => {
      if (active) return;
      const sequence = kiloSolve(logicalState);
      if (!sequence.length) { setStatus("Already solved"); return; }
      // Show the verified solution and play it back at the normal, watchable
      // twist pace (not the brisk scramble/reset pace) so the solve reads as a
      // move-by-move solve model rather than a blur.
      setSolutionText(sequence.map(moveLabel).join(" "));
      setStatus(`Solving ${sequence.length} moves…`);
      queueSequence(sequence);
    };
    const resetPuzzle = () => {
      if (active || kiloIsSolved(logicalState)) return;
      // "Reset" is just "solve" — animate back to solved through the same
      // verified solver and queue, not a second untested transform path.
      queue.length = 0;
      history.length = 0; setCanUndo(false); setMoves(0);
      setScrambleText(""); setSolutionText(""); stopTimer(); resetTimer();
      setStatus("Resetting…");
      queueSequence(kiloSolve(logicalState), { record: false, fast: true });
    };
    const resetView = () => { controls.reset(); setStatus("View reset"); };
    const undo = () => {
      if (active || queue.length || !history.length) return;
      const previous = history.pop()!;
      setCanUndo(history.length > 0);
      setMoves(history.length);
      queueMove(inverseMoveIndex(previous.moveIndex), { record: false });
    };
    // Snap every corner group back to its solved transform. Children hold the
    // solved absolute coordinates, so clearing each group's baked transform
    // returns the whole puzzle to solved without animating.
    const hardReset = () => {
      cornerGroups.forEach(g => { g.position.set(0, 0, 0); g.quaternion.identity(); g.scale.set(1, 1, 1); });
      logicalState = kiloSolved();
    };
    const loadScramble = (notation: string) => {
      if (active) return;
      let indices: number[];
      try { indices = notation.trim().split(/\s+/).filter(Boolean).map(parseMove); } catch { return; }
      if (!indices.length) return;
      queue.length = 0;
      hardReset();
      history.length = 0; setCanUndo(false); setMoves(0);
      setScrambleText(notation);
      setSolutionText("");
      setStatus("Loading scramble…");
      resetTimer(); startTimer();
      queueSequence(indices, { record: false, fast: true });
    };

    actionsRef.current = { scramble, solveNow, resetPuzzle, resetView, undo, turnFace: (moveIndex) => queueMove(moveIndex), loadScramble };

    // ---- Swipe-to-turn: drag a face sticker to turn that face; drag empty
    // space to orbit. Each kite belongs to exactly one face, so the touched
    // sticker names the face; the drag direction gives the turn sign. For the
    // candidate face, the screen-space direction a point at the touched
    // location moves under a small POSITIVE rotation is `axis × hitPoint`
    // (the axis passes through the origin). Dotting its projection with the
    // drag gives the sign — same trick as PyraminxGame.
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerStart: { pointerId: number; clientX: number; clientY: number; hitPoint: THREE.Vector3; face: number } | null = null;
    let previewMove: number | null = null;
    let activePointers = 0;

    const setPointerFromEvent = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
    };
    const projectedScreenDirection = (worldDirection: THREE.Vector3, origin: THREE.Vector3) => {
      const originProjected = origin.clone().project(camera);
      const endpointProjected = origin.clone().add(worldDirection).project(camera);
      return new THREE.Vector2(endpointProjected.x - originProjected.x, -(endpointProjected.y - originProjected.y)).normalize();
    };
    const resolveMove = (face: number, hitPoint: THREE.Vector3, dx: number, dy: number): number => {
      const axis = toVec3(faceNormal(face));
      const tangent = axis.clone().cross(hitPoint);
      const drag = new THREE.Vector2(dx, dy).normalize();
      const score = tangent.lengthSq() < 1e-8 ? 1 : drag.dot(projectedScreenDirection(tangent.normalize(), hitPoint));
      return face * 2 + (score >= 0 ? 0 : 1); // 2f = "+" , 2f+1 = "-"
    };

    const onPointerDown = (event: PointerEvent) => {
      activePointers += 1;
      previewMove = null;
      if (active || activePointers > 1) { pointerStart = null; controls.enabled = true; clearHighlight(); return; }
      setPointerFromEvent(event);
      const hit = raycaster.intersectObjects(pickables, true)[0];
      if (!hit) { controls.enabled = true; return; }
      const face = hit.object.userData.face as number | undefined;
      if (face === undefined) { controls.enabled = true; return; }
      pointerStart = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, hitPoint: hit.point.clone(), face };
      event.preventDefault();
      controls.enabled = false;
      renderer.domElement.setPointerCapture(event.pointerId);
      setStatus("Swipe to turn");
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!pointerStart || event.pointerId !== pointerStart.pointerId || activePointers > 1) return;
      event.preventDefault();
      const dx = event.clientX - pointerStart.clientX, dy = event.clientY - pointerStart.clientY;
      if (Math.hypot(dx, dy) < 16) return;
      previewMove = resolveMove(pointerStart.face, pointerStart.hitPoint, dx, dy);
      highlightFace(pointerStart.face);
      setStatus(`Selected ${moveLabel(previewMove)}`);
    };
    const finishPointer = (event: PointerEvent) => {
      activePointers = Math.max(0, activePointers - 1);
      if (!pointerStart || event.pointerId !== pointerStart.pointerId) { if (activePointers === 0) controls.enabled = true; return; }
      const start = pointerStart; pointerStart = null;
      const dx = event.clientX - start.clientX, dy = event.clientY - start.clientY;
      if (Math.hypot(dx, dy) >= 34 && !active) {
        queueMove(previewMove ?? resolveMove(start.face, start.hitPoint, dx, dy));
      } else {
        clearHighlight();
        setStatus(kiloIsSolved(logicalState) ? "Solved!" : "Kilominx ready");
      }
      controls.enabled = activePointers === 0;
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown, true);
    renderer.domElement.addEventListener("pointermove", onPointerMove, true);
    renderer.domElement.addEventListener("pointerup", finishPointer, true);
    renderer.domElement.addEventListener("pointercancel", finishPointer, true);

    const resize = () => {
      const w = Math.max(1, mount.clientWidth), h = Math.max(1, mount.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    window.addEventListener("resize", resize);
    resize();

    let frame = 0;
    const render = () => { frame = requestAnimationFrame(render); controls.update(); renderer.render(scene, camera); };
    render();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame); cancelAnimationFrame(moveFrame); observer.disconnect();
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown, true);
      renderer.domElement.removeEventListener("pointermove", onPointerMove, true);
      renderer.domElement.removeEventListener("pointerup", finishPointer, true);
      renderer.domElement.removeEventListener("pointercancel", finishPointer, true);
      controls.dispose(); actionsRef.current = null;
      materials.forEach(m => m.dispose());
      geometries.forEach(g => g.dispose());
      renderer.dispose(); renderer.domElement.remove();
    };
  }, []);

  const faceButtons = Array.from({ length: 12 }, (_, f) => f);
  const description = "Swipe a sticker to turn its face. Scramble to start a timed attempt, or let the verified solver play back the full solution.";

  return <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[22px]">
    <div className="orb orb-a" /><div className="orb orb-b" />
    <div className="relative z-[1]">
      <SiteHeader />
      <Link href="/solve" className="mt-4 inline-flex text-sm font-bold text-[var(--muted)]">← Back to solvers</Link>
      <section className="mt-5">
        <p className="text-xs font-extrabold tracking-[.18em] text-[var(--purple)]">KILOMINX</p>
        <h1 className="mt-2 text-[39px] font-extrabold leading-[1.02] tracking-[-1px]">Play &amp; solve<br /><span className="accent-text">the Kilominx</span></h1>
        <p className="mt-3 text-[15px] leading-6 text-[var(--muted)]">{description}</p>
      </section>

      <section className="glass mt-3 overflow-hidden rounded-[22px]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 text-sm text-[var(--muted)]">
          <span>{status}</span>
          <span className="flex items-center gap-3">
            <span className="tabular-nums text-[var(--text)]">{formatElapsed(elapsedMs)}</span>
            <strong className="text-[var(--text)]">{moves} moves</strong>
          </span>
        </div>
        <div ref={mountRef} className="h-[430px] w-full touch-none sm:h-[480px]" />
        <div className="pointer-events-none px-4 pb-3 text-center text-[13px] font-semibold text-[var(--muted)]">Swipe a sticker to turn • Drag empty space to rotate</div>
      </section>

      <section className="glass mt-3 rounded-[18px] p-4"><p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">SCRAMBLE</p><p className="mt-2 min-h-6 break-words text-sm leading-6 text-[var(--text)]">{scrambleText || "Tap Scramble to start a timed attempt."}</p></section>

      {solutionText ? <section className="glass mt-3 rounded-[18px] p-4"><p className="text-xs font-extrabold tracking-[.16em] text-[var(--purple)]">SOLUTION</p><p className="mt-2 break-words font-mono text-xs leading-6 text-[var(--text)]">{solutionText}</p></section> : null}

      <Suspense fallback={<section className="glass mt-3 min-h-[72px] rounded-[18px]" />}>
        <UniversalPuzzleActions
          placement="inline"
          puzzleType="kilominx"
          currentScramble={scrambleText}
          onLoadScramble={(notation) => actionsRef.current?.loadScramble(notation)}
        />
      </Suspense>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button disabled={busy} onClick={() => actionsRef.current?.scramble()} className="cta-purple min-h-12 rounded-xl font-extrabold disabled:opacity-40">Scramble</button>
        <button disabled={busy || !canUndo} onClick={() => actionsRef.current?.undo()} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">↶ Undo</button>
        <button disabled={busy || isSolvedNow} onClick={() => actionsRef.current?.solveNow()} className="cta-green min-h-12 rounded-xl font-extrabold disabled:opacity-40">Solve</button>
      </div>

      <details className="glass mt-3 rounded-[18px] p-3">
        <summary className="cursor-pointer text-sm font-extrabold text-[var(--muted)]">Face turn buttons</summary>
        <p className="mt-3 text-xs leading-5 text-[var(--muted)]">Faces are numbered 1–12; the primed button (′) turns that face the other way.</p>
        <div className="mt-3 grid grid-cols-6 gap-1.5">{faceButtons.map(f => <button key={f} disabled={busy} onClick={() => actionsRef.current?.turnFace(f * 2)} className="glass min-h-11 rounded-lg text-sm font-extrabold disabled:opacity-40">{f + 1}</button>)}</div>
        <div className="mt-1.5 grid grid-cols-6 gap-1.5">{faceButtons.map(f => <button key={`${f}p`} disabled={busy} onClick={() => actionsRef.current?.turnFace(f * 2 + 1)} className="glass min-h-11 rounded-lg text-sm font-extrabold disabled:opacity-40">{f + 1}′</button>)}</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={() => actionsRef.current?.resetView()} className="glass min-h-12 rounded-xl font-extrabold">Reset View</button>
          <button disabled={busy || isSolvedNow} onClick={() => actionsRef.current?.resetPuzzle()} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">Reset Puzzle</button>
        </div>
      </details>

      <section className="glass mt-3 rounded-[18px] p-4 text-sm leading-6 text-[var(--muted)]">
        <p><strong className="text-[var(--text)]">Swipe a sticker:</strong> drag across any face sticker to turn that face — the puzzle picks the direction from the drag.</p>
        <p><strong className="text-[var(--text)]">Drag empty space:</strong> rotate the camera to inspect all twelve faces.</p>
        <p><strong className="text-[var(--text)]">Solver:</strong> a verified reduction solver — every solution is checked against the engine. Tap <strong className="text-[var(--text)]">Solve</strong> to see the full solution and watch the puzzle twist through it move by move. Solutions are correct but not move-optimal, so a solve can be long.</p>
      </section>
    </div>
  </main>;
}
