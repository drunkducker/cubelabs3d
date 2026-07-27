"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import SiteHeader from "@/components/SiteHeader";
import UniversalPuzzleActions from "@/components/UniversalPuzzleActions";
import {
  AXES,
  CENTER_POSITIONS,
  CORNER_POSITIONS,
  type AxisName,
  type Direction,
  type PieceTransform,
  type SkewbMove,
  applyMove,
  axesForPosition,
  inverseMove,
  isPositionInLayer,
  isSolved as skewbIsSolved,
  moveLabel,
  parseSequence,
  randomScramble,
  solve as solveSkewb,
  solved as skewbSolved,
  verifySolution,
} from "@/lib/skewb-engine";

type MovePhase = "play" | "scramble" | "load" | "undo" | "solve";
type ViewMode = "turn" | "view";
type QueuedMove = SkewbMove & {
  record?: boolean;
  fast?: boolean;
  phase?: MovePhase;
  startAngle?: number;
};
type PointerStart = {
  pointerId: number;
  clientX: number;
  clientY: number;
  hitPoint: THREE.Vector3;
  group: THREE.Group;
};
type SwipeGesture = { axis: AxisName; direction: Direction };
type DragPreview = {
  gesture: SwipeGesture;
  groups: THREE.Group[];
  pivot: THREE.Group;
  angle: number;
};

const FACE_COLORS = ["#f4f4f1", "#ffd500", "#00a85a", "#1557d5", "#ef3340", "#ff7a00"];
const TURN_ANGLE = (2 * Math.PI) / 3;
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

function insetPolygon(points: THREE.Vector3[], scale: number) {
  const center = points
    .reduce((sum, point) => sum.add(point), new THREE.Vector3())
    .multiplyScalar(1 / points.length);
  return points.map(point => center.clone().add(point.clone().sub(center).multiplyScalar(scale)));
}

/**
 * Give every Skewb surface piece real depth. The old renderer rotated flat
 * sticker cards over one stationary cube, so a turn looked like decals sliding
 * through a box. These shallow piece shells rotate with their stickers and
 * expose black plastic walls during the live drag, like the other CubeLabs
 * puzzle renderers.
 */
function pieceShellGeometry(
  points: THREE.Vector3[],
  normal: THREE.Vector3,
  anchor: THREE.Vector3,
  depth: number,
) {
  const back = points.map(point => point.clone().addScaledVector(normal, -depth));
  const positions: number[] = [];
  const add = (point: THREE.Vector3) => {
    const local = point.clone().sub(anchor);
    positions.push(local.x, local.y, local.z);
  };

  for (let index = 1; index < points.length - 1; index++) {
    [points[0], points[index + 1], points[index]].forEach(add);
    [back[0], back[index], back[index + 1]].forEach(add);
  }
  for (let index = 0; index < points.length; index++) {
    const next = (index + 1) % points.length;
    [points[index], points[next], back[next], points[index], back[next], back[index]].forEach(add);
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
    setViewMode: (mode: ViewMode) => void;
    loadScramble: (notation: string) => void;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Skewb ready");
  const [moves, setMoves] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [isSolved, setIsSolved] = useState(true);
  const [scrambleText, setScrambleText] = useState("");
  const [solutionText, setSolutionText] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("turn");

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
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    const distance = 6.25;
    camera.position.set(distance * 0.82, distance * 0.68, distance);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.55));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearAlpha(0);
    renderer.shadowMap.enabled = true;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.zoomSpeed = 0.9;
    controls.rotateSpeed = 0.72;
    controls.minDistance = 3.6;
    controls.maxDistance = 13;
    controls.target.set(0, 0, 0);
    controls.touches.ONE = THREE.TOUCH.ROTATE;
    controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
    controls.update();
    controls.saveState();

    scene.add(new THREE.HemisphereLight("#ffffff", "#223052", 2.2));
    const key = new THREE.DirectionalLight("#ffffff", 2.4);
    key.position.set(8, 12, 10);
    key.castShadow = true;
    scene.add(key);
    const rim = new THREE.DirectionalLight("#5c7cff", 1.4);
    rim.position.set(-10, 3, -8);
    scene.add(rim);

    const root = new THREE.Group();
    scene.add(root);

    const pieceGroups: THREE.Group[] = [];
    const pickables: THREE.Mesh[] = [];
    const geometries: THREE.BufferGeometry[] = [];
    const plasticMaterial = new THREE.MeshStandardMaterial({
      color: "#0b0d12",
      roughness: 0.42,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.78, 28, 18), plasticMaterial);
    core.castShadow = true;
    core.receiveShadow = true;
    root.add(core);
    geometries.push(core.geometry);
    const materials: THREE.Material[] = [plasticMaterial];
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
      const outer = 0.98;
      const polygons = [
        { points: [point(0, middle), point(middle, 0), point(0, -middle), point(-middle, 0)], kind: "center" as const, signs: [0, 0] },
        { points: [point(-outer, outer), point(0, outer), point(-middle, 0), point(-outer, 0)], kind: "corner" as const, signs: [-1, 1] },
        { points: [point(0, outer), point(outer, outer), point(outer, 0), point(middle, 0)], kind: "corner" as const, signs: [1, 1] },
        { points: [point(outer, 0), point(outer, -outer), point(0, -outer), point(middle, 0)], kind: "corner" as const, signs: [1, -1] },
        { points: [point(0, -outer), point(-outer, -outer), point(-outer, 0), point(-middle, 0)], kind: "corner" as const, signs: [-1, -1] },
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
        const shellPoints = poly.points
          .map(point => point.clone().addScaledVector(face.normal, -0.012));
        const stickerPoints = insetPolygon(poly.points, 0.875)
          .map(point => point.addScaledVector(face.normal, 0.006));
        const shellGeometry = pieceShellGeometry(
          shellPoints,
          face.normal,
          anchor,
          poly.kind === "corner" ? 0.34 : 0.46,
        );
        const stickerGeometry = polygonGeometry(stickerPoints, anchor);
        const shell = new THREE.Mesh(shellGeometry, plasticMaterial);
        shell.userData.pieceGroup = group;
        shell.userData.isPickSurface = true;
        shell.castShadow = true;
        shell.receiveShadow = true;
        pickables.push(shell);
        group.add(shell);
        const material = new THREE.MeshStandardMaterial({
          color: FACE_COLORS[faceIndex],
          emissive: FACE_COLORS[faceIndex],
          emissiveIntensity: 0.035,
          roughness: 0.28,
          metalness: 0.025,
          polygonOffset: true,
          polygonOffsetFactor: -3,
          polygonOffsetUnits: -3,
        });
        const mesh = new THREE.Mesh(stickerGeometry, material);
        mesh.castShadow = true;
        mesh.userData.isSticker = true;
        mesh.userData.pieceGroup = group;
        pickables.push(mesh);
        group.add(mesh);
        geometries.push(shellGeometry, stickerGeometry);
        materials.push(material);
      });
    });

    let logicalState = skewbSolved();
    const queue: QueuedMove[] = [];
    const history: SkewbMove[] = [];
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

    const groupsForMove = (axisName: AxisName) =>
      pieceGroups.filter(group => isPositionInLayer(pieceState(group).position, axisName));

    let highlighted: THREE.Group[] = [];
    const glowPiece = (group: THREE.Group, intensity: number) => {
      group.traverse(child => {
        if (!(child instanceof THREE.Mesh) || !child.userData.isSticker) return;
        const material = child.material as THREE.MeshStandardMaterial;
        material.emissive.set(intensity ? "#ffffff" : material.color);
        material.emissiveIntensity = intensity || 0.04;
      });
    };
    const clearHighlight = () => {
      highlighted.forEach(group => glowPiece(group, 0));
      highlighted = [];
    };
    const highlightMove = (gesture: SwipeGesture) => {
      clearHighlight();
      highlighted = groupsForMove(gesture.axis);
      highlighted.forEach(group => glowPiece(group, 0.28));
    };

    let dragPreview: DragPreview | null = null;
    const clearDragPreview = () => {
      if (!dragPreview) return;
      dragPreview.groups.forEach(group => root.attach(group));
      root.remove(dragPreview.pivot);
      dragPreview = null;
      syncRenderer();
    };
    const showDragPreview = (gesture: SwipeGesture, angle: number) => {
      if (!dragPreview || dragPreview.gesture.axis !== gesture.axis) {
        clearDragPreview();
        highlightMove(gesture);
        const groups = groupsForMove(gesture.axis);
        const pivot = new THREE.Group();
        root.add(pivot);
        groups.forEach(group => pivot.attach(group));
        dragPreview = { gesture, groups, pivot, angle: 0 };
      }
      dragPreview.gesture = gesture;
      dragPreview.angle = angle;
      const axis = new THREE.Vector3(...AXES[gesture.axis]).normalize();
      dragPreview.pivot.quaternion.setFromAxisAngle(axis, angle);
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
      logicalState = skewbSolved();
      clearDragPreview();
      syncRenderer();
      clearHighlight();
      resetTimer();
      setMoves(0);
      setCanUndo(false);
      setIsSolved(true);
      setSolutionText("");
    };

    const runNext = () => {
      if (active || !queue.length) return;
      active = true;
      setBusy(true);
      const move = queue.shift()!;
      const axisTuple = AXES[move.axis];
      const axis = new THREE.Vector3(...axisTuple).normalize();
      const selected = groupsForMove(move.axis);
      const pivot = new THREE.Group();
      root.add(pivot);
      selected.forEach(group => pivot.attach(group));
      const started = performance.now();
      const angle = move.direction * TURN_ANGLE;
      const startAngle = THREE.MathUtils.clamp(move.startAngle ?? 0, -TURN_ANGLE, TURN_ANGLE);
      pivot.quaternion.setFromAxisAngle(axis, startAngle);
      const remaining = Math.abs(angle - startAngle) / TURN_ANGLE;
      const duration = move.fast ? 115 : Math.max(90, 280 * remaining);
      clearHighlight();
      const animate = (now: number) => {
        if (disposed) return;
        const progress = Math.min(1, (now - started) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        pivot.quaternion.setFromAxisAngle(axis, startAngle + (angle - startAngle) * eased);
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
        clearHighlight();
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
    const turn = (axis: AxisName, direction: Direction, startAngle = 0) => {
      if (active || queue.length) return;
      setSolutionText("");
      if (skewbIsSolved(logicalState)) {
        resetTimer();
        startTimer();
      }
      enqueue({ axis, direction, phase: "play", startAngle });
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
      setSolutionText("");
      enqueue({ ...inverseMove(move), record: false, phase: "undo" });
    };
    const solve = () => {
      if (active || queue.length || skewbIsSolved(logicalState)) return;
      try {
        setStatus("Finding verified solution…");
        const solution = solveSkewb(logicalState);
        if (!verifySolution(logicalState, solution)) throw new Error("Solution verification failed.");
        setSolutionText(solution.map(moveLabel).join(" "));
        history.length = 0;
        setCanUndo(false);
        setMoves(0);
        setStatus(`Solving in ${solution.length} moves…`);
        queue.push(...solution.map(move => ({ ...move, record: false, phase: "solve" as const })));
        runNext();
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to solve this Skewb state.");
      }
    };
    const resetPuzzle = () => {
      if (active || queue.length) return;
      hardReset();
      setScrambleText("");
      setStatus("Skewb ready");
    };
    let currentMode: ViewMode = "turn";
    const changeViewMode = (mode: ViewMode) => {
      currentMode = mode;
      clearDragPreview();
      clearHighlight();
      controls.enabled = true;
      renderer.domElement.style.cursor = mode === "view" ? "grab" : "default";
      setStatus(mode === "view" ? "Rotate view: drag anywhere" : "Turn mode: drag a colored piece");
    };

    actionsRef.current = {
      turn,
      scramble,
      undo,
      solve,
      resetPuzzle,
      resetView: () => controls.reset(),
      setViewMode: changeViewMode,
      loadScramble,
    };

    // Swipe any sticker to choose a legal corner-axis turn. The exact engine
    // reports every layer containing the touched piece (one or three for a
    // corner, two for a center); projecting those candidates into screen space
    // lets the drag choose both the axis and turn sign. Empty-space drags
    // remain camera orbit gestures, matching the Kilominx interaction model.
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerStart: PointerStart | null = null;
    let previewGesture: SwipeGesture | null = null;
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
      return new THREE.Vector2(
        endpointProjected.x - originProjected.x,
        -(endpointProjected.y - originProjected.y),
      ).normalize();
    };
    const resolveGesture = (start: PointerStart, dx: number, dy: number): SwipeGesture => {
      const position = pieceState(start.group).position;
      const candidates = axesForPosition(position);
      const drag = new THREE.Vector2(dx, dy).normalize();
      const rootOrigin = root.getWorldPosition(new THREE.Vector3());
      const relativeHit = start.hitPoint.clone().sub(rootOrigin);
      root.updateMatrixWorld(true);

      let bestAxis = candidates[0] ?? "U";
      let bestScore = 0;
      let bestMagnitude = -1;
      for (const axisName of candidates) {
        const axisWorld = new THREE.Vector3(...AXES[axisName]).normalize().transformDirection(root.matrixWorld);
        const tangent = new THREE.Vector3().crossVectors(axisWorld, relativeHit);
        if (tangent.lengthSq() < 1e-8) continue;
        const score = drag.dot(projectedScreenDirection(tangent.normalize(), start.hitPoint));
        if (Math.abs(score) > bestMagnitude) {
          bestMagnitude = Math.abs(score);
          bestAxis = axisName;
          bestScore = score;
        }
      }
      return { axis: bestAxis, direction: bestScore >= 0 ? 1 : -1 };
    };

    const onPointerDown = (event: PointerEvent) => {
      activePointers += 1;
      pointerStart = null;
      previewGesture = null;
      clearDragPreview();
      clearHighlight();
      if (currentMode === "view") {
        controls.enabled = true;
        renderer.domElement.style.cursor = "grabbing";
        return;
      }
      if (active || queue.length || activePointers > 1) {
        controls.enabled = true;
        return;
      }
      setPointerFromEvent(event);
      const hit = raycaster.intersectObjects(pickables, false)[0];
      const group = hit?.object.userData.pieceGroup as THREE.Group | undefined;
      if (!hit || !group) {
        controls.enabled = true;
        return;
      }
      pointerStart = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        hitPoint: hit.point.clone(),
        group,
      };
      event.preventDefault();
      event.stopImmediatePropagation();
      controls.enabled = false;
      renderer.domElement.setPointerCapture(event.pointerId);
      setStatus("Swipe to turn");
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!pointerStart || event.pointerId !== pointerStart.pointerId || activePointers > 1) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const dx = event.clientX - pointerStart.clientX;
      const dy = event.clientY - pointerStart.clientY;
      if (Math.hypot(dx, dy) < 14) return;
      previewGesture = resolveGesture(pointerStart, dx, dy);
      const progress = THREE.MathUtils.clamp((Math.hypot(dx, dy) - 8) / 82, 0, 1);
      showDragPreview(previewGesture, previewGesture.direction * TURN_ANGLE * progress);
      setStatus(`${moveLabel(previewGesture)} · release to turn`);
    };
    const finishPointer = (event: PointerEvent, canceled = false) => {
      activePointers = Math.max(0, activePointers - 1);
      if (currentMode === "view") {
        renderer.domElement.style.cursor = "grab";
        if (activePointers === 0) controls.enabled = true;
        return;
      }
      if (!pointerStart || event.pointerId !== pointerStart.pointerId) {
        if (activePointers === 0) controls.enabled = true;
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      const start = pointerStart;
      pointerStart = null;
      const dx = event.clientX - start.clientX;
      const dy = event.clientY - start.clientY;
      const gesture = dragPreview?.gesture ?? previewGesture ?? resolveGesture(start, dx, dy);
      const startAngle = dragPreview?.angle ?? 0;
      clearDragPreview();
      if (!canceled && Math.hypot(dx, dy) >= 30 && !active && !queue.length) {
        turn(gesture.axis, gesture.direction, startAngle);
      } else {
        setStatus(skewbIsSolved(logicalState) ? "Solved!" : "Your turn");
      }
      clearHighlight();
      previewGesture = null;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      controls.enabled = activePointers === 0;
    };
    const cancelPointer = (event: PointerEvent) => finishPointer(event, true);

    renderer.domElement.addEventListener("pointerdown", onPointerDown, true);
    renderer.domElement.addEventListener("pointermove", onPointerMove, true);
    renderer.domElement.addEventListener("pointerup", finishPointer, true);
    renderer.domElement.addEventListener("pointercancel", cancelPointer, true);

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
      renderer.domElement.removeEventListener("pointerdown", onPointerDown, true);
      renderer.domElement.removeEventListener("pointermove", onPointerMove, true);
      renderer.domElement.removeEventListener("pointerup", finishPointer, true);
      renderer.domElement.removeEventListener("pointercancel", cancelPointer, true);
      controls.dispose();
      actionsRef.current = null;
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const changeMode = (mode: ViewMode) => {
    setViewMode(mode);
    actionsRef.current?.setViewMode(mode);
  };

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
  return <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[22px]">
    <div className="orb orb-a" /><div className="orb orb-b" />
    <div className="relative z-[1]">
      <SiteHeader />
      <Link href="/solve" className="mt-4 inline-flex text-sm font-bold text-[var(--muted)]">← Back to solvers</Link>
      <section className="mt-5">
        <p className="text-xs font-extrabold tracking-[.18em] text-[var(--blue)]">SKEWB</p>
        <h1 className="mt-2 text-[39px] font-extrabold leading-[1.02] tracking-[-1px]">Play &amp; solve<br /><span className="accent-text">the Skewb.</span></h1>
        <p className="mt-3 text-[15px] leading-6 text-[var(--muted)]">Swipe any colored sticker for a true 120° turn, then use the verified solver from any state.</p>
      </section>
      <section className="cube-card mt-4 overflow-hidden rounded-[22px]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 text-sm text-[var(--muted)]">
          <span>{status}</span><span className="flex gap-3"><span className="tabular-nums text-[var(--text)]">{formatElapsed(elapsedMs)}</span><strong className="text-[var(--text)]">{moves} moves</strong></span>
        </div>
        <div
          ref={mountRef}
          role="application"
          aria-label="Interactive Skewb puzzle"
          data-testid="skewb-canvas"
          className="h-[430px] w-full touch-none sm:h-[480px]"
        />
        <div className="pointer-events-none px-4 pb-3 text-center text-[13px] font-semibold text-[var(--muted)]">
          {viewMode === "turn" ? "Drag a colored piece to turn • Pinch to zoom" : "Drag anywhere to rotate • Pinch to zoom"}
        </div>
      </section>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => changeMode("turn")} className={`${viewMode === "turn" ? "cta-purple" : "glass"} min-h-12 rounded-xl font-extrabold`}>Turn Pieces</button>
        <button onClick={() => changeMode("view")} className={`${viewMode === "view" ? "cta-purple" : "glass"} min-h-12 rounded-xl font-extrabold`}>Rotate View</button>
      </div>
      <section data-puzzle-scramble={scrambleText} className="glass mt-3 rounded-[18px] p-4"><p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">SCRAMBLE</p><p className="mt-2 min-h-6 break-words text-sm leading-6 text-[var(--text)]">{scrambleText || "Tap Scramble to begin."}</p></section>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button disabled={busy} onClick={() => actionsRef.current?.scramble()} className="cta-purple min-h-12 rounded-xl font-extrabold disabled:opacity-40">Scramble</button>
        <button disabled={busy || !canUndo} onClick={() => actionsRef.current?.undo()} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">↶ Undo</button>
        <button disabled={busy || isSolved} onClick={() => actionsRef.current?.solve()} className="cta-green min-h-12 rounded-xl font-extrabold disabled:opacity-40">Auto-solve</button>
      </div>

      <section className="glass mt-3 rounded-[18px] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold tracking-[.16em] text-[var(--green)]">VERIFIED SOLVER</p>
            <p className="mt-1 text-sm font-bold text-[var(--text)]">{solutionText ? "Solution played and checked" : isSolved ? "Scramble or swipe to create a state" : "Ready to solve the current state"}</p>
          </div>
          <span className="rounded-full border border-[rgba(52,208,88,.35)] bg-[rgba(52,208,88,.12)] px-2.5 py-1 text-[10px] font-extrabold tracking-[.09em] text-[var(--green)]">ENGINE</span>
        </div>
        {solutionText ? <p className="mt-3 break-words rounded-xl bg-black/20 p-3 font-mono text-xs leading-5 text-[var(--text)]">{solutionText}</p> : null}
      </section>

      <Suspense fallback={<section className="glass mt-3 min-h-[72px] rounded-[18px]" />}>
        <UniversalPuzzleActions placement="inline" />
      </Suspense>

      <details className="glass mt-3 rounded-[18px] p-3">
        <summary className="cursor-pointer text-sm font-extrabold text-[var(--muted)]">Corner turn buttons</summary>
        <div className="mt-3 grid grid-cols-4 gap-2">{axes.map(axis => <button key={axis} disabled={busy} onClick={() => actionsRef.current?.turn(axis, 1)} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">{axis}</button>)}</div>
        <div className="mt-2 grid grid-cols-4 gap-2">{axes.map(axis => <button key={`${axis}'`} disabled={busy} onClick={() => actionsRef.current?.turn(axis, -1)} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">{axis}&apos;</button>)}</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button disabled={busy} onClick={() => actionsRef.current?.resetPuzzle()} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">Reset Puzzle</button>
          <button onClick={() => actionsRef.current?.resetView()} className="glass min-h-12 rounded-xl font-extrabold">Reset View</button>
        </div>
      </details>

      <section className="glass mt-3 rounded-[18px] p-4 text-sm leading-6 text-[var(--muted)]">
        <p><strong className="text-[var(--text)]">Turn Pieces:</strong> drag any colored piece and its full Skewb layer follows your finger through the 120° turn.</p>
        <p><strong className="text-[var(--text)]">Rotate View:</strong> drag anywhere to inspect the puzzle; pinch to zoom.</p>
        <p><strong className="text-[var(--text)]">Solver:</strong> finds and verifies a solution from the actual current state, even after manual swipes.</p>
      </section>
    </div>
  </main>;
}
