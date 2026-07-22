"use client";

/**
 * Playable + solver Pyraminx engine, mirroring app/NxNCubeGame.tsx's shape:
 * one raw three.js scene, a turn queue driving pivot-group animations, and
 * an actionsRef exposing imperative controls to the React shell below.
 *
 * All puzzle GEOMETRY (vertices, faces, edges, which piece touches which
 * face) and all discrete MOVE/SOLVE logic come from lib/pyraminx-engine.ts,
 * which is independently verified (see the round-trip tests referenced in
 * CUBE-ENGINE-NOTES.md). This component's own job is narrow: place sticker
 * triangles at the right spots and physically turn the right pieces —
 * it does not re-derive any combinatorics of its own.
 *
 * One geometric difference from the NxN cube engine matters here: a Pyraminx
 * turn axis passes through a VERTEX, not through a world X/Y/Z axis, so the
 * turn animation rotates each pivot group with
 * `quaternion.setFromAxisAngle(axis, angle)` instead of the NxN engine's
 * `pivot.rotation[axis] = angle` (which only works when axis is literally x/y/z).
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import SiteHeader from "@/components/SiteHeader";
import {
  VERTICES, FACE_VERTICES, FACE_COLORS, EDGE_PAIRS, EDGES_AT_VERTEX,
  solved as pyraSolved, applyMove as pyraApplyMove, isSolved as pyraIsSolved,
  randomScramble, solve as pyraSolve, parseMove, moveLabel,
  type PyraState, type PyraMove,
} from "@/lib/pyraminx-engine";

const toVec3 = (v: readonly [number, number, number]) => new THREE.Vector3(v[0], v[1], v[2]);
const TWO_PI_3 = (2 * Math.PI) / 3;
// `record` is a UI-only bookkeeping flag for undo (mirrors NxNCubeGame's
// `Move.record`) — kept as a local extension rather than added to the
// shared, pure `PyraMove` type in lib/pyraminx-engine.ts.
type QueuedMove = PyraMove & { record?: boolean };
type Pick = { kind: "tip"; vertex: number } | { kind: "edge"; edge: number };
type PointerStart = { pointerId: number; clientX: number; clientY: number; hitPoint: THREE.Vector3; pick: Pick };
type Gesture = { vertex: 0 | 1 | 2 | 3; direction: 1 | -1 };

function formatElapsed(ms: number) {
  const totalTenths = Math.floor(ms / 100);
  const minutes = Math.floor(totalTenths / 600);
  const seconds = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

/**
 * Splits triangular face `faceIndex` into its 9 standard cells (a Pyraminx
 * face divided into 3 rows) using integer barycentric coordinates (denominator
 * n=3), and classifies each cell as belonging to a tip, an edge, or the
 * face's center piece. This exact classification rule (a cell touching one
 * of the face's 3 real corners is a tip cell; a cell with 2 corners sharing
 * a zero coordinate lies flush against one of the face's 3 real edges; the
 * remaining 3 cells belong to the center) was verified numerically before
 * being used here — see the barycentric-subdivision check referenced in
 * CUBE-ENGINE-NOTES.md — rather than assumed from a mental picture of the
 * puzzle, which is easy to get subtly wrong (this file's author did, once).
 */
function faceCells(faceIndex: number) {
  // FACE_VERTICES[k] lists 3 vertex indices with no guarantee they wind
  // counter-clockwise as seen from outside the tetrahedron — for a
  // tetrahedron specifically, "vertices other than k, in ascending index
  // order" alternates between CCW and CW depending on k's parity. Rendering
  // every face's triangles with whatever winding falls out of that ordering
  // left 2 of the 4 faces backwards: normals pointing inward, which THREE.js's
  // face culling reads as "facing the camera" whenever that face should
  // actually be hidden on the far side of the puzzle — the wrong face wins
  // the depth conversation and bleeds through the correct one. Verify the
  // winding against the face's true outward direction and swap two vertices
  // to correct it, rather than hardcoding which faces need it.
  let [vA, vB, vC] = FACE_VERTICES[faceIndex];
  const outwardCheck = toVec3(VERTICES[faceIndex]).multiplyScalar(-1);
  const rawA = toVec3(VERTICES[vA]), rawB = toVec3(VERTICES[vB]), rawC = toVec3(VERTICES[vC]);
  const windingNormal = new THREE.Vector3().subVectors(rawB, rawA).cross(new THREE.Vector3().subVectors(rawC, rawA));
  if (windingNormal.dot(outwardCheck) < 0) [vB, vC] = [vC, vB];

  const verts = [vA, vB, vC];
  const A = toVec3(VERTICES[vA]), B = toVec3(VERTICES[vB]), C = toVec3(VERTICES[vC]);
  const P = (i: number, j: number, k: number) =>
    new THREE.Vector3().addScaledVector(A, i / 3).addScaledVector(B, j / 3).addScaledVector(C, k / 3);

  type Cell = { corners: [THREE.Vector3, THREE.Vector3, THREE.Vector3]; target: { kind: "tip"; vertex: number } | { kind: "edge"; edge: number } | { kind: "center" } };
  const cells: Cell[] = [];

  const classify = (ijk: [number, number, number][]): Cell["target"] => {
    const tipPos = ijk.findIndex(c => c.some(v => v === 3));
    if (tipPos >= 0) {
      const axisIndex = ijk[tipPos].findIndex(v => v === 3);
      return { kind: "tip", vertex: verts[axisIndex] };
    }
    for (let pos = 0; pos < 3; pos++) {
      if (ijk.filter(c => c[pos] === 0).length >= 2) {
        const otherTwo = [0, 1, 2].filter(p => p !== pos).map(p => verts[p]);
        const [lo, hi] = otherTwo.sort((a, b) => a - b);
        const edge = EDGE_PAIRS.findIndex(([i, j]) => i === lo && j === hi);
        return { kind: "edge", edge };
      }
    }
    return { kind: "center" };
  };

  // 6 upward cells: i+j+k = 2.
  for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2 - i; j++) {
    const k = 2 - i - j;
    const ijk: [number, number, number][] = [[i + 1, j, k], [i, j + 1, k], [i, j, k + 1]];
    cells.push({ corners: [P(...ijk[0]), P(...ijk[1]), P(...ijk[2])], target: classify(ijk) });
  }
  // 3 downward cells: i+j+k = 1. Their natural corner order
  // ([i+1,j+1,k], [i+1,j,k+1], [i,j+1,k+1]) winds opposite to the upward
  // cells' — confirmed by computing both cells' cross-product normals
  // against the same reference and finding downward cells consistently
  // flipped, regardless of which face they're on. `classify` only cares
  // about the barycentric values, not their order, so it keeps the natural
  // ijk; only the rendered `corners` swap the last two to match upward
  // cells' winding.
  for (let i = 0; i <= 1; i++) for (let j = 0; j <= 1 - i; j++) {
    const k = 1 - i - j;
    const ijk: [number, number, number][] = [[i + 1, j + 1, k], [i + 1, j, k + 1], [i, j + 1, k + 1]];
    cells.push({ corners: [P(...ijk[0]), P(...ijk[2]), P(...ijk[1])], target: classify(ijk) });
  }
  return cells;
}

/**
 * Builds a shrunk (gapped) copy of `corners` sitting exactly on the true
 * face plane — no outward offset.
 *
 * An earlier version nudged the sticker outward along the face normal to
 * avoid it z-fighting with its own backing triangle underneath. That works
 * for a flat cube face, but a Pyraminx's 4 faces meet at a sharp ~70.5°
 * dihedral angle: near a shared vertex or edge, even a small outward push
 * can carry a sticker's geometry past the plane of the *neighboring* face,
 * making it visible where it shouldn't be — confirmed by reproducing the
 * bug and watching it get worse as the offset was increased, not better.
 * `polygonOffset` on the sticker material (set where it's created) resolves
 * the sticker/backing z-fight in depth-buffer space instead, so neither
 * layer ever actually leaves the true face plane and neither can overshoot
 * into a neighboring face.
 */
function triangleGeometry(corners: [THREE.Vector3, THREE.Vector3, THREE.Vector3], shrink: number) {
  const centroid = new THREE.Vector3().add(corners[0]).add(corners[1]).add(corners[2]).multiplyScalar(1 / 3);
  const positions = new Float32Array(9);
  corners.forEach((corner, i) => {
    const shrunk = new THREE.Vector3().lerpVectors(centroid, corner, shrink);
    positions[i * 3] = shrunk.x; positions[i * 3 + 1] = shrunk.y; positions[i * 3 + 2] = shrunk.z;
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export default function PyraminxGame({ variant = "full" }: { variant?: "full" | "focus" }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<{
    scramble: () => void; solveNow: () => void; resetPuzzle: () => void; resetView: () => void; undo: () => void; turnLabel: (label: string) => void;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Pyraminx ready");
  const [moves, setMoves] = useState(0);
  const [isSolvedNow, setIsSolvedNow] = useState(true);
  const [canUndo, setCanUndo] = useState(false);
  const [scrambleSequence, setScrambleSequence] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);

  // A single long-lived interval drives the live timer display. It ticks
  // for the component's whole lifetime but only produces a visible update
  // while `segmentStartRef` is non-null (i.e. a timed attempt is actually
  // running) — this sidesteps the usual "setInterval closing over stale
  // state" and "effect restarts every tick" pitfalls of timer state in
  // React, since start/stop/reset are plain functions over refs, not
  // effect dependencies.
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
    const focusLayout = variant === "focus";
    scene.background = focusLayout ? null : new THREE.Color("#080b14");
    const camera = new THREE.PerspectiveCamera(focusLayout ? 37 : 34, 1, 0.1, 100);
    const distance = 6.4 / 1.5; // ~1.5x larger on first paint than the original framing
    camera.position.set(distance * 0.82, distance * 0.68, distance);

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
    controls.minDistance = 3.2;
    controls.maxDistance = 11;
    controls.target.set(0, 0, 0);
    controls.update();
    controls.saveState();

    scene.add(new THREE.HemisphereLight("#ffffff", "#223052", 2.2));
    const key = new THREE.DirectionalLight("#ffffff", 2.4); key.position.set(8, 12, 10); scene.add(key);
    const rim = new THREE.DirectionalLight("#5c7cff", 1.4); rim.position.set(-10, 3, -8); scene.add(rim);

    const root = new THREE.Group();
    scene.add(root);

    // 14 rigid piece groups: 4 tips + 6 edges + 4 centers. Every sticker cell
    // computed below gets added as a child of exactly one of these, so
    // turning a piece later is just "pivot this group."
    const tipGroups = [0, 1, 2, 3].map(() => { const g = new THREE.Group(); root.add(g); return g; });
    const edgeGroups = [0, 1, 2, 3, 4, 5].map(() => { const g = new THREE.Group(); root.add(g); return g; });
    const centerGroups = [0, 1, 2, 3].map(() => { const g = new THREE.Group(); root.add(g); return g; });

    const materials: THREE.Material[] = [];
    const geometries: THREE.BufferGeometry[] = [];
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: "#111318", roughness: 0.4, metalness: 0.06 });
    materials.push(bodyMaterial);
    const pickables: THREE.Mesh[] = [];

    for (let face = 0; face < 4; face++) {
      for (const cell of faceCells(face)) {
        const stickerGeo = triangleGeometry(cell.corners, 0.78);
        const backingGeo = triangleGeometry(cell.corners, 0.94);
        geometries.push(stickerGeo, backingGeo);
        const stickerMat = new THREE.MeshStandardMaterial({
          color: FACE_COLORS[face], roughness: 0.3, metalness: 0.02, emissive: FACE_COLORS[face], emissiveIntensity: 0.035,
          // Deliberately NOT THREE.DoubleSide. With winding verified correct
          // (see faceCells' comments), every sticker's front side already
          // faces outward. Rendering both sides let the FAR side of the
          // tetrahedron — normally hidden — show through the intentional
          // gaps between near-side stickers (the gaps have nothing blocking
          // that view once the near sticker doesn't cover the ray). Bright,
          // differently-lit interior surfaces bled through as streaks
          // exactly tracing the gap pattern. FrontSide culls those interior
          // faces properly, so only genuinely visible geometry renders.
          polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
        });
        materials.push(stickerMat);
        const sticker = new THREE.Mesh(stickerGeo, stickerMat);
        const backing = new THREE.Mesh(backingGeo, bodyMaterial);
        sticker.userData.isSticker = true;
        // Only tip/edge stickers are grabbable — centers never turn, so
        // tapping one should fall through to camera orbit like empty space.
        if (cell.target.kind === "tip") { sticker.userData.pick = { kind: "tip", vertex: cell.target.vertex } satisfies Pick; pickables.push(sticker); }
        else if (cell.target.kind === "edge") { sticker.userData.pick = { kind: "edge", edge: cell.target.edge } satisfies Pick; pickables.push(sticker); }

        const group = cell.target.kind === "tip" ? tipGroups[cell.target.vertex]
          : cell.target.kind === "edge" ? edgeGroups[cell.target.edge]
          : centerGroups[face];
        group.add(backing);
        group.add(sticker);
      }
    }

    // ---- Turn machinery: mirrors NxNCubeGame's queue/runNext, but pivots
    // around an arbitrary vertex axis via quaternion instead of a world axis.
    let logicalState: PyraState = pyraSolved();
    let disposed = false;
    let moveFrame = 0;
    let active = false;
    const queue: QueuedMove[] = [];
    const history: QueuedMove[] = [];

    // `edgeGroups[p]` is indexed by piece IDENTITY (its home slot at
    // construction), not by current position — a piece's colored stickers
    // never get reassigned, so the group itself is what physically moves
    // between slots as turns are made. Selecting "which pieces to turn" by
    // EDGES_AT_VERTEX[vertex] directly would grab whichever pieces call
    // this vertex home, not whichever pieces are actually sitting there
    // right now — correct only for a freshly-solved puzzle. After a single
    // scramble move it grabs the wrong pieces, and every following move
    // compounds the error, which is exactly why the puzzle still looked
    // scrambled after a "solve" that the logical engine verified as
    // correct: the logical state was right, but the wrong physical pieces
    // were being rotated the whole time. `logicalState.ep[slot]` gives the
    // piece CURRENTLY at each slot — same principle as NxNCubeGame
    // filtering cubies by current grid position rather than original index.
    const groupsForMove = (move: PyraMove): THREE.Group[] => {
      const groups = [tipGroups[move.vertex]];
      if (move.depth === "deep") {
        EDGES_AT_VERTEX[move.vertex].forEach(slot => groups.push(edgeGroups[logicalState.ep[slot]]));
      }
      return groups;
    };

    let highlighted: THREE.Group[] = [];
    const glowPiece = (group: THREE.Group, intensity: number) => {
      group.traverse(child => {
        if (!(child instanceof THREE.Mesh) || !child.userData.isSticker) return;
        const mat = child.material as THREE.MeshStandardMaterial;
        mat.emissive.set(intensity ? "#ffffff" : mat.color);
        mat.emissiveIntensity = intensity || 0.035;
      });
    };
    const clearHighlight = () => { highlighted.forEach(g => glowPiece(g, 0)); highlighted = []; };
    const highlightMove = (gesture: Gesture) => {
      clearHighlight();
      highlighted = groupsForMove({ vertex: gesture.vertex, direction: gesture.direction, depth: "deep" });
      highlighted.forEach(g => glowPiece(g, 0.32));
    };

    const runNext = () => {
      if (active || !queue.length) return;
      active = true; setBusy(true);
      const move = queue.shift()!;
      const axisVec = toVec3(VERTICES[move.vertex]).normalize();
      const angle = move.direction === 1 ? TWO_PI_3 : -TWO_PI_3;
      const pieces = groupsForMove(move);
      const pivot = new THREE.Group(); root.add(pivot);
      pieces.forEach(g => pivot.attach(g));
      const started = performance.now();
      const animate = (now: number) => {
        if (disposed) return;
        const p = Math.min(1, (now - started) / 280);
        const eased = 1 - Math.pow(1 - p, 3);
        pivot.quaternion.setFromAxisAngle(axisVec, angle * eased);
        if (p < 1) { moveFrame = requestAnimationFrame(animate); return; }
        pivot.updateMatrixWorld(true);
        pieces.forEach(g => root.attach(g));
        root.remove(pivot);
        logicalState = pyraApplyMove(logicalState, move);
        const solvedNow = pyraIsSolved(logicalState);
        // Scramble setup and reset cleanup are queued with record:false —
        // excluded from the move count and the undo stack, since neither
        // represents the player's own solving effort. Everything else
        // (manual turns, swipe turns, and the auto-solver's moves) counts,
        // matching NxNCubeGame's history-length-is-the-move-count model.
        if (move.record !== false) history.push(move);
        setCanUndo(history.length > 0);
        setMoves(history.length);
        setIsSolvedNow(solvedNow);
        setStatus(solvedNow ? "Solved!" : "Pyraminx ready");
        if (solvedNow) stopTimer(); else startTimer();
        clearHighlight();
        active = false; setBusy(queue.length > 0); runNext();
      };
      moveFrame = requestAnimationFrame(animate);
    };

    const queueLabel = (label: string, record = true) => { queue.push({ ...parseMove(label), record }); runNext(); };
    const queueSequence = (labels: string[], record = true) => { labels.forEach(l => queue.push({ ...parseMove(l), record })); runNext(); };

    const scramble = () => {
      if (active) return;
      const seq = randomScramble(9);
      setScrambleSequence(seq);
      setStatus("Scrambling…");
      history.length = 0; setCanUndo(false); setMoves(0);
      resetTimer(); startTimer();
      queueSequence(seq.split(" "), false);
    };
    const solveNow = () => {
      if (active) return;
      const sequence = pyraSolve(logicalState);
      if (!sequence.length) { setStatus("Already solved"); return; }
      setStatus("Solving…");
      queueSequence(sequence);
    };
    const resetPuzzle = () => {
      if (active || pyraIsSolved(logicalState)) return;
      // "Reset" is just "solve" — both mean "animate back to the solved
      // state" — so this reuses the same verified solver and turn queue
      // rather than snapping transforms directly through a second,
      // untested code path. Queued with record:false and the trackers are
      // cleared immediately: reset abandons the current attempt rather than
      // completing it, so it shouldn't count toward moves/time/undo.
      queue.length = 0;
      history.length = 0; setCanUndo(false); setMoves(0);
      setScrambleSequence(""); stopTimer(); resetTimer();
      setStatus("Resetting…");
      queueSequence(pyraSolve(logicalState), false);
    };
    const resetView = () => { controls.reset(); setStatus("View reset"); };
    const undo = () => {
      if (active || queue.length || !history.length) return;
      const previous = history.pop()!;
      setCanUndo(history.length > 0);
      setMoves(history.length);
      const inverse: QueuedMove = { vertex: previous.vertex, direction: previous.direction === 1 ? -1 : 1, depth: previous.depth, record: false };
      queue.push(inverse);
      runNext();
    };

    actionsRef.current = { scramble, solveNow, resetPuzzle, resetView, undo, turnLabel: queueLabel };

    // ---- Swipe-to-turn: mobile-first primary interaction. Tap+drag a tip
    // or edge sticker to turn it; drag empty space (or a center sticker,
    // which is never pickable) to orbit the camera instead.
    //
    // A Pyraminx turn axis passes through a VERTEX, not a world axis, so
    // resolving "which way did the user drag" can't reuse a fixed
    // axis-to-screen-direction table the way a cube's face turns can. For a
    // candidate vertex, the instantaneous screen-space direction a point at
    // the touched location would move under a small POSITIVE rotation is
    // `axis × hitPoint` (standard rotational-velocity formula; the axis
    // passes through the origin, so the touched point's position vector IS
    // its offset from the axis). Projecting that to screen space and taking
    // its dot product with the actual drag vector scores how well each
    // candidate vertex explains the drag; the best-scoring vertex wins, and
    // the sign of that dot product gives the turn direction. A tip sticker
    // only has one candidate vertex (itself); an edge sticker has two (its
    // two endpoints), exactly mirroring how NxNCubeGame's resolveGesture
    // picks among candidate axes for a cube layer swipe.
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerStart: PointerStart | null = null;
    let previewGesture: Gesture | null = null;
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
    const resolveGesture = (start: PointerStart, dx: number, dy: number): Gesture => {
      const candidates = start.pick.kind === "tip" ? [start.pick.vertex] : EDGE_PAIRS[start.pick.edge];
      const drag = new THREE.Vector2(dx, dy).normalize();
      let bestVertex = candidates[0], bestScore = 0;
      for (const vertex of candidates) {
        const axis = toVec3(VERTICES[vertex]).normalize();
        const tangent = axis.clone().cross(start.hitPoint);
        if (tangent.lengthSq() < 1e-8) continue;
        const score = drag.dot(projectedScreenDirection(tangent.normalize(), start.hitPoint));
        if (Math.abs(score) > Math.abs(bestScore)) { bestVertex = vertex; bestScore = score; }
      }
      return { vertex: bestVertex as Gesture["vertex"], direction: (bestScore >= 0 ? 1 : -1) as 1 | -1 };
    };

    const onPointerDown = (event: PointerEvent) => {
      activePointers += 1;
      previewGesture = null;
      if (active || activePointers > 1) { pointerStart = null; controls.enabled = true; clearHighlight(); return; }
      setPointerFromEvent(event);
      const hit = raycaster.intersectObjects(pickables, true)[0];
      if (!hit) { controls.enabled = true; return; }
      const pick = hit.object.userData.pick as Pick | undefined;
      if (!pick) { controls.enabled = true; return; }
      pointerStart = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, hitPoint: hit.point.clone(), pick };
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
      const gesture = resolveGesture(pointerStart, dx, dy);
      previewGesture = gesture;
      highlightMove(gesture);
      setStatus(`Selected ${moveLabel({ vertex: gesture.vertex, direction: gesture.direction, depth: "deep" })}`);
    };
    const finishPointer = (event: PointerEvent) => {
      activePointers = Math.max(0, activePointers - 1);
      if (!pointerStart || event.pointerId !== pointerStart.pointerId) { if (activePointers === 0) controls.enabled = true; return; }
      const start = pointerStart; pointerStart = null;
      const dx = event.clientX - start.clientX, dy = event.clientY - start.clientY;
      if (Math.hypot(dx, dy) >= 34 && !active) {
        const gesture = previewGesture ?? resolveGesture(start, dx, dy);
        queueLabel(moveLabel({ vertex: gesture.vertex, direction: gesture.direction, depth: "deep" }));
      } else {
        clearHighlight();
        setStatus(pyraIsSolved(logicalState) ? "Solved!" : "Pyraminx ready");
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
  }, [variant]);

  const deepMoves = ["U", "L", "R", "B"];
  const tipMoves = ["u", "l", "r", "b"];

  const description = "Swipe a sticker to turn it. Scramble to start a timed attempt, or let the verified solver play back the full solution.";

  return <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[22px]">
    <div className="orb orb-a" /><div className="orb orb-b" />
    <div className="relative z-[1]">
      <SiteHeader />
      <Link href="/solve" className="mt-4 inline-flex text-sm font-bold text-[var(--muted)]">← Back to solvers</Link>
      <section className="mt-5">
        <p className="text-xs font-extrabold tracking-[.18em] text-[var(--green)]">PYRAMINX</p>
        <h1 className="mt-2 text-[39px] font-extrabold leading-[1.02] tracking-[-1px]">Play &amp; solve<br /><span className="accent-text">the Pyraminx</span></h1>
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

      <section className="glass mt-3 rounded-[18px] p-4"><p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">SCRAMBLE</p><p className="mt-2 min-h-6 break-words text-sm leading-6 text-[var(--text)]">{scrambleSequence || "Tap Scramble to start a timed attempt."}</p></section>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button disabled={busy} onClick={() => actionsRef.current?.scramble()} className="cta-purple min-h-12 rounded-xl font-extrabold disabled:opacity-40">Scramble</button>
        <button disabled={busy || !canUndo} onClick={() => actionsRef.current?.undo()} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">↶ Undo</button>
        <button disabled={busy || isSolvedNow} onClick={() => actionsRef.current?.solveNow()} className="cta-green min-h-12 rounded-xl font-extrabold disabled:opacity-40">Solve</button>
      </div>

      <details className="glass mt-3 rounded-[18px] p-3">
        <summary className="cursor-pointer text-sm font-extrabold text-[var(--muted)]">Controls if needed</summary>
        <div className="mt-3 grid grid-cols-4 gap-2">{deepMoves.map(label => <button key={label} disabled={busy} onClick={() => actionsRef.current?.turnLabel(label)} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">{label}</button>)}</div>
        <div className="mt-2 grid grid-cols-4 gap-2">{deepMoves.map(label => <button key={`${label}'`} disabled={busy} onClick={() => actionsRef.current?.turnLabel(`${label}'`)} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">{label}&apos;</button>)}</div>
        <p className="mt-3 text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">TIP TWISTS</p>
        <div className="mt-2 grid grid-cols-4 gap-2">{tipMoves.map(label => <button key={label} disabled={busy} onClick={() => actionsRef.current?.turnLabel(label)} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">{label}</button>)}</div>
        <div className="mt-2 grid grid-cols-4 gap-2">{tipMoves.map(label => <button key={`${label}'`} disabled={busy} onClick={() => actionsRef.current?.turnLabel(`${label}'`)} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">{label}&apos;</button>)}</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={() => actionsRef.current?.resetView()} className="glass min-h-12 rounded-xl font-extrabold">Reset View</button>
          <button disabled={busy || isSolvedNow} onClick={() => actionsRef.current?.resetPuzzle()} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">Reset Puzzle</button>
        </div>
      </details>

      <section className="glass mt-3 rounded-[18px] p-4 text-sm leading-6 text-[var(--muted)]">
        <p><strong className="text-[var(--text)]">Swipe a sticker:</strong> drag across a tip or edge sticker to turn that vertex — the puzzle picks the layer and direction from the drag.</p>
        <p><strong className="text-[var(--text)]">Drag empty space:</strong> rotate the camera to inspect all four faces.</p>
        <p><strong className="text-[var(--text)]">Timer:</strong> starts on Scramble, stops the moment the puzzle is solved.</p>
      </section>
    </div>
  </main>;
}
