"use client";

/**
 * Interactive 3×3 puzzle-cube game and Three.js scene.
 *
 * This file owns the complete browser-side play session: Three.js scene setup,
 * cubie/sticker construction, pointer gesture interpretation, animated layer
 * turns, move history, scramble/undo/auto-solve/reset actions, solved-state
 * detection, and the surrounding React interface.
 *
 * Coordinate convention used everywhere below:
 * - +X is the cube's right face and -X is its left face.
 * - +Y is the upper face and -Y is the lower face.
 * - +Z is the front face and -Z is the back face.
 * - Grid coordinates are always integers in the inclusive range -1 through 1.
 * - A legal move rotates one complete grid layer by exactly 90 degrees.
 *
 * Three.js objects are intentionally stored inside one mount-only effect rather
 * than React state. React owns interface values such as status, time, and move
 * count; Three.js owns high-frequency geometry and animation state. This split
 * prevents a 60-fps render loop from causing React to rerender every frame.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/** The three world-space axes around which a cube layer can rotate. */
type AxisName = "x" | "y" | "z";

/** `1` and `-1` encode opposite quarter-turn directions around an axis. */
type TurnDirection = 1 | -1;

/** Each axis contains exactly three selectable layers in a 3×3 puzzle. */
type Layer = -1 | 0 | 1;

/** A normalized internal cube move, independent of user-interface notation. */
type Move = {
  axis: AxisName;
  layer: Layer;
  dir: TurnDirection;
};

/** Permanent sticker metadata used for solved-state color comparisons. */
type StickerData = {
  color: string;
  normal: THREE.Vector3;
};

/**
 * Runtime model for one movable cubie.
 *
 * `grid` changes after each turn, while `home` remains the solved coordinate so
 * Reset can restore the puzzle without rebuilding the entire Three.js scene.
 */
type CubieData = {
  group: THREE.Group;
  grid: THREE.Vector3;
  home: THREE.Vector3;
  stickers: StickerData[];
};

/** Extra playback instructions attached to a queued quarter turn. */
type QueueItem = {
  move: Move;
  /** Whether the completed move becomes part of undo/auto-solve history. */
  record: boolean;
  /** Whether completion removes the latest historical move. */
  popHistory?: boolean;
  /** Whether a player-visible move should increment the counter. */
  countMove?: boolean;
  /** Animation duration in milliseconds. */
  duration: number;
};

/** Imperative controls exposed by the Three.js effect to React buttons. */
type CubeActions = {
  scramble: () => void;
  solve: () => void;
  undo: () => void;
  reset: () => void;
  face: (face: string, direction: TurnDirection) => void;
};

/** Local-storage entry shared with the catalog's personal-best panel. */
const BEST_TIME_STORAGE_KEY = "cube-lab-best-3x3-ms";

/** Standard puzzle colors keyed by common Singmaster face letters. */
const FACE_COLORS: Record<string, string> = {
  U: "#f5f1e8",
  D: "#ffd500",
  F: "#00a85a",
  B: "#1557d5",
  R: "#e52b3d",
  L: "#ff7a00",
};

/**
 * Maps face-button notation to internal axes and layers.
 *
 * The clockwise sign differs by face because a positive mathematical rotation
 * is observed from the positive end of an axis, while cube notation describes
 * clockwise motion as viewed directly toward the named face.
 */
const FACE_MOVES: Record<string, Omit<Move, "dir"> & { clockwise: TurnDirection }> = {
  U: { axis: "y", layer: 1, clockwise: -1 },
  D: { axis: "y", layer: -1, clockwise: 1 },
  F: { axis: "z", layer: 1, clockwise: -1 },
  B: { axis: "z", layer: -1, clockwise: 1 },
  R: { axis: "x", layer: 1, clockwise: -1 },
  L: { axis: "x", layer: -1, clockwise: 1 },
};

/**
 * Converts an axis name into its positive unit vector.
 *
 * @param axis - Axis identifier used by a move.
 * @returns A new unit vector safe for in-place Three.js operations.
 */
const axisVector = (axis: AxisName) =>
  axis === "x"
    ? new THREE.Vector3(1, 0, 0)
    : axis === "y"
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(0, 0, 1);

/**
 * Identifies the dominant axis of an already axis-aligned vector.
 *
 * @param vector - Direction whose largest component selects the axis.
 * @returns `x`, `y`, or `z`.
 */
const axisNameFromVector = (vector: THREE.Vector3): AxisName => {
  if (Math.abs(vector.x) > 0.5) return "x";
  if (Math.abs(vector.y) > 0.5) return "y";
  return "z";
};

/**
 * Removes floating-point drift by snapping a direction to its nearest unit axis.
 *
 * @param vector - Normal or rotation axis that may contain rounding noise.
 * @returns A new vector containing one ±1 component and two zero components.
 */
const snapToAxis = (vector: THREE.Vector3) => {
  const values = [Math.abs(vector.x), Math.abs(vector.y), Math.abs(vector.z)];
  const largest = values.indexOf(Math.max(...values));
  return new THREE.Vector3(
    largest === 0 ? Math.sign(vector.x) || 1 : 0,
    largest === 1 ? Math.sign(vector.y) || 1 : 0,
    largest === 2 ? Math.sign(vector.z) || 1 : 0,
  );
};

/** Decorative shuffle icon; its parent button supplies the accessible label. */
function IconShuffle() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 3h5v5M4 18l5.5-5.5M21 16v5h-5M15 6l6-3M4 6h3.5c2 0 3.1 1 4.2 2.7l4.6 7.1c1 1.5 2 2.2 4.7 2.2" />
    </svg>
  );
}

/** Decorative undo icon; its parent button supplies the accessible label. */
function IconUndo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 7 4 12l5 5M5 12h8a6 6 0 1 1 0 12" />
    </svg>
  );
}

/** Decorative sparkle icon used by the automatic inverse-history solve action. */
function IconSpark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 2 1.5 5.1L18 9l-4.5 1.9L12 16l-1.5-5.1L6 9l4.5-1.9L12 2ZM19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" />
    </svg>
  );
}

/** Decorative reset icon; its parent button supplies the accessible label. */
function IconReset() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 11a8 8 0 1 0-2.3 6.7M20 4v7h-7" />
    </svg>
  );
}

/**
 * Formats a play-session timer without causing variable-width layout jumps.
 *
 * @param milliseconds - Non-negative elapsed session duration.
 * @returns `MM:SS.d`, with minutes allowed to exceed two digits if necessary.
 */
function formatTimer(milliseconds: number): string {
  const safeMilliseconds = Math.max(0, milliseconds);
  const minutes = Math.floor(safeMilliseconds / 60_000);
  const seconds = Math.floor((safeMilliseconds % 60_000) / 1_000);
  const tenths = Math.floor((safeMilliseconds % 1_000) / 100);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

/**
 * Renders and manages the complete playable 3×3 experience.
 *
 * The component requires WebGL for its real 3D engine. If WebGL construction
 * fails, it provides a lightweight CSS cube so controls still demonstrate the
 * interface instead of leaving the visitor with an empty screen.
 *
 * @returns The play-page header, Three.js viewport, and touch-friendly controls.
 */
export default function CubeGame() {
  // The div is the ownership boundary into which Three.js appends one canvas.
  const canvasMountRef = useRef<HTMLDivElement>(null);

  // React buttons call the current engine functions through this stable ref.
  const actionsRef = useRef<CubeActions | null>(null);

  // Timer refs are readable inside the mount-only Three.js effect without stale
  // React closures. Mirrored React state exists only for interface rendering.
  const timerStartedAtRef = useRef<number | null>(null);
  const timerRunningRef = useRef(false);

  // Human-readable live status is announced through the status element.
  const [status, setStatus] = useState("Solved");

  // `solved` changes status styling and records a completed timed session.
  const [solved, setSolved] = useState(true);

  // Busy disables conflicting actions while a move queue is animating.
  const [busy, setBusy] = useState(false);

  // Only manual player turns count toward the visible solve total.
  const [moveCount, setMoveCount] = useState(0);

  // Undo and auto-solve require at least one recorded move.
  const [canUndo, setCanUndo] = useState(false);

  // Face buttons apply either clockwise or counterclockwise turns.
  const [turnDirection, setTurnDirection] = useState<TurnDirection>(1);

  // The elapsed timer begins on the first manual turn after a scramble/reset.
  const [elapsedMilliseconds, setElapsedMilliseconds] = useState(0);

  // This mirrored flag starts and stops the low-frequency React clock effect.
  const [timerRunning, setTimerRunning] = useState(false);

  // WebGL failures activate the CSS fallback rather than breaking the page.
  const [webglFallback, setWebglFallback] = useState(false);
  const [fallbackScrambled, setFallbackScrambled] = useState(false);

  /**
   * Refresh the visible clock ten times per second while a solve is active.
   * This frequency is precise enough for a tenths display and lighter than a
   * state update on every animation frame.
   */
  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => {
      if (timerStartedAtRef.current !== null) {
        setElapsedMilliseconds(performance.now() - timerStartedAtRef.current);
      }
    }, 100);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  /**
   * Construct the Three.js engine once when the canvas mount becomes available.
   * Every listener, animation frame, geometry, and material created here is
   * disposed by the returned cleanup function when the route unmounts.
   */
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    /** Clear both the internal clock and the value shown in React. */
    const resetSessionTimer = () => {
      timerStartedAtRef.current = null;
      timerRunningRef.current = false;
      setTimerRunning(false);
      setElapsedMilliseconds(0);
    };

    /** Begin timing once; later moves in the same solve leave the origin intact. */
    const startSessionTimer = () => {
      if (timerRunningRef.current) return;
      timerStartedAtRef.current = performance.now();
      timerRunningRef.current = true;
      setTimerRunning(true);
      setElapsedMilliseconds(0);
    };

    /**
     * Freeze the active timer and optionally store a new device-local best.
     *
     * @param recordBest - True only for a manual solve, never auto-solve/reset.
     * @returns The final elapsed duration in milliseconds, or zero if idle.
     */
    const stopSessionTimer = (recordBest: boolean): number => {
      if (timerStartedAtRef.current === null) return 0;
      const finalMilliseconds = Math.max(0, performance.now() - timerStartedAtRef.current);
      timerRunningRef.current = false;
      timerStartedAtRef.current = null;
      setTimerRunning(false);
      setElapsedMilliseconds(finalMilliseconds);

      if (recordBest && finalMilliseconds > 0) {
        try {
          const previousValue = Number(window.localStorage.getItem(BEST_TIME_STORAGE_KEY));
          if (!Number.isFinite(previousValue) || previousValue <= 0 || finalMilliseconds < previousValue) {
            window.localStorage.setItem(BEST_TIME_STORAGE_KEY, String(finalMilliseconds));
          }
        } catch {
          // Storage can be unavailable in private/restricted browsing. Gameplay
          // remains fully functional; only cross-page personal-best display is lost.
        }
      }

      return finalMilliseconds;
    };

    // The scene is transparent so the CSS grid and glow remain visible behind it.
    const scene = new THREE.Scene();

    // A moderate field of view avoids fish-eye distortion on the cube's corners.
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(6.2, 5.1, 7.2);

    let renderer: THREE.WebGLRenderer;
    try {
      // Antialiasing and a high-performance preference improve crisp sticker edges
      // when the browser and device GPU can provide them.
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      // Some browsers, remote previews, or older devices cannot create WebGL.
      // Expose the same button API against a CSS visual so the page still explains
      // the product rather than crashing during renderer construction.
      // Defer React state by one task because this catch runs during effect setup;
      // the callback avoids a synchronous effect-to-render cascade.
      const fallbackStateTimer = window.setTimeout(() => setWebglFallback(true), 0);

      /** Restore the non-WebGL interface to a solved-looking state. */
      const fallbackSolve = (message: string) => {
        setFallbackScrambled(false);
        setStatus(message);
        setSolved(true);
        setBusy(false);
        setMoveCount(0);
        setCanUndo(false);
        resetSessionTimer();
      };
      actionsRef.current = {
        scramble: () => {
          resetSessionTimer();
          setFallbackScrambled(true);
          setStatus("Scrambled — your turn");
          setSolved(false);
          setMoveCount(0);
          setCanUndo(true);
        },
        solve: () => fallbackSolve("Solved automatically"),
        undo: () => fallbackSolve("Last move undone"),
        reset: () => fallbackSolve("Solved"),
        face: () => {
          startSessionTimer();
          setFallbackScrambled(true);
          setStatus("Ready");
          setSolved(false);
          setMoveCount((value) => value + 1);
          setCanUndo(true);
        },
      };
      return () => {
        window.clearTimeout(fallbackStateTimer);
        // Removing the API prevents a late button click from calling stale closures.
        actionsRef.current = null;
      };
    }

    // Cap pixel density at 2×. Higher ratios cost GPU fill rate while making very
    // little visible difference on a fast-moving, full-screen 3D object.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = "cube-canvas";
    renderer.domElement.setAttribute("aria-label", "Interactive three-dimensional puzzle cube");
    mount.appendChild(renderer.domElement);

    // OrbitControls owns camera rotation/zoom on empty-space drags. It is
    // temporarily disabled when a pointer begins on a cubie sticker.
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.enablePan = false;
    controls.minDistance = 5.2;
    controls.maxDistance = 11;
    controls.rotateSpeed = 0.72;
    controls.zoomSpeed = 0.75;
    controls.target.set(0, 0, 0);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.55;

    // Every cubie lives under one root. Temporary turn pivots are also attached
    // here, letting a whole layer rotate as one object during animation.
    const cubeRoot = new THREE.Group();
    cubeRoot.rotation.set(0, 0, 0);
    scene.add(cubeRoot);

    // Three lights create readable white stickers, soft shape definition, and a
    // cool rim that matches the site's blue background glow.
    const hemisphere = new THREE.HemisphereLight(0xddeaff, 0x11131d, 2.25);
    scene.add(hemisphere);

    const keyLight = new THREE.DirectionalLight(0xffffff, 5.4);
    keyLight.position.set(5.5, 8, 6.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 24;
    keyLight.shadow.camera.left = -5;
    keyLight.shadow.camera.right = 5;
    keyLight.shadow.camera.top = 5;
    keyLight.shadow.camera.bottom = -5;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x7c9cff, 2.1);
    rimLight.position.set(-6, 3, -5);
    scene.add(rimLight);

    // The transparent ShadowMaterial receives only the cube's contact shadow;
    // the CSS page background remains visible through the rest of the circle.
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(4.1, 72),
      new THREE.ShadowMaterial({ color: 0x03050a, opacity: 0.38 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.05;
    floor.receiveShadow = true;
    scene.add(floor);

    // Cubies are slightly farther apart than their one-unit logical grid so the
    // black plastic seams remain visible between colored stickers.
    const spacing = 1.04;
    const cubieGeometry = new RoundedBoxGeometry(0.94, 0.94, 0.94, 4, 0.075);
    const stickerGeometry = new RoundedBoxGeometry(0.77, 0.77, 0.035, 4, 0.065);
    const plasticMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x11141b,
      roughness: 0.23,
      metalness: 0.04,
      clearcoat: 0.42,
      clearcoatRoughness: 0.19,
    });
    const stickerMaterials = new Map<string, THREE.MeshPhysicalMaterial>();

    // Reuse one material per face color instead of allocating 54 independent
    // materials. This lowers GPU state changes and simplifies cleanup.
    Object.values(FACE_COLORS).forEach((color) => {
      stickerMaterials.set(
        color,
        new THREE.MeshPhysicalMaterial({
          color,
          roughness: 0.29,
          metalness: 0,
          clearcoat: 0.58,
          clearcoatRoughness: 0.2,
        }),
      );
    });

    const cubies: CubieData[] = [];
    const stickerOffset = 0.485;

    /**
     * Attach one colored sticker to the appropriate outward face of a cubie.
     *
     * @param cubie - Cubie that owns the sticker mesh and permanent metadata.
     * @param normal - Local outward unit normal; also determines sticker rotation.
     * @param color - CSS color converted by Three.js into the material color.
     */
    const addSticker = (
      cubie: CubieData,
      normal: THREE.Vector3,
      color: string,
    ) => {
      const sticker = new THREE.Mesh(stickerGeometry, stickerMaterials.get(color));
      sticker.position.copy(normal).multiplyScalar(stickerOffset);
      if (normal.x === 1) sticker.rotation.y = Math.PI / 2;
      if (normal.x === -1) sticker.rotation.y = -Math.PI / 2;
      if (normal.y === 1) sticker.rotation.x = -Math.PI / 2;
      if (normal.y === -1) sticker.rotation.x = Math.PI / 2;
      if (normal.z === -1) sticker.rotation.y = Math.PI;
      sticker.castShadow = true;
      sticker.userData.cubie = cubie;
      sticker.userData.stickerNormal = normal.clone();
      cubie.group.add(sticker);
      cubie.stickers.push({ color, normal: normal.clone() });
    };

    // Build all 26 visible/movable cubies. The hidden center at (0,0,0) is
    // omitted because it would never be seen and never needs to participate.
    for (let x = -1; x <= 1; x += 1) {
      for (let y = -1; y <= 1; y += 1) {
        for (let z = -1; z <= 1; z += 1) {
          if (x === 0 && y === 0 && z === 0) continue;
          const group = new THREE.Group();
          const grid = new THREE.Vector3(x, y, z);
          group.position.copy(grid).multiplyScalar(spacing);
          const cubie: CubieData = {
            group,
            grid: grid.clone(),
            home: grid.clone(),
            stickers: [],
          };
          const body = new THREE.Mesh(cubieGeometry, plasticMaterial);
          body.castShadow = true;
          body.receiveShadow = true;
          body.userData.cubie = cubie;
          group.add(body);
          if (x === 1) addSticker(cubie, new THREE.Vector3(1, 0, 0), FACE_COLORS.R);
          if (x === -1) addSticker(cubie, new THREE.Vector3(-1, 0, 0), FACE_COLORS.L);
          if (y === 1) addSticker(cubie, new THREE.Vector3(0, 1, 0), FACE_COLORS.U);
          if (y === -1) addSticker(cubie, new THREE.Vector3(0, -1, 0), FACE_COLORS.D);
          if (z === 1) addSticker(cubie, new THREE.Vector3(0, 0, 1), FACE_COLORS.F);
          if (z === -1) addSticker(cubie, new THREE.Vector3(0, 0, -1), FACE_COLORS.B);
          cubeRoot.add(group);
          cubies.push(cubie);
        }
      }
    }

    // Raycasting translates a 2D pointer into the frontmost 3D mesh it touches.
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const moveQueue: QueueItem[] = [];

    // History includes scramble and player moves so Auto-solve can reverse the
    // exact reachable state without needing a separate general-purpose solver.
    const history: Move[] = [];

    // Only one layer can animate at a time. Its temporary pivot and selected
    // cubies are retained here until the quarter turn is finalized.
    let activeAnimation:
      | {
          pivot: THREE.Group;
          selected: CubieData[];
          item: QueueItem;
          startedAt: number;
          targetAngle: number;
        }
      | undefined;

    // Lifecycle and mode flags coordinate the render loop with UI messaging.
    let disposed = false;
    let batchMode: "manual" | "scramble" | "solve" | "undo" = "manual";
    let frameId = 0;
    let hasInteracted = false;

    /**
     * Reads one logical grid component and removes any floating-point noise.
     *
     * @param vector - A cubie's current integer-like grid coordinate.
     * @param axis - Component to read.
     * @returns The normalized layer index -1, 0, or 1.
     */
    const getLayerValue = (vector: THREE.Vector3, axis: AxisName) =>
      Math.round(vector[axis]) as Layer;

    /**
     * Determines whether every visible face contains exactly one sticker color.
     *
     * Sticker normals begin in each cubie's local space. Applying the cubie's
     * quaternion moves each normal into cube-root space; snapping then assigns
     * it to one of six face buckets. This accepts any whole-cube orientation and
     * does not require individual cubies to return to their original positions.
     *
     * @returns True when all six face buckets contain nine matching colors.
     */
    const isCubeSolved = () => {
      const faces: Record<string, string[]> = {
        "x+": [],
        "x-": [],
        "y+": [],
        "y-": [],
        "z+": [],
        "z-": [],
      };
      cubies.forEach((cubie) => {
        cubie.stickers.forEach((sticker) => {
          const worldNormal = snapToAxis(sticker.normal.clone().applyQuaternion(cubie.group.quaternion));
          const axis = axisNameFromVector(worldNormal);
          const sign = worldNormal[axis] > 0 ? "+" : "-";
          faces[`${axis}${sign}`].push(sticker.color);
        });
      });
      return Object.values(faces).every(
        (colors) => colors.length === 9 && new Set(colors).size === 1,
      );
    };

    /** Mirror the mutable history length into React button state. */
    const syncHistoryUi = () => {
      setCanUndo(history.length > 0);
    };

    /**
     * Finalize interface state after the final queued turn in a batch.
     *
     * Manual solves stop and store the timer. Automatic operations never qualify
     * for a personal best, even when they return the cube to a solved state.
     */
    const finishBatch = () => {
      const nowSolved = isCubeSolved();
      setSolved(nowSolved);
      setBusy(false);
      syncHistoryUi();
      if (batchMode === "scramble") {
        setMoveCount(0);
        setStatus("Scrambled — your turn");
      } else if (batchMode === "solve") {
        resetSessionTimer();
        setMoveCount(0);
        setStatus(nowSolved ? "Solved automatically" : "Ready");
      } else if (batchMode === "undo") {
        if (nowSolved) stopSessionTimer(false);
        setStatus(nowSolved ? "Solved" : "Last move undone");
      } else {
        if (nowSolved) stopSessionTimer(true);
        setStatus(nowSolved ? "Solved!" : "Ready");
      }
      batchMode = "manual";
    };

    /**
     * Move the next queue item into an animating temporary pivot.
     *
     * @param time - `requestAnimationFrame` timestamp used as animation origin.
     */
    const startNextMove = (time: number) => {
      if (activeAnimation || moveQueue.length === 0) return;
      const item = moveQueue.shift();
      if (!item) return;
      const selected = cubies.filter(
        (cubie) => getLayerValue(cubie.grid, item.move.axis) === item.move.layer,
      );
      const pivot = new THREE.Group();
      cubeRoot.add(pivot);
      selected.forEach((cubie) => pivot.attach(cubie.group));
      activeAnimation = {
        pivot,
        selected,
        item,
        startedAt: time,
        targetAngle: item.move.dir * (Math.PI / 2),
      };
    };

    /**
     * Commit a visually completed quarter turn to permanent cubie transforms.
     *
     * Reattaching each cubie from the pivot to `cubeRoot` preserves its world
     * transform. Logical coordinates are rotated and rounded to maintain the
     * integer-grid invariant across thousands of turns.
     */
    const completeMove = () => {
      if (!activeAnimation) return;
      const { pivot, selected, item, targetAngle } = activeAnimation;
      pivot.rotation[item.move.axis] = targetAngle;
      pivot.updateMatrixWorld(true);
      const vector = axisVector(item.move.axis);
      selected.forEach((cubie) => {
        cubeRoot.attach(cubie.group);
        cubie.grid.applyAxisAngle(vector, targetAngle);
        cubie.grid.set(
          Math.round(cubie.grid.x),
          Math.round(cubie.grid.y),
          Math.round(cubie.grid.z),
        );
        cubie.group.position.copy(cubie.grid).multiplyScalar(spacing);
        cubie.group.quaternion.normalize();
      });
      cubeRoot.remove(pivot);
      if (item.record) history.push(item.move);
      if (item.popHistory) history.pop();
      if (item.countMove) setMoveCount((value) => value + 1);
      activeAnimation = undefined;
      syncHistoryUi();
      if (moveQueue.length === 0) finishBatch();
    };

    /**
     * Append one turn to the serial animation queue and lock conflicting input.
     *
     * @param item - Move plus history, counting, and timing instructions.
     */
    const enqueue = (item: QueueItem) => {
      moveQueue.push(item);
      setBusy(true);
      setSolved(false);
    };

    /**
     * Queue one player-authored turn when no other animation is active.
     *
     * @param move - Axis/layer/direction selected by swipe or face button.
     */
    const manualMove = (move: Move) => {
      if (activeAnimation || moveQueue.length > 0) return;
      batchMode = "manual";
      startSessionTimer();
      setStatus("Turning…");
      enqueue({ move, record: true, countMove: true, duration: 210 });
    };

    /**
     * Generate and animate a 22-turn reachable scramble.
     *
     * Adjacent turns never target the same axis/layer pair, avoiding obvious
     * immediate cancellations. Scramble moves are recorded so Auto-solve can
     * exactly reverse them. The player's timer remains stopped until first input.
     */
    const scramble = () => {
      if (activeAnimation || moveQueue.length > 0) return;
      resetSessionTimer();
      history.length = 0;
      setCanUndo(false);
      setMoveCount(0);
      batchMode = "scramble";
      setStatus("Scrambling…");
      const axes: AxisName[] = ["x", "y", "z"];
      const layers: Layer[] = [-1, 0, 1];
      let previous = "";
      for (let index = 0; index < 22; index += 1) {
        let axis: AxisName;
        let layer: Layer;
        let key: string;
        do {
          axis = axes[Math.floor(Math.random() * axes.length)];
          layer = layers[Math.floor(Math.random() * layers.length)];
          key = `${axis}${layer}`;
        } while (key === previous);
        previous = key;
        enqueue({
          move: { axis, layer, dir: Math.random() > 0.5 ? 1 : -1 },
          record: true,
          duration: 82,
        });
      }
    };

    /**
     * Return to solved by playing the exact inverse of recorded history.
     * This is intentionally a history solver, not a shortest-path cube solver.
     */
    const solve = () => {
      if (activeAnimation || moveQueue.length > 0 || history.length === 0) return;
      resetSessionTimer();
      batchMode = "solve";
      setStatus("Solving…");
      [...history].reverse().forEach((move) => {
        enqueue({
          move: { ...move, dir: (move.dir * -1) as TurnDirection },
          record: false,
          popHistory: true,
          duration: 78,
        });
      });
    };

    /** Reverse only the most recent recorded move. */
    const undo = () => {
      if (activeAnimation || moveQueue.length > 0 || history.length === 0) return;
      const move = history[history.length - 1];
      batchMode = "undo";
      setStatus("Undoing…");
      enqueue({
        move: { ...move, dir: (move.dir * -1) as TurnDirection },
        record: false,
        popHistory: true,
        duration: 190,
      });
    };

    /**
     * Immediately restore every cubie's home coordinate and identity rotation.
     * An in-progress pivot is safely dismantled before transforms are replaced.
     */
    const reset = () => {
      resetSessionTimer();
      moveQueue.length = 0;
      if (activeAnimation) {
        activeAnimation.selected.forEach((cubie) => cubeRoot.attach(cubie.group));
        cubeRoot.remove(activeAnimation.pivot);
        activeAnimation = undefined;
      }
      cubies.forEach((cubie) => {
        cubeRoot.attach(cubie.group);
        cubie.grid.copy(cubie.home);
        cubie.group.position.copy(cubie.home).multiplyScalar(spacing);
        cubie.group.quaternion.identity();
      });
      history.length = 0;
      batchMode = "manual";
      setMoveCount(0);
      setCanUndo(false);
      setBusy(false);
      setSolved(true);
      setStatus("Solved");
    };

    /**
     * Translate a visible face letter and selected direction into an internal move.
     *
     * @param faceName - One of U, D, F, B, R, or L.
     * @param direction - 1 for clockwise or -1 for counterclockwise.
     */
    const face = (faceName: string, direction: TurnDirection) => {
      const base = FACE_MOVES[faceName];
      if (!base) return;
      manualMove({
        axis: base.axis,
        layer: base.layer,
        dir: (base.clockwise * direction) as TurnDirection,
      });
    };

    // Publishing one action object keeps JSX handlers independent of the large
    // effect closure while ensuring they always address the current scene.
    actionsRef.current = { scramble, solve, undo, reset, face };

    /** Pointer information retained between down, threshold crossing, and release. */
    type DragState = {
      pointerId: number;
      startX: number;
      startY: number;
      cubie: CubieData;
      faceNormal: THREE.Vector3;
      moved: boolean;
    };
    let dragState: DragState | undefined;

    /**
     * Convert client pixels into normalized device coordinates and update raycast.
     *
     * @param event - Pointer event originating on the renderer canvas.
     */
    const updatePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
    };

    /**
     * Project a 3D direction into normalized 2D screen space.
     *
     * @param origin - World-space point near the touched cubie.
     * @param direction - Candidate world-space tangent direction.
     * @returns Unit screen vector where +Y points down like pointer coordinates.
     */
    const screenDirection = (origin: THREE.Vector3, direction: THREE.Vector3) => {
      const start = origin.clone().project(camera);
      const end = origin.clone().add(direction).project(camera);
      return new THREE.Vector2(end.x - start.x, -(end.y - start.y)).normalize();
    };

    /**
     * Begin either a face-turn gesture or an empty-space camera orbit.
     *
     * @param event - Primary pointer down event from mouse, pen, or touch.
     */
    const onPointerDown = (event: PointerEvent) => {
      if (activeAnimation || moveQueue.length > 0) return;
      if (!hasInteracted) {
        hasInteracted = true;
        controls.autoRotate = false;
      }
      updatePointer(event);
      const hit = raycaster.intersectObjects(cubeRoot.children, true)[0];
      const cubie = hit?.object.userData.cubie as CubieData | undefined;
      if (!hit || !cubie) {
        controls.enabled = true;
        return;
      }
      event.preventDefault();
      controls.enabled = false;
      renderer.domElement.setPointerCapture(event.pointerId);
      let faceNormal: THREE.Vector3;
      const stickerNormal = hit.object.userData.stickerNormal as THREE.Vector3 | undefined;
      if (stickerNormal) {
        faceNormal = snapToAxis(stickerNormal.clone().applyQuaternion(cubie.group.quaternion));
      } else if (hit.face) {
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
        faceNormal = snapToAxis(hit.face.normal.clone().applyMatrix3(normalMatrix));
      } else {
        return;
      }
      dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        cubie,
        faceNormal,
        moved: false,
      };
    };

    /**
     * Convert a sufficiently long face drag into one unambiguous layer turn.
     *
     * The 13-pixel threshold filters taps and hand jitter. Candidate tangents are
     * the two world axes lying in the touched face. The candidate with the
     * strongest screen-space alignment wins; `faceNormal × tangent` then yields
     * the signed rotation axis according to the right-hand rule.
     *
     * @param event - Pointer movement matching the active pointer identifier.
     */
    const onPointerMove = (event: PointerEvent) => {
      if (!dragState || dragState.pointerId !== event.pointerId || dragState.moved) return;
      const delta = new THREE.Vector2(
        event.clientX - dragState.startX,
        event.clientY - dragState.startY,
      );
      if (delta.length() < 13) return;
      event.preventDefault();
      dragState.moved = true;
      const candidates = [
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 0, 1),
      ].filter((candidate) => Math.abs(candidate.dot(dragState!.faceNormal)) < 0.5);
      const origin = dragState.cubie.group.getWorldPosition(new THREE.Vector3());
      const pointerDirection = delta.normalize();
      let best = candidates[0];
      let bestDot = -1;
      let bestSign: TurnDirection = 1;
      candidates.forEach((candidate) => {
        const projected = screenDirection(origin, candidate);
        const dot = projected.dot(pointerDirection);
        if (Math.abs(dot) > bestDot) {
          bestDot = Math.abs(dot);
          best = candidate;
          bestSign = dot >= 0 ? 1 : -1;
        }
      });
      const tangent = best.clone().multiplyScalar(bestSign);
      const signedRotationAxis = snapToAxis(
        new THREE.Vector3().crossVectors(dragState.faceNormal, tangent),
      );
      const axis = axisNameFromVector(signedRotationAxis);
      const dir = (Math.sign(signedRotationAxis[axis]) || 1) as TurnDirection;
      const layer = getLayerValue(dragState.cubie.grid, axis);
      manualMove({ axis, layer, dir });
    };

    /**
     * End face-drag ownership and restore empty-space OrbitControls behavior.
     *
     * @param event - Pointer up/cancel event matching the active drag.
     */
    const releasePointer = (event: PointerEvent) => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      dragState = undefined;
      controls.enabled = true;
    };

    // Pointer Events provide one implementation for mouse, touch, and pen.
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", releasePointer);
    renderer.domElement.addEventListener("pointercancel", releasePointer);

    /** Keep camera projection and renderer pixels synchronized with the mount. */
    const resize = () => {
      const width = Math.max(mount.clientWidth, 1);
      const height = Math.max(mount.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    /**
     * Advance queued quarter turns and render the next frame.
     *
     * @param time - High-resolution animation timestamp supplied by the browser.
     */
    const animate = (time: number) => {
      if (disposed) return;
      frameId = requestAnimationFrame(animate);
      if (!activeAnimation && moveQueue.length > 0) startNextMove(time);
      if (activeAnimation) {
        const elapsed = time - activeAnimation.startedAt;
        const progress = Math.min(elapsed / activeAnimation.item.duration, 1);

        // Quartic ease-out gives a quick intentional start and a soft mechanical
        // snap at the end without overshooting the exact 90-degree target.
        const eased = 1 - Math.pow(1 - progress, 4);
        activeAnimation.pivot.rotation[activeAnimation.item.move.axis] =
          activeAnimation.targetAngle * eased;
        if (progress >= 1) completeMove();
      }
      controls.update();
      renderer.render(scene, camera);
    };
    frameId = requestAnimationFrame(animate);

    // Route changes must release GPU memory and global listeners. Without this
    // cleanup, repeatedly entering/leaving Play would retain canvases and loops.
    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", releasePointer);
      renderer.domElement.removeEventListener("pointercancel", releasePointer);
      cubieGeometry.dispose();
      stickerGeometry.dispose();
      plasticMaterial.dispose();
      stickerMaterials.forEach((material) => material.dispose());
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
      actionsRef.current = null;
    };
  }, []);

  return (
    <main className="game-shell">
      {/* Decorative glows live behind both the canvas and interactive controls. */}
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <div className="play-identity">
          <Link className="back-button" href="/" aria-label="Back to puzzle catalog">←</Link>
          <div>
            <span>Classic 3×3</span>
            <small>PLAY / CUBE LAB</small>
          </div>
        </div>

        {/* `role=status` politely announces state changes without stealing focus. */}
        <div className={`status-pill ${solved ? "is-solved" : ""}`} role="status">
          <span className="status-dot" />
          {status}
        </div>

        <div className="play-metrics">
          <div className="timer-readout" aria-label={`Elapsed time ${formatTimer(elapsedMilliseconds)}`}>
            <span>TIME</span>
            <b>{formatTimer(elapsedMilliseconds)}</b>
          </div>
          <div className="move-readout" aria-label={`${moveCount} moves`}>
            <span>MOVES</span>
            <b>{String(moveCount).padStart(2, "0")}</b>
          </div>
        </div>
      </header>

      <section className="cube-stage" id="cube" aria-label="3D cube play area">
        <div className="stage-copy">
          <p className="eyebrow">3×3 CLASSIC / LIVE</p>
          <h1>Turn it.<br />Solve it.</h1>
          <p className="stage-note">Swipe a colored tile to turn a layer. Drag the empty space to look around.</p>
        </div>

        {/* Three.js appends its canvas to this mount. The conditional CSS cube is
            rendered only when WebGL creation failed. */}
        <div className="canvas-wrap" ref={canvasMountRef}>
          {webglFallback && (
            <div className={`fallback-scene ${fallbackScrambled ? "is-scrambled" : ""}`} aria-hidden="true">
              <div className="fallback-shadow" />
              <div className="fallback-cube">
                {[
                  {
                    name: "top",
                    colors: fallbackScrambled
                      ? ["#f5f1e8", "#1557d5", "#ffd500", "#ff7a00", "#f5f1e8", "#00a85a", "#e52b3d", "#ffd500", "#1557d5"]
                      : Array(9).fill(FACE_COLORS.U),
                  },
                  {
                    name: "front",
                    colors: fallbackScrambled
                      ? ["#00a85a", "#e52b3d", "#ff7a00", "#1557d5", "#00a85a", "#f5f1e8", "#ffd500", "#00a85a", "#e52b3d"]
                      : Array(9).fill(FACE_COLORS.F),
                  },
                  {
                    name: "right",
                    colors: fallbackScrambled
                      ? ["#e52b3d", "#ffd500", "#1557d5", "#f5f1e8", "#e52b3d", "#00a85a", "#ff7a00", "#1557d5", "#e52b3d"]
                      : Array(9).fill(FACE_COLORS.R),
                  },
                ].map((faceData) => (
                  <div className={`fallback-face ${faceData.name}`} key={faceData.name}>
                    {faceData.colors.map((color, index) => (
                      <i key={index} style={{ background: color }} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="gesture-hint" aria-hidden="true">
          <span className="gesture-line" />
          <span>SWIPE A TILE</span>
        </div>
      </section>

      {/* The control dock remains reachable by thumb below the play viewport. */}
      <section className="control-dock" aria-label="Cube controls">
        <div className="action-row">
          <button
            className="action-button primary-action"
            onClick={() => actionsRef.current?.scramble()}
            disabled={busy}
          >
            <IconShuffle />
            <span>Scramble</span>
          </button>
          <button
            className="action-button"
            onClick={() => actionsRef.current?.undo()}
            disabled={busy || !canUndo}
          >
            <IconUndo />
            <span>Undo</span>
          </button>
          <button
            className="action-button solve-action"
            onClick={() => actionsRef.current?.solve()}
            disabled={busy || !canUndo}
          >
            <IconSpark />
            <span>Auto-solve</span>
          </button>
          <button
            className="action-button"
            onClick={() => actionsRef.current?.reset()}
            disabled={busy && status === "Solving…"}
          >
            <IconReset />
            <span>Reset</span>
          </button>
        </div>

        <div className="face-controls">
          <div className="face-control-label">
            <span>PRECISE TURNS</span>
            <div className="direction-switch" aria-label="Turn direction">
              <button
                className={turnDirection === 1 ? "active" : ""}
                onClick={() => setTurnDirection(1)}
                aria-label="Clockwise turns"
              >
                ↻
              </button>
              <button
                className={turnDirection === -1 ? "active" : ""}
                onClick={() => setTurnDirection(-1)}
                aria-label="Counterclockwise turns"
              >
                ↺
              </button>
            </div>
          </div>
          <div className="face-button-row">
            {["U", "D", "F", "B", "R", "L"].map((faceName) => (
              <button
                key={faceName}
                className="face-button"
                style={{ "--face-color": FACE_COLORS[faceName] } as React.CSSProperties}
                onClick={() => actionsRef.current?.face(faceName, turnDirection)}
                disabled={busy}
                aria-label={`Turn ${faceName} face ${turnDirection === 1 ? "clockwise" : "counterclockwise"}`}
              >
                <i />
                {faceName}
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
