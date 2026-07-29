"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";
import SiteHeader from "@/components/SiteHeader";
import UniversalPuzzleActions from "@/components/UniversalPuzzleActions";
import {
  AXES,
  CENTER_POSITIONS,
  CORNER_POSITIONS,
  type AxisName,
  type Direction,
  type LayerSide,
  type PieceTransform,
  type SkewbMove,
  applyMove,
  inverseMove,
  isPositionInLayer,
  isSolved as skewbIsSolved,
  layersForPosition,
  moveLabel,
  parseSequence,
  pivotVector,
  randomScramble,
  solve as solveSkewb,
  solved as skewbSolved,
  verifySolution,
} from "@/lib/skewb-engine";

type ViewMode = "turn" | "view";
type MovePhase = "play" | "scramble" | "load" | "undo" | "solve";
type QueuedMove = SkewbMove & { record?: boolean; fast?: boolean; phase?: MovePhase };
type FaceBasis = { normal: THREE.Vector3; u: THREE.Vector3; v: THREE.Vector3 };
type PieceSpec = {
  key: string;
  kind: "corner" | "center";
  anchor: THREE.Vector3;
  faces: Array<{ faceIndex: number; basis: FaceBasis; points: THREE.Vector3[] }>;
};
type SwipeGesture = Required<Pick<SkewbMove, "axis" | "direction" | "layer">>;
type PointerStart = {
  pointerId: number;
  clientX: number;
  clientY: number;
  hitPoint: THREE.Vector3;
  group: THREE.Group;
};
type DragPreview = {
  gesture: SwipeGesture;
  groups: THREE.Group[];
  pivot: THREE.Group;
  angle: number;
};

const FACE_COLORS = ["#f5f5ef", "#ffd500", "#00a85a", "#1557d5", "#ef3340", "#ff7a00"];
const TURN_ANGLE = (2 * Math.PI) / 3;
const TURN_DURATION_MS = 460;
const QUICK_TURN_DURATION_MS = 180;
const FULL_DRAG_DISTANCE_PX = 150;
const FACE_DATA: FaceBasis[] = [
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

function samePosition(a: readonly number[], b: THREE.Vector3) {
  return a[0] === b.x && a[1] === b.y && a[2] === b.z;
}

function inset3(points: THREE.Vector3[], scale: number) {
  const center = points.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / points.length);
  return points.map(point => center.clone().add(point.clone().sub(center).multiplyScalar(scale)));
}

function roundedShape(points: THREE.Vector2[], radius: number) {
  const shape = new THREE.Shape();
  const starts: THREE.Vector2[] = [];
  const ends: THREE.Vector2[] = [];
  points.forEach((current, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const a = current.distanceTo(previous);
    const b = current.distanceTo(next);
    const r = Math.min(radius, a * 0.22, b * 0.22);
    starts.push(current.clone().lerp(previous, r / a));
    ends.push(current.clone().lerp(next, r / b));
  });
  shape.moveTo(ends[points.length - 1].x, ends[points.length - 1].y);
  points.forEach((point, index) => {
    shape.lineTo(starts[index].x, starts[index].y);
    shape.quadraticCurveTo(point.x, point.y, ends[index].x, ends[index].y);
  });
  shape.closePath();
  return shape;
}

function stickerGeometry(points: THREE.Vector3[], basis: FaceBasis, anchor: THREE.Vector3, kind: PieceSpec["kind"]) {
  const inset = inset3(points, kind === "center" ? 0.78 : 0.82);
  const points2 = inset.map(point => new THREE.Vector2(point.dot(basis.u), point.dot(basis.v)));
  const geometry = new THREE.ShapeGeometry(roundedShape(points2, kind === "center" ? 0.055 : 0.075), 8);
  const matrix = new THREE.Matrix4().makeBasis(basis.u, basis.v, basis.normal);
  matrix.setPosition(basis.normal.clone().multiplyScalar(1.018).sub(anchor));
  geometry.applyMatrix4(matrix);
  geometry.computeVertexNormals();
  return geometry;
}

function bodyGeometry(spec: PieceSpec) {
  const points: THREE.Vector3[] = [];
  const innerScale = spec.kind === "corner" ? 0.8 : 0.72;
  for (const face of spec.faces) {
    const outer = inset3(face.points, spec.kind === "corner" ? 0.965 : 0.94);
    for (const point of outer) {
      points.push(point.clone().sub(spec.anchor));
      points.push(point.clone().multiplyScalar(innerScale).sub(spec.anchor));
    }
  }
  const geometry = new ConvexGeometry(points);
  geometry.computeVertexNormals();
  return geometry;
}

function buildPieceSpecs() {
  const specs = new Map<string, PieceSpec>();
  FACE_DATA.forEach((basis, faceIndex) => {
    const plane = basis.normal.clone();
    const point = (x: number, y: number) => plane.clone().addScaledVector(basis.u, x).addScaledVector(basis.v, y);
    const middle = 0.355;
    const outer = 0.965;
    const polys = [
      { kind: "center" as const, signs: [0, 0], points: [point(0, middle), point(middle, 0), point(0, -middle), point(-middle, 0)] },
      { kind: "corner" as const, signs: [-1, 1], points: [point(-outer, outer), point(0, outer), point(-middle, 0), point(-outer, 0)] },
      { kind: "corner" as const, signs: [1, 1], points: [point(0, outer), point(outer, outer), point(outer, 0), point(middle, 0)] },
      { kind: "corner" as const, signs: [1, -1], points: [point(outer, 0), point(outer, -outer), point(0, -outer), point(middle, 0)] },
      { kind: "corner" as const, signs: [-1, -1], points: [point(0, -outer), point(-outer, -outer), point(-outer, 0), point(-middle, 0)] },
    ];
    for (const poly of polys) {
      const anchor = poly.kind === "center"
        ? basis.normal.clone()
        : basis.normal.clone().addScaledVector(basis.u, poly.signs[0]).addScaledVector(basis.v, poly.signs[1]).set(
          Math.sign(basis.normal.x + basis.u.x * poly.signs[0] + basis.v.x * poly.signs[1]),
          Math.sign(basis.normal.y + basis.u.y * poly.signs[0] + basis.v.y * poly.signs[1]),
          Math.sign(basis.normal.z + basis.u.z * poly.signs[0] + basis.v.z * poly.signs[1]),
        );
      const key = `${poly.kind}:${anchor.x},${anchor.y},${anchor.z}`;
      const spec = specs.get(key) ?? { key, kind: poly.kind, anchor, faces: [] };
      spec.faces.push({ faceIndex, basis, points: poly.points });
      specs.set(key, spec);
    }
  });
  return [...specs.values()];
}

export default function SkewbSolidGame() {
  const mountRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<{
    scramble: () => void;
    undo: () => void;
    solve: () => void;
    resetPuzzle: () => void;
    resetView: () => void;
    setViewMode: (mode: ViewMode) => void;
    loadScramble: (notation: string) => void;
    turn: (axis: AxisName, direction: Direction, layer?: LayerSide) => void;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Solid Skewb ready");
  const [moves, setMoves] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [isSolved, setIsSolved] = useState(true);
  const [scrambleText, setScrambleText] = useState("");
  const [solutionText, setSolutionText] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("turn");
  const [undoUses, setUndoUses] = useState(0);
  const [touchMoves, setTouchMoves] = useState(0);
  const [buttonMoves, setButtonMoves] = useState(0);
  const [moveLog, setMoveLog] = useState<string[]>([]);
  const [assisted, setAssisted] = useState(false);

  const elapsedBase = useRef(0);
  const timerStart = useRef<number | null>(null);
  const startTimer = () => { if (timerStart.current === null) timerStart.current = performance.now(); };
  const stopTimer = () => {
    if (timerStart.current === null) return;
    elapsedBase.current += performance.now() - timerStart.current;
    timerStart.current = null;
    setElapsedMs(elapsedBase.current);
  };
  const resetTimer = () => { elapsedBase.current = 0; timerStart.current = null; setElapsedMs(0); };
  useEffect(() => {
    const id = setInterval(() => {
      if (timerStart.current !== null) setElapsedMs(elapsedBase.current + performance.now() - timerStart.current);
    }, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let moveFrame = 0;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(4.6, 3.8, 5.6);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearAlpha(0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none";
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.enablePan = false;
    controls.minDistance = 3.4;
    controls.maxDistance = 11;
    controls.target.set(0, 0, 0);
    controls.update();
    controls.saveState();

    scene.add(new THREE.HemisphereLight("#ffffff", "#18243b", 2.1));
    const key = new THREE.DirectionalLight("#ffffff", 3.2);
    key.position.set(7, 10, 9);
    key.castShadow = true;
    scene.add(key);
    const rim = new THREE.DirectionalLight("#527cff", 1.5);
    rim.position.set(-8, 4, -8);
    scene.add(rim);

    const root = new THREE.Group();
    root.rotation.y = -0.08;
    scene.add(root);
    const pieceGroups: THREE.Group[] = [];
    const pickables: THREE.Mesh[] = [];
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const bodyMaterial = new THREE.MeshPhysicalMaterial({ color: "#080a0f", roughness: 0.31, metalness: 0.02, clearcoat: 0.72, clearcoatRoughness: 0.34 });
    materials.push(bodyMaterial);

    for (const spec of buildPieceSpecs()) {
      const group = new THREE.Group();
      group.position.copy(spec.anchor);
      group.userData.kind = spec.kind;
      group.userData.pieceIndex = (spec.kind === "corner" ? CORNER_POSITIONS : CENTER_POSITIONS).findIndex(position => samePosition(position, spec.anchor));
      root.add(group);
      pieceGroups.push(group);

      const bodyGeo = bodyGeometry(spec);
      const body = new THREE.Mesh(bodyGeo, bodyMaterial);
      body.castShadow = true;
      body.receiveShadow = true;
      body.userData.pieceGroup = group;
      body.userData.isPickSurface = true;
      group.add(body);
      pickables.push(body);
      geometries.push(bodyGeo);

      for (const face of spec.faces) {
        const stickerGeo = stickerGeometry(face.points, face.basis, spec.anchor, spec.kind);
        const stickerMat = new THREE.MeshPhysicalMaterial({
          color: FACE_COLORS[face.faceIndex], emissive: FACE_COLORS[face.faceIndex], emissiveIntensity: 0.015,
          roughness: 0.23, metalness: 0.01, clearcoat: 0.92, clearcoatRoughness: 0.2, side: THREE.DoubleSide,
        });
        const sticker = new THREE.Mesh(stickerGeo, stickerMat);
        sticker.castShadow = true;
        sticker.userData.pieceGroup = group;
        sticker.userData.isSticker = true;
        group.add(sticker);
        pickables.push(sticker);
        geometries.push(stickerGeo);
        materials.push(stickerMat);
      }
    }

    let logicalState = skewbSolved();
    const history: SkewbMove[] = [];
    const stateHistory: SkewbMove[] = [];
    const queue: QueuedMove[] = [];
    let active = false;
    let currentMode: ViewMode = "turn";
    let dragPreview: DragPreview | null = null;

    const pieceState = (group: THREE.Group): PieceTransform => {
      const list = group.userData.kind === "corner" ? logicalState.corners : logicalState.centers;
      return list[group.userData.pieceIndex as number];
    };
    const syncRenderer = () => {
      for (const group of pieceGroups) {
        const piece = pieceState(group);
        const [a,b,c,d,e,f,g,h,i] = piece.orientation;
        group.position.set(...piece.position);
        group.quaternion.setFromRotationMatrix(new THREE.Matrix4().set(a,b,c,0,d,e,f,0,g,h,i,0,0,0,0,1));
        group.updateMatrix();
      }
    };
    const groupsForMove = (move: Pick<SkewbMove, "axis" | "layer">) =>
      pieceGroups.filter(group => isPositionInLayer(pieceState(group).position, move.axis, move.layer ?? 1));

    const updateUi = () => {
      const solvedNow = skewbIsSolved(logicalState);
      setMoves(history.length);
      setMoveLog(history.map(moveLabel));
      setCanUndo(history.length > 0);
      setIsSolved(solvedNow);
      if (solvedNow) { stopTimer(); setStatus("Solved!"); }
    };

    const cancelPreview = () => {
      if (!dragPreview) return;
      dragPreview.groups.forEach(group => root.attach(group));
      root.remove(dragPreview.pivot);
      dragPreview = null;
      syncRenderer();
    };

    const animateMove = (move: QueuedMove, existing?: DragPreview) => {
      if (active) return;
      active = true;
      setBusy(true);
      const groups = existing?.groups ?? groupsForMove(move);
      const pivot = existing?.pivot ?? new THREE.Group();
      const startAngle = existing?.angle ?? 0;
      if (!existing) {
        root.add(pivot);
        groups.forEach(group => pivot.attach(group));
      }
      dragPreview = null;
      const axis = new THREE.Vector3(...pivotVector(move)).normalize();
      const target = move.direction * TURN_ANGLE;
      const duration = move.fast ? QUICK_TURN_DURATION_MS : Math.max(150, TURN_DURATION_MS * Math.abs(target - startAngle) / TURN_ANGLE);
      const started = performance.now();
      const frame = (now: number) => {
        if (disposed) return;
        const t = Math.min(1, (now - started) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        pivot.quaternion.setFromAxisAngle(axis, startAngle + (target - startAngle) * eased);
        if (t < 1) { moveFrame = requestAnimationFrame(frame); return; }
        logicalState = applyMove(logicalState, move);
        pivot.updateMatrixWorld(true);
        groups.forEach(group => root.attach(group));
        root.remove(pivot);
        syncRenderer();
        const recorded: SkewbMove = { axis: move.axis, direction: move.direction, ...(move.layer === -1 ? { layer: -1 as const } : {}) };
        if (move.phase !== "solve") stateHistory.push(recorded);
        if (move.record !== false) history.push(recorded);
        updateUi();
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
      moveFrame = requestAnimationFrame(frame);
    };

    const runNext = () => {
      if (active || !queue.length) return;
      animateMove(queue.shift()!);
    };
    const enqueue = (move: QueuedMove) => { queue.push(move); runNext(); };
    const hardReset = () => {
      queue.length = 0; history.length = 0; stateHistory.length = 0; logicalState = skewbSolved();
      cancelPreview(); syncRenderer(); resetTimer(); setMoves(0); setMoveLog([]); setCanUndo(false); setIsSolved(true);
      setSolutionText(""); setUndoUses(0); setTouchMoves(0); setButtonMoves(0); setAssisted(false);
    };
    const turn = (axis: AxisName, direction: Direction, layer: LayerSide = 1, source: "touch" | "button" = "button") => {
      if (active || queue.length) return;
      if (skewbIsSolved(logicalState)) { resetTimer(); startTimer(); }
      setSolutionText("");
      source === "touch" ? setTouchMoves(v => v + 1) : setButtonMoves(v => v + 1);
      enqueue({ axis, direction, ...(layer === -1 ? { layer } : {}), phase: "play" });
    };
    const loadMoves = (movesToLoad: SkewbMove[], notation: string, phase: "scramble" | "load") => {
      if (active || queue.length || !movesToLoad.length) return;
      hardReset(); setScrambleText(notation); setStatus(phase === "scramble" ? "Scrambling…" : "Loading scramble…");
      queue.push(...movesToLoad.map(move => ({ ...move, record: false, fast: true, phase })));
      runNext();
    };
    const scramble = () => { const seq = randomScramble(10); loadMoves(seq, seq.map(moveLabel).join(" "), "scramble"); };
    const loadScramble = (notation: string) => {
      try { const seq = parseSequence(notation); loadMoves(seq, seq.map(moveLabel).join(" "), "load"); }
      catch (error) { setStatus(error instanceof Error ? error.message : "Invalid Skewb scramble."); }
    };
    const undo = () => {
      if (active || queue.length || !history.length) return;
      const move = history.pop()!; setUndoUses(v => v + 1); enqueue({ ...inverseMove(move), record: false, phase: "undo" });
    };
    const solve = () => {
      if (active || queue.length || skewbIsSolved(logicalState)) return;
      try {
        setStatus("Finding verified solution…");
        const solution = solveSkewb(logicalState, stateHistory);
        if (!verifySolution(logicalState, solution)) throw new Error("Solution verification failed.");
        setSolutionText(solution.map(moveLabel).join(" ")); setAssisted(true); history.length = 0; setMoves(0); setMoveLog([]); setCanUndo(false);
        queue.push(...solution.map(move => ({ ...move, record: false, phase: "solve" as const })));
        runNext();
      } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to solve this state."); }
    };

    actionsRef.current = {
      scramble, undo, solve,
      resetPuzzle: () => { if (!active && !queue.length) { hardReset(); setScrambleText(""); setStatus("Solid Skewb ready"); } },
      resetView: () => controls.reset(),
      setViewMode: mode => { currentMode = mode; cancelPreview(); controls.enabled = true; setStatus(mode === "view" ? "Rotate view" : "Turn pieces"); },
      loadScramble,
      turn: (axis, direction, layer = 1) => turn(axis, direction, layer, "button"),
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerStart: PointerStart | null = null;
    let activePointers = 0;
    const setRay = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
    };
    const screenDirection = (direction: THREE.Vector3, origin: THREE.Vector3) => {
      const a = origin.clone().project(camera); const b = origin.clone().add(direction).project(camera);
      return new THREE.Vector2(b.x - a.x, -(b.y - a.y)).normalize();
    };
    const resolveGesture = (start: PointerStart, dx: number, dy: number): SwipeGesture => {
      const candidates = layersForPosition(pieceState(start.group).position);
      const drag = new THREE.Vector2(dx, dy).normalize();
      const relativeHit = start.hitPoint.clone().sub(root.getWorldPosition(new THREE.Vector3()));
      root.updateMatrixWorld(true);
      let best = candidates[0] ?? { axis: "U" as const, layer: 1 as const };
      let score = 0; let magnitude = -1;
      for (const candidate of candidates) {
        const axis = new THREE.Vector3(...pivotVector(candidate)).normalize().transformDirection(root.matrixWorld);
        const tangent = new THREE.Vector3().crossVectors(axis, relativeHit);
        if (tangent.lengthSq() < 1e-8) continue;
        const value = drag.dot(screenDirection(tangent.normalize(), start.hitPoint));
        if (Math.abs(value) > magnitude) { magnitude = Math.abs(value); best = candidate; score = value; }
      }
      return { ...best, direction: score >= 0 ? 1 : -1 };
    };
    const showPreview = (gesture: SwipeGesture, angle: number) => {
      if (!dragPreview || dragPreview.gesture.axis !== gesture.axis || dragPreview.gesture.layer !== gesture.layer) {
        cancelPreview();
        const groups = groupsForMove(gesture); const pivot = new THREE.Group(); root.add(pivot); groups.forEach(group => pivot.attach(group));
        dragPreview = { gesture, groups, pivot, angle: 0 };
      }
      dragPreview.gesture = gesture; dragPreview.angle = angle;
      dragPreview.pivot.quaternion.setFromAxisAngle(new THREE.Vector3(...pivotVector(gesture)).normalize(), angle);
    };
    const onDown = (event: PointerEvent) => {
      activePointers += 1; pointerStart = null;
      if (currentMode === "view") { controls.enabled = true; return; }
      if (active || queue.length || activePointers > 1) { controls.enabled = true; return; }
      setRay(event); const hit = raycaster.intersectObjects(pickables, false)[0]; const group = hit?.object.userData.pieceGroup as THREE.Group | undefined;
      if (!hit || !group) { controls.enabled = true; return; }
      pointerStart = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, hitPoint: hit.point.clone(), group };
      controls.enabled = false; renderer.domElement.setPointerCapture(event.pointerId); event.preventDefault(); event.stopImmediatePropagation();
    };
    const onMove = (event: PointerEvent) => {
      if (!pointerStart || pointerStart.pointerId !== event.pointerId || activePointers > 1) return;
      const dx = event.clientX - pointerStart.clientX; const dy = event.clientY - pointerStart.clientY;
      if (Math.hypot(dx, dy) < 14) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const gesture = resolveGesture(pointerStart, dx, dy);
      const progress = THREE.MathUtils.clamp((Math.hypot(dx, dy) - 10) / FULL_DRAG_DISTANCE_PX, 0, 1);
      showPreview(gesture, gesture.direction * TURN_ANGLE * progress);
      setStatus(`${moveLabel(gesture)} · release to turn`);
    };
    const finish = (event: PointerEvent, canceled = false) => {
      activePointers = Math.max(0, activePointers - 1);
      if (!pointerStart || pointerStart.pointerId !== event.pointerId) { if (!activePointers) controls.enabled = true; return; }
      const start = pointerStart; pointerStart = null;
      const dx = event.clientX - start.clientX; const dy = event.clientY - start.clientY;
      const preview = dragPreview;
      if (!canceled && preview && Math.hypot(dx, dy) >= 30 && !active && !queue.length) {
        setTouchMoves(v => v + 1); if (skewbIsSolved(logicalState)) { resetTimer(); startTimer(); }
        animateMove({ ...preview.gesture, phase: "play" }, preview);
      } else cancelPreview();
      if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
      controls.enabled = activePointers === 0;
    };
    renderer.domElement.addEventListener("pointerdown", onDown, true);
    renderer.domElement.addEventListener("pointermove", onMove, true);
    renderer.domElement.addEventListener("pointerup", event => finish(event), true);
    renderer.domElement.addEventListener("pointercancel", event => finish(event, true), true);

    const resize = () => { const w = Math.max(1, mount.clientWidth); const h = Math.max(1, mount.clientHeight); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(mount); resize();
    let renderFrame = 0;
    const render = () => { renderFrame = requestAnimationFrame(render); controls.update(); renderer.render(scene, camera); };
    render();
    return () => {
      disposed = true; cancelAnimationFrame(renderFrame); cancelAnimationFrame(moveFrame); observer.disconnect(); controls.dispose(); actionsRef.current = null;
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);

  const changeMode = (mode: ViewMode) => { setViewMode(mode); actionsRef.current?.setViewMode(mode); };
  const axes = Object.keys(AXES) as AxisName[];
  return <main className="app-shell relative min-h-dvh w-full max-w-[520px] overflow-hidden px-4 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))]">
    <div className="orb orb-a" /><div className="orb orb-b" />
    <div className="relative z-[1]">
      <SiteHeader />
      <Link href="/solver/skewb" className="mt-3 inline-flex min-h-10 items-center text-sm font-bold text-[var(--muted)]">← Stable Skewb</Link>
      <section className="mt-3"><p className="text-xs font-extrabold tracking-[.18em] text-[var(--blue)]">NATIVE SOLID-PIECE TEST</p><h1 className="mt-2 text-[39px] font-extrabold leading-[1.01] tracking-[-1.2px]">A normal-looking<br /><span className="accent-text">Skewb that stays together.</span></h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Fourteen complete engine-owned solids. No separate moving face caps and no drag-release reset.</p></section>
      <section className="cube-card mt-4 overflow-hidden rounded-[26px]">
        <div className="flex min-h-12 items-center justify-between border-b border-[var(--border)] px-4 py-3 text-xs font-bold text-[var(--muted)]"><span>{status}</span><span className="flex gap-3"><span className="tabular-nums text-[var(--text)]">{formatElapsed(elapsedMs)}</span><strong className="text-[var(--text)]">{moves} moves</strong></span></div>
        <div ref={mountRef} data-testid="skewb-solid-canvas" className="h-[450px] w-full touch-none sm:h-[520px]" />
        <div className="border-t border-[var(--border)] px-4 py-3 text-center text-xs font-semibold text-[var(--muted)]">{viewMode === "turn" ? "Drag a colored tile to turn" : "Drag anywhere to rotate"}</div>
      </section>
      <div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => changeMode("turn")} className={`${viewMode === "turn" ? "cta-purple" : "glass"} min-h-12 rounded-xl font-extrabold`}>Turn Pieces</button><button onClick={() => changeMode("view")} className={`${viewMode === "view" ? "cta-purple" : "glass"} min-h-12 rounded-xl font-extrabold`}>Rotate View</button></div>
      <section data-puzzle-scramble={scrambleText} className="glass mt-3 rounded-[18px] p-4"><p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">SCRAMBLE</p><p className="mt-2 min-h-6 break-words text-sm leading-6">{scrambleText || "Tap Scramble to begin."}</p></section>
      <div className="mt-3 grid grid-cols-3 gap-2"><button disabled={busy} onClick={() => actionsRef.current?.scramble()} className="cta-purple min-h-12 rounded-xl font-extrabold disabled:opacity-40">Scramble</button><button disabled={busy || !canUndo} onClick={() => actionsRef.current?.undo()} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">↶ Undo</button><button disabled={busy || isSolved} onClick={() => actionsRef.current?.solve()} className="cta-green min-h-12 rounded-xl font-extrabold disabled:opacity-40">Auto-solve</button></div>
      {solutionText ? <section className="glass mt-3 rounded-[18px] p-4"><p className="text-xs font-extrabold tracking-[.16em] text-[var(--green)]">VERIFIED SOLUTION</p><p className="mt-2 break-words font-mono text-xs leading-5">{solutionText}</p></section> : null}
      <Suspense fallback={<section className="glass mt-3 min-h-[72px] rounded-[18px]" />}><UniversalPuzzleActions placement="inline" puzzleType="skewb" currentScramble={scrambleText} onLoadScramble={notation => actionsRef.current?.loadScramble(notation)} attempt={{ started: Boolean(scrambleText) && !busy && (moves > 0 || !isSolved), solved: isSolved, elapsedMs, moveCount: moves, undoCount: undoUses, touchMoves, buttonMoves, moveHistory: moveLog, assisted }} /></Suspense>
      <details className="glass mt-3 rounded-[18px] p-3"><summary className="cursor-pointer text-sm font-extrabold text-[var(--muted)]">Test turn buttons</summary><div className="mt-3 grid grid-cols-4 gap-2">{axes.map(axis => <button key={axis} disabled={busy} onClick={() => actionsRef.current?.turn(axis, 1)} className="glass min-h-11 rounded-xl font-extrabold disabled:opacity-40">{axis}</button>)}</div><div className="mt-2 grid grid-cols-4 gap-2">{axes.map(axis => <button key={`${axis}'`} disabled={busy} onClick={() => actionsRef.current?.turn(axis, -1)} className="glass min-h-11 rounded-xl font-extrabold disabled:opacity-40">{axis}&apos;</button>)}</div><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => actionsRef.current?.resetPuzzle()} className="glass min-h-11 rounded-xl font-extrabold">Reset Puzzle</button><button onClick={() => actionsRef.current?.resetView()} className="glass min-h-11 rounded-xl font-extrabold">Reset View</button></div></details>
    </div>
  </main>;
}
