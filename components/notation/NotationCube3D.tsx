"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FACE_COLORS, FACE_TEXT, turnsOf, type Face } from "@/lib/cube-notation";

type Axis = "x" | "y" | "z";
type Direction = 1 | -1;
type Cubie = { mesh: THREE.Group; grid: THREE.Vector3; home: THREE.Vector3 };
type PointerStart = { pointerId: number; clientX: number; clientY: number; cubie: Cubie; normal: THREE.Vector3; label: string };
type Gesture = { axis: Axis; layer: number; direction: Direction; label: string };
type QueueItem = { gesture: Gesture; emit: string | null; fast: boolean };
type GuideInfo = { token: string; face: Face; axis: Axis; layer: number; dir: Direction; color: string };
type Px = { x: number; y: number };

export type NotationCube3DHandle = {
  /** Animate a token sequence programmatically (scramble / solution playback). Does not emit onCommit. */
  playMoves: (tokens: string[], opts?: { fast?: boolean }) => void;
  /** Snap geometry back to solved. */
  reset: () => void;
  /** Reset the camera framing. */
  resetView: () => void;
  /** Show the play-engine flick needed for a move token (single quarter, e.g. "R" / "R'"), or clear it. */
  setGuide: (token: string | null) => void;
  /** Whether a turn / playback is currently animating. */
  isBusy: () => boolean;
};

type Props = {
  /** Called after a user swipe commits an outer face turn (a single quarter: e.g. "R" or "R'"). */
  onCommit?: (token: string) => void;
  onStatus?: (status: string) => void;
  onBusyChange?: (busy: boolean) => void;
  /** Coaching feedback graded against the ideal flick, for tuning thumb moves. */
  onSwipeGrade?: (grade: { text: string; quality: "great" | "ok" | "off" }) => void;
};

const SIZE = 3;
const EDGE = (SIZE - 1) / 2;

const FACE_MOVE: Record<Face, { axis: Axis; layerSign: Direction; clockwise: Direction }> = {
  U: { axis: "y", layerSign: 1, clockwise: -1 },
  D: { axis: "y", layerSign: -1, clockwise: 1 },
  F: { axis: "z", layerSign: 1, clockwise: -1 },
  B: { axis: "z", layerSign: -1, clockwise: 1 },
  R: { axis: "x", layerSign: 1, clockwise: -1 },
  L: { axis: "x", layerSign: -1, clockwise: 1 },
};

const axisVector = (axis: Axis) =>
  axis === "x" ? new THREE.Vector3(1, 0, 0) : axis === "y" ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);

const dominantAxis = (value: THREE.Vector3): Axis => {
  const axes = [Math.abs(value.x), Math.abs(value.y), Math.abs(value.z)];
  const index = axes.indexOf(Math.max(...axes));
  return index === 0 ? "x" : index === 1 ? "y" : "z";
};

const snapGrid = (value: number) => Math.round(value + EDGE) - EDGE;

function moveLabel(axis: Axis, layer: number, direction: Direction): string {
  const face: Face =
    axis === "x" ? (layer > 0 ? "R" : "L") : axis === "y" ? (layer > 0 ? "U" : "D") : layer > 0 ? "F" : "B";
  const prime = direction === FACE_MOVE[face].clockwise ? "" : "'";
  return `${face}${prime}`;
}

function labelTexture(label: string, color: string, textColor: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(12, 12, 232, 232, 34);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.42)";
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.fillStyle = textColor;
  ctx.font = "900 92px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 128, 134);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function haloTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.25, "rgba(255,255,255,.85)");
  gradient.addColorStop(0.55, "rgba(255,255,255,.35)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Interactive labelled 3×3 cube. Swipe a sticker to turn its outer face, tap to
 * identify. The parent lab owns logical state; this component reports the
 * committed face token (onCommit) and animates programmatic sequences on request.
 *
 * The guide teaches the real play-engine gesture: for the next move it finds the
 * exact anchor sticker + screen direction the swipe resolver needs (touching a
 * face centre does NOT turn that face — you flick a sticker on the layer's
 * adjacent face), then draws a looping glowing flick there. Your live drag is
 * overlaid and graded so you can fine-tune the thumb move used in play.
 */
const NotationCube3D = forwardRef<NotationCube3DHandle, Props>(function NotationCube3D(
  { onCommit, onStatus, onBusyChange, onSwipeGrade },
  ref,
) {
  const mountRef = useRef<HTMLDivElement>(null);
  const idealWrapRef = useRef<HTMLDivElement>(null);
  const idealRingRef = useRef<HTMLDivElement>(null);
  const idealTrailRef = useRef<HTMLDivElement>(null);
  const idealCometRef = useRef<HTMLDivElement>(null);
  const idealArrowRef = useRef<HTMLDivElement>(null);
  const idealBadgeRef = useRef<HTMLDivElement>(null);
  const userWrapRef = useRef<HTMLDivElement>(null);
  const userTrailRef = useRef<HTMLDivElement>(null);
  const userHeadRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<NotationCube3DHandle | null>(null);
  const callbacks = useRef({ onCommit, onStatus, onBusyChange, onSwipeGrade });
  callbacks.current = { onCommit, onStatus, onBusyChange, onSwipeGrade };

  const [selected, setSelected] = useState("Swipe a sticker to turn • tap to identify");

  useImperativeHandle(ref, () => ({
    playMoves: (tokens, opts) => apiRef.current?.playMoves(tokens, opts),
    reset: () => apiRef.current?.reset(),
    resetView: () => apiRef.current?.resetView(),
    setGuide: (token) => apiRef.current?.setGuide(token),
    isBusy: () => apiRef.current?.isBusy() ?? false,
  }), []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    const distance = SIZE * 5.4;
    camera.position.set(distance * 0.82, distance * 0.68, distance);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearAlpha(0);
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none";
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.rotateSpeed = 0.72;
    controls.minDistance = SIZE * 2.4;
    controls.maxDistance = SIZE * 6.4;
    controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.autoRotateSpeed = 0.5;
    controls.touches.ONE = THREE.TOUCH.ROTATE;
    controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
    controls.update();
    controls.saveState();

    scene.add(new THREE.HemisphereLight("#ffffff", "#223052", 2.1));
    const key = new THREE.DirectionalLight("#ffffff", 2.3);
    key.position.set(8, 12, 10);
    scene.add(key);
    const rim = new THREE.DirectionalLight("#8fb7ff", 1.3);
    rim.position.set(-10, 3, -8);
    scene.add(rim);

    const root = new THREE.Group();
    scene.add(root);

    const bodyGeometry = new THREE.BoxGeometry(0.92, 0.92, 0.92);
    const stickerGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.05);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: "#111318", roughness: 0.4, metalness: 0.08 });
    const materials: THREE.Material[] = [bodyMaterial];
    const textures: THREE.Texture[] = [];
    const cubies: Cubie[] = [];
    const pickables: THREE.Mesh[] = [];

    const addSticker = (
      group: THREE.Group,
      face: Face,
      position: [number, number, number],
      rotation: [number, number, number],
    ) => {
      const texture = labelTexture(face, FACE_COLORS[face], FACE_TEXT[face]);
      textures.push(texture);
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.28,
        metalness: 0.02,
        emissive: FACE_COLORS[face],
        emissiveIntensity: 0.04,
      });
      materials.push(material);
      const sticker = new THREE.Mesh(stickerGeometry, material);
      sticker.position.set(...position);
      sticker.rotation.set(...rotation);
      sticker.userData.face = face;
      sticker.userData.label = face;
      sticker.userData.isSticker = true;
      sticker.userData.baseColor = FACE_COLORS[face];
      group.add(sticker);
      pickables.push(sticker);
    };

    for (let xi = 0; xi < SIZE; xi++)
      for (let yi = 0; yi < SIZE; yi++)
        for (let zi = 0; zi < SIZE; zi++) {
          const exterior = xi === 0 || yi === 0 || zi === 0 || xi === SIZE - 1 || yi === SIZE - 1 || zi === SIZE - 1;
          if (!exterior) continue;
          const x = xi - EDGE;
          const y = yi - EDGE;
          const z = zi - EDGE;
          const cubieGroup = new THREE.Group();
          cubieGroup.position.set(x, y, z);
          cubieGroup.add(new THREE.Mesh(bodyGeometry, bodyMaterial));
          if (y === EDGE) addSticker(cubieGroup, "U", [0, 0.472, 0], [Math.PI / 2, 0, 0]);
          if (y === -EDGE) addSticker(cubieGroup, "D", [0, -0.472, 0], [Math.PI / 2, 0, 0]);
          if (z === EDGE) addSticker(cubieGroup, "F", [0, 0, 0.472], [0, 0, 0]);
          if (z === -EDGE) addSticker(cubieGroup, "B", [0, 0, -0.472], [0, Math.PI, 0]);
          if (x === EDGE) addSticker(cubieGroup, "R", [0.472, 0, 0], [0, Math.PI / 2, 0]);
          if (x === -EDGE) addSticker(cubieGroup, "L", [-0.472, 0, 0], [0, Math.PI / 2, 0]);
          const cubie: Cubie = { mesh: cubieGroup, grid: new THREE.Vector3(x, y, z), home: new THREE.Vector3(x, y, z) };
          cubieGroup.traverse((child) => {
            child.userData.cubie = cubie;
          });
          root.add(cubieGroup);
          cubies.push(cubie);
        }

    // Guide glow (3D halo attached to the anchor sticker you should flick).
    const haloMap = haloTexture();
    textures.push(haloMap);
    const haloMaterial = new THREE.SpriteMaterial({ map: haloMap, color: "#ffffff", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    materials.push(haloMaterial);
    const halo = new THREE.Sprite(haloMaterial);
    halo.visible = false;
    halo.renderOrder = 20;

    let guideInfo: GuideInfo | null = null;
    let anchor: THREE.Mesh | null = null;
    let idealDir: Px | null = null; // latest ideal flick direction in screen space (for grading)

    const tmpA = new THREE.Vector3();
    const tmpB = new THREE.Vector3();

    const worldNormalOf = (sticker: THREE.Mesh) => {
      const sp = sticker.getWorldPosition(tmpA.clone());
      const cp = (sticker.userData.cubie as Cubie).mesh.getWorldPosition(tmpB.clone());
      return sp.sub(cp).normalize();
    };
    const facingCamera = (sticker: THREE.Mesh) => {
      const sp = sticker.getWorldPosition(new THREE.Vector3());
      const n = worldNormalOf(sticker);
      return n.dot(camera.position.clone().sub(sp).normalize());
    };
    const projectToPx = (world: THREE.Vector3): Px | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      const v = world.clone().project(camera);
      if (v.z > 1) return null;
      return { x: (v.x * 0.5 + 0.5) * rect.width, y: (-v.y * 0.5 + 0.5) * rect.height };
    };

    const clearAnchorGlow = () => {
      if (anchor) {
        const mat = anchor.material as THREE.MeshStandardMaterial;
        mat.emissive.set(anchor.userData.baseColor as string);
        mat.emissiveIntensity = 0.04;
      }
      halo.removeFromParent();
      halo.visible = false;
      haloMaterial.opacity = 0;
    };
    const setAnchor = (next: THREE.Mesh | null) => {
      if (next === anchor) return;
      clearAnchorGlow();
      anchor = next;
      if (!anchor || !guideInfo) return;
      const mat = anchor.material as THREE.MeshStandardMaterial;
      mat.emissive.set(guideInfo.color);
      mat.emissiveIntensity = 0.85;
      haloMaterial.color.set(guideInfo.color);
      anchor.add(halo);
      halo.position.set(0, 0, 0.16);
      halo.scale.setScalar(0.6);
      halo.visible = true;
      haloMaterial.opacity = 0.85;
    };
    const pickAnchor = (info: GuideInfo): THREE.Mesh | null => {
      const axisHat = axisVector(info.axis);
      let best: THREE.Mesh | null = null;
      let bestScore = -Infinity;
      for (const sticker of pickables) {
        const cubie = sticker.userData.cubie as Cubie;
        if (Math.abs(cubie.grid[info.axis] - info.layer) > 0.01) continue;
        const n = worldNormalOf(sticker);
        if (Math.abs(n.dot(axisHat)) > 0.5) continue; // a face-normal-along-axis sticker can't flick this layer
        const score = facingCamera(sticker);
        if (score > bestScore) {
          bestScore = score;
          best = sticker;
        }
      }
      return best;
    };
    const idealFlickWorld = (mesh: THREE.Mesh, info: GuideInfo) => {
      const n = worldNormalOf(mesh);
      const start = mesh.getWorldPosition(new THREE.Vector3()).addScaledVector(n, 0.05);
      // tangent = dir * (axis × normal) → resolver reads this as the wanted quarter turn.
      const tangent = axisVector(info.axis).cross(n).multiplyScalar(info.dir).normalize();
      const end = start.clone().addScaledVector(tangent, 0.82);
      return { start, end };
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerStart: PointerStart | null = null;
    let selectedSticker: THREE.Mesh | null = null;
    let previewGesture: Gesture | null = null;
    let highlighted: Cubie[] = [];
    let active = false;
    let disposed = false;
    let turnFrame = 0;
    const queue: QueueItem[] = [];

    const setStatus = (text: string) => {
      setSelected(text);
      callbacks.current.onStatus?.(text);
    };
    const setBusy = (busy: boolean) => callbacks.current.onBusyChange?.(busy);

    const glowSticker = (mesh: THREE.Mesh | null, intensity: number) => {
      if (!mesh || mesh === anchor) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissive.set(intensity ? "#4d7cff" : (mesh.userData.baseColor as string));
      mat.emissiveIntensity = intensity || 0.04;
    };
    const glowCubie = (cubie: Cubie, intensity: number) =>
      cubie.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.isSticker) glowSticker(child, intensity);
      });
    const clearHighlight = (keepSelection = true) => {
      highlighted.forEach((cubie) => glowCubie(cubie, 0));
      highlighted = [];
      previewGesture = null;
      if (keepSelection && selectedSticker) glowSticker(selectedSticker, 0.42);
    };
    const highlightLayer = (gesture: Gesture) => {
      clearHighlight();
      highlighted = cubies.filter((cubie) => Math.abs(cubie.grid[gesture.axis] - gesture.layer) < 0.01);
      highlighted.forEach((cubie) => glowCubie(cubie, 0.3));
      previewGesture = gesture;
    };

    const setPointerFromEvent = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
    };
    const pickSticker = (event: PointerEvent) => {
      setPointerFromEvent(event);
      return raycaster.intersectObjects(pickables, false)[0]?.object as THREE.Mesh | undefined;
    };

    const projectedScreenDirection = (worldDirection: THREE.Vector3) => {
      const origin = new THREE.Vector3().project(camera);
      const endpoint = worldDirection.clone().project(camera);
      return new THREE.Vector2(endpoint.x - origin.x, -(endpoint.y - origin.y)).normalize();
    };
    const resolveGesture = (start: PointerStart, dx: number, dy: number): Gesture => {
      const faceAxis = dominantAxis(start.normal);
      const candidates = (["x", "y", "z"] as Axis[]).filter((axis) => axis !== faceAxis);
      const drag = new THREE.Vector2(dx, dy).normalize();
      const best = candidates.reduce(
        (winner, axis) => {
          const score = Math.abs(drag.dot(projectedScreenDirection(axisVector(axis))));
          return score > winner.score ? { axis, score } : winner;
        },
        { axis: candidates[0]!, score: -1 },
      );
      const worldTangent = axisVector(best.axis);
      if (drag.dot(projectedScreenDirection(worldTangent)) < 0) worldTangent.multiplyScalar(-1);
      const rotationVector = start.normal.clone().cross(worldTangent).normalize();
      const axis = dominantAxis(rotationVector);
      const direction = (Math.sign(rotationVector[axis]) || 1) as Direction;
      const layer = start.cubie.grid[axis];
      return { axis, layer, direction, label: moveLabel(axis, layer, direction) };
    };

    const runNext = () => {
      if (active || queue.length === 0) return;
      turnLayer(queue.shift()!);
    };
    const turnLayer = (item: QueueItem) => {
      const { gesture, emit, fast } = item;
      active = true;
      setBusy(true);
      controls.enabled = false;
      controls.autoRotate = false;
      if (selectedSticker) {
        glowSticker(selectedSticker, 0);
        selectedSticker = null;
      }
      clearHighlight(false);
      const selectedCubies = cubies.filter((cubie) => Math.abs(cubie.grid[gesture.axis] - gesture.layer) < 0.01);
      const pivot = new THREE.Group();
      root.add(pivot);
      selectedCubies.forEach((cubie) => pivot.attach(cubie.mesh));
      const startedAt = performance.now();
      const duration = fast ? 120 : 240;
      const animateTurn = (now: number) => {
        if (disposed) return;
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        pivot.rotation[gesture.axis] = gesture.direction * Math.PI * 0.5 * eased;
        if (progress < 1) {
          turnFrame = requestAnimationFrame(animateTurn);
          return;
        }
        pivot.updateMatrixWorld(true);
        const rotation = new THREE.Matrix4().makeRotationAxis(axisVector(gesture.axis), gesture.direction * Math.PI * 0.5);
        selectedCubies.forEach((cubie) => {
          root.attach(cubie.mesh);
          cubie.mesh.position.set(snapGrid(cubie.mesh.position.x), snapGrid(cubie.mesh.position.y), snapGrid(cubie.mesh.position.z));
          cubie.grid.applyMatrix4(rotation).set(snapGrid(cubie.grid.x), snapGrid(cubie.grid.y), snapGrid(cubie.grid.z));
        });
        root.remove(pivot);
        active = false;
        if (emit) {
          setStatus(`${gesture.label} committed`);
          callbacks.current.onCommit?.(emit);
        }
        if (queue.length === 0) setBusy(false);
        runNext();
      };
      turnFrame = requestAnimationFrame(animateTurn);
    };

    const gesturesForToken = (token: string): Gesture[] => {
      const face = token[0] as Face;
      const fm = FACE_MOVE[face];
      const layer = fm.layerSign * EDGE;
      const quarter = (direction: Direction): Gesture => ({ axis: fm.axis, layer, direction, label: token });
      const turns = turnsOf(token);
      if (turns === 1) return [quarter(fm.clockwise)];
      if (turns === 3) return [quarter((-fm.clockwise) as Direction)];
      return [quarter(fm.clockwise), quarter(fm.clockwise)];
    };

    // Flick-guide overlay updates (screen space).
    const setLine = (el: HTMLDivElement, from: Px, len: number, angleDeg: number) => {
      el.style.left = `${from.x}px`;
      el.style.top = `${from.y}px`;
      el.style.width = `${len}px`;
      el.style.transform = `rotate(${angleDeg}deg)`;
    };
    const setDot = (el: HTMLDivElement, at: Px) => {
      el.style.left = `${at.x}px`;
      el.style.top = `${at.y}px`;
    };
    const hideIdeal = () => {
      if (idealWrapRef.current) idealWrapRef.current.style.opacity = "0";
      idealDir = null;
    };
    const showIdeal = (cometT: number) => {
      const wrap = idealWrapRef.current;
      // Hold the last good position on a transient miss (anchor re-pick or a
      // point that fails to project for one frame) instead of blinking the glow
      // off. The render loop hides it outright when there is no active guide.
      if (!wrap || !guideInfo || !anchor) return;
      const { start, end } = idealFlickWorld(anchor, guideInfo);
      const s = projectToPx(start);
      const e = projectToPx(end);
      if (!s || !e) return;
      const dx = e.x - s.x;
      const dy = e.y - s.y;
      const len = Math.hypot(dx, dy) || 1;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      idealDir = { x: dx / len, y: dy / len };
      wrap.style.opacity = "1";
      wrap.style.color = guideInfo.color;
      if (idealRingRef.current) setDot(idealRingRef.current, s);
      if (idealTrailRef.current) setLine(idealTrailRef.current, s, len, angle);
      if (idealCometRef.current) setDot(idealCometRef.current, { x: s.x + dx * cometT, y: s.y + dy * cometT });
      if (idealArrowRef.current) {
        setDot(idealArrowRef.current, e);
        idealArrowRef.current.style.transform = `translate(-50%,-50%) rotate(${angle}deg)`;
      }
      if (idealBadgeRef.current) {
        setDot(idealBadgeRef.current, { x: s.x, y: s.y - 22 });
        idealBadgeRef.current.textContent = guideInfo.token;
      }
    };
    const showUserAttempt = (from: Px, to: Px) => {
      const wrap = userWrapRef.current;
      if (!wrap) return;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.hypot(dx, dy);
      wrap.style.opacity = len > 6 ? "1" : "0";
      if (userTrailRef.current) setLine(userTrailRef.current, from, len, (Math.atan2(dy, dx) * 180) / Math.PI);
      if (userHeadRef.current) setDot(userHeadRef.current, to);
    };
    const hideUserAttempt = () => {
      if (userWrapRef.current) userWrapRef.current.style.opacity = "0";
    };
    const canvasPx = (clientX: number, clientY: number): Px => {
      const rect = renderer.domElement.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const gradeAttempt = (start: PointerStart, endX: number, endY: number) => {
      if (!guideInfo || !idealDir) return;
      const dx = endX - start.clientX;
      const dy = endY - start.clientY;
      const len = Math.hypot(dx, dy);
      const resolved = len >= 34 ? previewGesture?.label : undefined;
      let text: string;
      let quality: "great" | "ok" | "off";
      if (len < 34) {
        text = "Too short — flick a little further along the arrow to commit.";
        quality = "off";
      } else {
        const dot = (dx / len) * idealDir.x + (dy / len) * idealDir.y;
        const angleErr = Math.round((Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI);
        if (resolved === guideInfo.token) {
          quality = angleErr <= 16 ? "great" : "ok";
          text = angleErr <= 16 ? `Clean ${guideInfo.token} flick — ${angleErr}° off the ideal line.` : `Landed ${guideInfo.token}, ${angleErr}° off — aim straighter down the arrow.`;
        } else if (resolved) {
          text = `That flick made ${resolved}; the guide wanted ${guideInfo.token}. Start on the glowing sticker.`;
          quality = "off";
        } else {
          text = "Keep the flick straight along the glowing arrow.";
          quality = "off";
        }
      }
      callbacks.current.onSwipeGrade?.({ text, quality });
    };

    const onPointerDown = (event: PointerEvent) => {
      if (active) return;
      let hit = pickSticker(event);
      controls.autoRotate = false;
      // The glow (halo + arrow bloom) is larger than the sticker's pick area, so
      // a thumb aimed at the bright target can land just off the geometry. If a
      // guide is active and the touch is near the glowing anchor, grab the anchor
      // instead of letting the miss fall through to camera rotation.
      if (!hit && guideInfo && anchor) {
        const ap = projectToPx(anchor.getWorldPosition(new THREE.Vector3()));
        const cp = canvasPx(event.clientX, event.clientY);
        if (ap && Math.hypot(cp.x - ap.x, cp.y - ap.y) < 52) hit = anchor;
      }
      if (!hit) {
        pointerStart = null;
        controls.enabled = true;
        return;
      }
      const cubie = hit.userData.cubie as Cubie | undefined;
      if (!cubie) return;
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.matrixWorld);
      const face = hit.userData.face as Face;
      const base =
        face === "R" ? new THREE.Vector3(1, 0, 0) :
        face === "L" ? new THREE.Vector3(-1, 0, 0) :
        face === "U" ? new THREE.Vector3(0, 1, 0) :
        face === "D" ? new THREE.Vector3(0, -1, 0) :
        face === "F" ? new THREE.Vector3(0, 0, 1) :
        new THREE.Vector3(0, 0, -1);
      pointerStart = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        cubie,
        normal: base.applyMatrix3(normalMatrix).normalize(),
        label: hit.userData.label as string,
      };
      controls.enabled = false;
      renderer.domElement.setPointerCapture(event.pointerId);
      event.preventDefault();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (active || !pointerStart || event.pointerId !== pointerStart.pointerId) return;
      const dx = event.clientX - pointerStart.clientX;
      const dy = event.clientY - pointerStart.clientY;
      showUserAttempt(canvasPx(pointerStart.clientX, pointerStart.clientY), canvasPx(event.clientX, event.clientY));
      if (Math.hypot(dx, dy) < 16) return;
      event.preventDefault();
      const gesture = resolveGesture(pointerStart, dx, dy);
      if (Math.abs(gesture.layer) < 0.5) {
        clearHighlight();
        setStatus("Slice move — this trainer drills the six face turns");
        return;
      }
      highlightLayer(gesture);
      setStatus(`${gesture.label} layer`);
    };

    const onPointerUp = (event: PointerEvent) => {
      hideUserAttempt();
      if (!pointerStart || event.pointerId !== pointerStart.pointerId) {
        controls.enabled = true;
        return;
      }
      const start = pointerStart;
      pointerStart = null;
      const dx = event.clientX - start.clientX;
      const dy = event.clientY - start.clientY;
      const moved = Math.hypot(dx, dy);

      if (moved >= 34) {
        const gesture = previewGesture ?? resolveGesture(start, dx, dy);
        if (Math.abs(gesture.layer) < 0.5) {
          clearHighlight();
          setStatus("Slice moves aren't scored — flick an outer face (U D L R F B)");
          controls.enabled = true;
          return;
        }
        previewGesture = gesture;
        gradeAttempt(start, event.clientX, event.clientY);
        queue.push({ gesture, emit: gesture.label, fast: false });
        runNext();
        return;
      }

      clearHighlight();
      const hit = pickSticker(event);
      if (hit?.userData.face) {
        if (selectedSticker && selectedSticker !== hit) glowSticker(selectedSticker, 0);
        selectedSticker = hit;
        glowSticker(selectedSticker, 0.42);
        setStatus(`${hit.userData.face} — the ${faceName(hit.userData.face as Face)} face`);
      } else {
        setStatus("Swipe a sticker to turn • tap to identify");
      }
      controls.enabled = true;
    };

    const onPointerCancel = () => {
      pointerStart = null;
      hideUserAttempt();
      clearHighlight();
      controls.enabled = true;
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown, true);
    renderer.domElement.addEventListener("pointermove", onPointerMove, true);
    renderer.domElement.addEventListener("pointerup", onPointerUp, true);
    renderer.domElement.addEventListener("pointercancel", onPointerCancel, true);

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

    const clock = new THREE.Clock();
    let frame = 0;
    const render = () => {
      frame = requestAnimationFrame(render);
      controls.update();
      const t = clock.getElapsedTime();
      if (guideInfo && !active) {
        if (!anchor || facingCamera(anchor) < 0.12) setAnchor(pickAnchor(guideInfo));
        if (anchor && halo.visible) {
          const pulse = 1 + Math.sin(t * 4) * 0.16;
          halo.scale.setScalar(0.6 * pulse);
          haloMaterial.opacity = 0.72 + (pulse - 1) * 0.9;
          (anchor.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.65 + (pulse - 1) * 1.3;
        }
        showIdeal((t * 0.85) % 1);
      } else {
        hideIdeal();
      }
      renderer.render(scene, camera);
    };
    render();

    apiRef.current = {
      playMoves: (tokens, opts) => {
        tokens.forEach((token) => gesturesForToken(token).forEach((gesture) => queue.push({ gesture, emit: null, fast: opts?.fast ?? false })));
        runNext();
      },
      reset: () => {
        queue.length = 0;
        cubies.forEach((cubie) => {
          cubie.mesh.position.copy(cubie.home);
          cubie.mesh.quaternion.identity();
          cubie.grid.copy(cubie.home);
        });
        guideInfo = null;
        setAnchor(null);
        hideIdeal();
        setStatus("Reset to solved");
      },
      resetView: () => {
        controls.reset();
        setStatus("View reset");
      },
      setGuide: (token) => {
        setAnchor(null);
        guideInfo = null;
        hideIdeal();
        if (!token) return;
        const face = token[0] as Face;
        const fm = FACE_MOVE[face];
        const prime = token.endsWith("'");
        const dir = (prime ? -fm.clockwise : fm.clockwise) as Direction;
        guideInfo = { token, face, axis: fm.axis, layer: fm.layerSign * EDGE, dir, color: FACE_COLORS[face] };
        setAnchor(pickAnchor(guideInfo));
      },
      isBusy: () => active || queue.length > 0,
    };

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(turnFrame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown, true);
      renderer.domElement.removeEventListener("pointermove", onPointerMove, true);
      renderer.domElement.removeEventListener("pointerup", onPointerUp, true);
      renderer.domElement.removeEventListener("pointercancel", onPointerCancel, true);
      setAnchor(null);
      controls.dispose();
      bodyGeometry.dispose();
      stickerGeometry.dispose();
      textures.forEach((texture) => texture.dispose());
      materials.forEach((material) => material.dispose());
      renderer.dispose();
      renderer.domElement.remove();
      apiRef.current = null;
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={mountRef} className="h-full w-full touch-none" />

      {/* Ideal play-engine flick — the glowing guide. */}
      <div ref={idealWrapRef} className="pointer-events-none absolute inset-0 z-20 opacity-0 transition-opacity duration-200">
        <div ref={idealRingRef} className="absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-current shadow-[0_0_16px_currentColor]" />
        <div
          ref={idealTrailRef}
          className="absolute h-[6px] origin-left rounded-full"
          style={{ transformOrigin: "0 50%", background: "linear-gradient(90deg, transparent, currentColor)" }}
        />
        <div ref={idealCometRef} className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current shadow-[0_0_16px_currentColor]" />
        <div
          ref={idealArrowRef}
          className="absolute h-0 w-0"
          style={{ borderTop: "9px solid transparent", borderBottom: "9px solid transparent", borderLeft: "15px solid currentColor", filter: "drop-shadow(0 0 6px currentColor)" }}
        />
        <div ref={idealBadgeRef} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-md bg-black/85 px-1.5 py-0.5 text-xs font-black text-white" />
      </div>

      {/* Your live flick, for tuning. */}
      <div ref={userWrapRef} className="pointer-events-none absolute inset-0 z-[19] opacity-0">
        <div ref={userTrailRef} className="absolute h-[3px] origin-left rounded-full bg-white/80" style={{ transformOrigin: "0 50%" }} />
        <div ref={userHeadRef} className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white/40" />
      </div>

      <button
        type="button"
        aria-label="Reset the cube camera view"
        onClick={() => apiRef.current?.resetView()}
        className="absolute right-3 top-3 z-[4] rounded-[11px] border border-[var(--border)] bg-black/35 px-3 py-1.5 text-xs font-extrabold text-[var(--muted)]"
      >
        Recenter
      </button>
      <div className="pointer-events-none absolute bottom-3 left-1/2 z-[4] -translate-x-1/2 whitespace-nowrap text-[13px] font-semibold text-[var(--muted)]">
        {selected}
      </div>
    </div>
  );
});

function faceName(face: Face): string {
  return { U: "Up", R: "Right", F: "Front", D: "Down", L: "Left", B: "Back" }[face];
}

export default NotationCube3D;
