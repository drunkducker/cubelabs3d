"use client";

/**
 * Facelet-driven Kilominx solver playback — the corners-only Megaminx analogue
 * of NxNSolverCube3D. It renders the real dodecahedron and animates a verified
 * solution move-by-move, exactly like the 4×4 solver's 3D playback panel.
 *
 * Like NxNSolverCube3D, the puzzle geometry starts SOLVED and every sticker is
 * coloured straight from the cube's actual facelet snapshot (the scramble or the
 * hand-entered cube), so a scrambled cube renders as its scramble. Solution
 * moves then physically spin the right five corners; because the solution is a
 * correct solve for those colours, the faces resolve to solid colour as playback
 * reaches the end. All geometry and move tables come from lib/kilominx-engine.ts
 * (independently tested) and the same CCW kite ordering the flat net uses, so the
 * 3D view and the net cannot quietly disagree.
 *
 * A "locked" prop freezes the camera the way the Skewb's Rotate-View lock does:
 * when set, drag-to-rotate and zoom are disabled so the puzzle holds a fixed
 * viewing angle (and the page scrolls past it cleanly on touch).
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  VERTICES, FACE_CORNERS, FACE_CORNERS_CCW, FACE_COLORS, faceNormal,
  solved as kiloSolved, applyMoveIndex, faceOfMove, dirOfMove, inverseMoveIndex,
  type KiloState,
} from "@/lib/kilominx-engine";

const toVec3 = (v: readonly [number, number, number]) => new THREE.Vector3(v[0], v[1], v[2]);
const TURN = (2 * Math.PI) / 5;

/**
 * Split pentagonal face f into its 5 corner "kite" stickers, in the engine's CCW
 * order (FACE_CORNERS_CCW) so kite index k lines up with facelet index f*5+k.
 * Each kite is the quad bounded by a corner vertex, the midpoints of the two
 * pentagon edges touching it, and the face centre.
 */
function faceKites(f: number): { corner: number; kite: number; quad: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3] }[] {
  const ordered = FACE_CORNERS_CCW[f];
  const pts = ordered.map(c => toVec3(VERTICES[c]));
  const center = pts.reduce((a, p) => a.add(p.clone()), new THREE.Vector3()).multiplyScalar(1 / 5);
  const mid = (i: number, j: number) => pts[i].clone().add(pts[j]).multiplyScalar(0.5);
  return ordered.map((c, i) => {
    const prev = (i + 4) % 5, next = (i + 1) % 5;
    return { corner: c, kite: i, quad: [pts[i].clone(), mid(i, next), center.clone(), mid(i, prev)] };
  });
}

/** Two-triangle quad, shrunk toward its centroid so the dark backing shows as
 * thin gaps between stickers (identical to KilominxGame). */
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

type SceneApi = {
  setColors: (facelets: number[]) => void;
  setSolution: (solution: number[]) => void;
  goToStep: (step: number) => void;
  rebuildTo: (step: number) => void;
  setDuration: (ms: number) => void;
  setLocked: (locked: boolean) => void;
};

export default function KilominxSolverCube3D({
  initialFacelets, solution, step, onAnimating, durationMs = 320, locked = false,
}: {
  initialFacelets: number[];
  solution: number[];
  step: number;
  onAnimating: (animating: boolean) => void;
  durationMs?: number;
  locked?: boolean;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<SceneApi | null>(null);
  const onAnimatingRef = useRef(onAnimating);
  const prevFacelets = useRef<number[] | null>(null);
  const prevSolution = useRef<number[] | null>(null);

  useEffect(() => { onAnimatingRef.current = onAnimating; }, [onAnimating]);

  // ---- Build the scene once. ----
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    const distance = 6.6;
    camera.position.set(distance * 0.7, distance * 0.55, distance);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      // WebGL disabled: leave the placeholder text under us untouched rather
      // than crashing the solver route.
      return;
    }
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
    controls.minDistance = 3.8;
    controls.maxDistance = 13;
    controls.target.set(0, 0, 0);
    controls.update();

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
    // Sticker material keyed by facelet index f*5+k, so recolouring on a new
    // cube is a direct lookup.
    const stickerMats = new Map<number, THREE.MeshStandardMaterial>();

    for (let face = 0; face < 12; face++) {
      for (const kite of faceKites(face)) {
        const faceletIndex = face * 5 + kite.kite;
        const stickerGeo = quadGeometry(kite.quad, 0.9);
        const backingGeo = quadGeometry(kite.quad, 0.99);
        geometries.push(stickerGeo, backingGeo);
        const stickerMat = new THREE.MeshStandardMaterial({
          color: FACE_COLORS[face], roughness: 0.32, metalness: 0.02,
          emissive: FACE_COLORS[face], emissiveIntensity: 0.04,
          polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
        });
        materials.push(stickerMat);
        stickerMats.set(faceletIndex, stickerMat);
        const sticker = new THREE.Mesh(stickerGeo, stickerMat);
        const backing = new THREE.Mesh(backingGeo, bodyMaterial);
        cornerGroups[kite.corner].add(backing);
        cornerGroups[kite.corner].add(sticker);
      }
    }

    // ---- Playback machinery. Geometry starts solved; logicalState tracks the
    // solution moves applied to solved so we always know which five groups sit
    // on a given face. Colours (baked onto the pieces) carry the scramble. ----
    let logicalState: KiloState = kiloSolved();
    let shownStep = 0;
    let currentSolution: number[] = [];
    let duration = durationMs;
    let disposed = false;
    let moveFrame = 0;
    let animating = false;

    const groupsForFace = (face: number): THREE.Group[] =>
      FACE_CORNERS[face].map(slot => cornerGroups[logicalState.cp[slot]]);

    const bakePivot = (pivot: THREE.Group, pieces: THREE.Group[]) => {
      pivot.updateMatrixWorld(true);
      pieces.forEach(g => root.attach(g));
      root.remove(pivot);
    };

    const applyInstant = (mi: number) => {
      const face = faceOfMove(mi);
      const axis = toVec3(faceNormal(face));
      const angle = dirOfMove(mi) === 1 ? TURN : -TURN;
      const pieces = groupsForFace(face);
      const pivot = new THREE.Group(); root.add(pivot);
      pieces.forEach(g => pivot.attach(g));
      pivot.quaternion.setFromAxisAngle(axis, angle);
      bakePivot(pivot, pieces);
      logicalState = applyMoveIndex(logicalState, mi);
    };

    const hardReset = () => {
      cornerGroups.forEach(g => { g.position.set(0, 0, 0); g.quaternion.identity(); g.scale.set(1, 1, 1); });
      logicalState = kiloSolved();
    };

    const rebuildTo = (targetStep: number) => {
      const clamped = Math.max(0, Math.min(currentSolution.length, targetStep));
      hardReset();
      for (let i = 0; i < clamped; i++) applyInstant(currentSolution[i]);
      shownStep = clamped;
    };

    const animateOne = (mi: number, targetStep: number) => {
      const face = faceOfMove(mi);
      const axis = toVec3(faceNormal(face));
      const angle = dirOfMove(mi) === 1 ? TURN : -TURN;
      const pieces = groupsForFace(face);
      const pivot = new THREE.Group(); root.add(pivot);
      pieces.forEach(g => pivot.attach(g));
      const started = performance.now();
      animating = true;
      onAnimatingRef.current(true);
      const anim = (now: number) => {
        if (disposed) return;
        const p = Math.min(1, (now - started) / Math.max(1, duration));
        const eased = 1 - Math.pow(1 - p, 3);
        pivot.quaternion.setFromAxisAngle(axis, angle * eased);
        if (p < 1) { moveFrame = requestAnimationFrame(anim); return; }
        bakePivot(pivot, pieces);
        logicalState = applyMoveIndex(logicalState, mi);
        shownStep = targetStep;
        animating = false;
        onAnimatingRef.current(false);
      };
      moveFrame = requestAnimationFrame(anim);
    };

    const goToStep = (targetStep: number) => {
      if (animating) return;
      const clamped = Math.max(0, Math.min(currentSolution.length, targetStep));
      const diff = clamped - shownStep;
      if (diff === 0) return;
      if (diff === 1) animateOne(currentSolution[shownStep], shownStep + 1);
      else if (diff === -1) animateOne(inverseMoveIndex(currentSolution[shownStep - 1]), shownStep - 1);
      else rebuildTo(clamped);
    };

    apiRef.current = {
      setColors: (facelets) => {
        for (let f = 0; f < 12; f++) for (let k = 0; k < 5; k++) {
          const mat = stickerMats.get(f * 5 + k);
          if (!mat) continue;
          const v = facelets[f * 5 + k];
          const color = v >= 0 && v < 12 ? FACE_COLORS[v] : "#1a1d24";
          mat.color.set(color);
          mat.emissive.set(color);
        }
      },
      setSolution: (next) => { currentSolution = next; },
      goToStep,
      rebuildTo,
      setDuration: (ms) => { duration = ms; },
      setLocked: (isLocked) => {
        controls.enableRotate = !isLocked;
        controls.enableZoom = !isLocked;
        renderer.domElement.style.cursor = isLocked ? "default" : "grab";
        renderer.domElement.style.touchAction = isLocked ? "pan-y" : "none";
      },
    };

    const resize = () => {
      const w = Math.max(1, mount.clientWidth), h = Math.max(1, mount.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
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
      cancelAnimationFrame(moveFrame);
      observer.disconnect();
      controls.dispose();
      apiRef.current = null;
      materials.forEach(m => m.dispose());
      geometries.forEach(g => g.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- React props -> scene. A new cube (colours) or a new solution rebuilds
  // instantly to `step`; a step change alone animates (±1) or scrubs (jump). ----
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    const colorsChanged = prevFacelets.current !== initialFacelets;
    const solutionChanged = prevSolution.current !== solution;
    prevFacelets.current = initialFacelets;
    prevSolution.current = solution;
    if (colorsChanged) api.setColors(initialFacelets);
    api.setSolution(solution);
    if (colorsChanged || solutionChanged) api.rebuildTo(step);
    else api.goToStep(step);
  }, [initialFacelets, solution, step]);

  useEffect(() => { apiRef.current?.setDuration(durationMs); }, [durationMs]);
  useEffect(() => { apiRef.current?.setLocked(locked); }, [locked]);

  return <div ref={mountRef} className="h-full w-full" />;
}
