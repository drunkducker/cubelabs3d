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

export type NotationCube3DHandle = {
  /** Animate a token sequence programmatically (scramble / solution playback). Does not emit onCommit. */
  playMoves: (tokens: string[], opts?: { fast?: boolean }) => void;
  /** Snap geometry back to solved. */
  reset: () => void;
  /** Reset the camera framing. */
  resetView: () => void;
  /** Glow the centre sticker of a face to point at the next guided move. */
  setGuide: (face: Face | null, dir?: "cw" | "ccw" | "half" | null) => void;
  /** Whether a turn / playback is currently animating. */
  isBusy: () => boolean;
};

type Props = {
  /** Called after a user swipe commits an outer face turn (a single quarter: e.g. "R" or "R'"). */
  onCommit?: (token: string) => void;
  onStatus?: (status: string) => void;
  onBusyChange?: (busy: boolean) => void;
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
 * identify. The parent lab owns logical state; this component only reports the
 * committed face token (onCommit) and animates programmatic sequences on request.
 * Middle-slice swipes are intentionally not committed — this trainer teaches the
 * six face turns, so a slice gesture surfaces a hint instead of desyncing state.
 */
const NotationCube3D = forwardRef<NotationCube3DHandle, Props>(function NotationCube3D(
  { onCommit, onStatus, onBusyChange },
  ref,
) {
  const mountRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);
  const beamRef = useRef<HTMLDivElement>(null);
  const beamLabelRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<NotationCube3DHandle | null>(null);
  const callbacks = useRef({ onCommit, onStatus, onBusyChange });
  callbacks.current = { onCommit, onStatus, onBusyChange };

  const [selected, setSelected] = useState("Swipe a sticker to turn • tap to identify");

  useImperativeHandle(ref, () => ({
    playMoves: (tokens, opts) => apiRef.current?.playMoves(tokens, opts),
    reset: () => apiRef.current?.reset(),
    resetView: () => apiRef.current?.resetView(),
    setGuide: (face, dir) => apiRef.current?.setGuide(face, dir),
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
    const centerByFace = new Map<Face, THREE.Mesh>();

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

    // A face-centre cubie has exactly one non-zero grid coordinate; its lone
    // sticker is the durable glow target for that face's guided move.
    for (const sticker of pickables) {
      const home = (sticker.userData.cubie as Cubie).home;
      const nonZero = [home.x, home.y, home.z].filter((v) => Math.abs(v) > 0.01).length;
      if (nonZero === 1) centerByFace.set(sticker.userData.face as Face, sticker);
    }

    // Guided-move glow.
    const haloMap = haloTexture();
    textures.push(haloMap);
    const haloMaterial = new THREE.SpriteMaterial({ map: haloMap, color: "#ffffff", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    materials.push(haloMaterial);
    const halo = new THREE.Sprite(haloMaterial);
    halo.visible = false;
    halo.renderOrder = 20;
    let guideMesh: THREE.Mesh | null = null;

    const clearGuideGlow = () => {
      if (guideMesh) {
        const mat = guideMesh.material as THREE.MeshStandardMaterial;
        mat.emissive.set(guideMesh.userData.baseColor as string);
        mat.emissiveIntensity = 0.04;
      }
      halo.removeFromParent();
      halo.visible = false;
      haloMaterial.opacity = 0;
      guideMesh = null;
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
      if (!mesh || mesh === guideMesh) return;
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
      const item = queue.shift()!;
      turnLayer(item);
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

    // Touch matrix overlay.
    const showTouchGuide = (event: PointerEvent) => {
      const guide = guideRef.current;
      const beam = beamRef.current;
      const label = beamLabelRef.current;
      if (!guide || !beam || !label) return;
      const rect = renderer.domElement.getBoundingClientRect();
      guide.style.left = `${event.clientX - rect.left}px`;
      guide.style.top = `${event.clientY - rect.top}px`;
      guide.style.opacity = "1";
      guide.style.transform = "translate(-50%, -50%) scale(1)";
      beam.style.width = "0px";
      beam.style.transform = "rotate(0deg)";
      label.textContent = "TOUCH";
    };
    const updateTouchGuide = (dx: number, dy: number, text: string) => {
      const beam = beamRef.current;
      const label = beamLabelRef.current;
      if (!beam || !label) return;
      const distance = Math.min(96, Math.hypot(dx, dy));
      beam.style.width = `${distance}px`;
      beam.style.transform = `rotate(${(Math.atan2(dy, dx) * 180) / Math.PI}deg)`;
      label.textContent = text;
    };
    const hideTouchGuide = () => {
      const guide = guideRef.current;
      if (!guide) return;
      guide.style.opacity = "0";
      guide.style.transform = "translate(-50%, -50%) scale(.82)";
    };

    const onPointerDown = (event: PointerEvent) => {
      if (active) return;
      const hit = pickSticker(event);
      controls.autoRotate = false;
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
      showTouchGuide(event);
      renderer.domElement.setPointerCapture(event.pointerId);
      event.preventDefault();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (active || !pointerStart || event.pointerId !== pointerStart.pointerId) return;
      const dx = event.clientX - pointerStart.clientX;
      const dy = event.clientY - pointerStart.clientY;
      if (Math.hypot(dx, dy) < 16) {
        updateTouchGuide(dx, dy, "TOUCH");
        return;
      }
      event.preventDefault();
      const gesture = resolveGesture(pointerStart, dx, dy);
      const isSlice = Math.abs(gesture.layer) < 0.5;
      if (isSlice) {
        clearHighlight();
        updateTouchGuide(dx, dy, "SLICE");
        setStatus("Slice move — this trainer drills the six face turns");
        return;
      }
      highlightLayer(gesture);
      updateTouchGuide(dx, dy, gesture.label);
      setStatus(`${gesture.label} layer`);
    };

    const onPointerUp = (event: PointerEvent) => {
      hideTouchGuide();
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
          setStatus("Slice moves aren't scored — swipe an outer face (U D L R F B)");
          controls.enabled = true;
          return;
        }
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
      hideTouchGuide();
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
      if (guideMesh && halo.visible) {
        const pulse = 1 + Math.sin(clock.getElapsedTime() * 4) * 0.16;
        halo.scale.setScalar(0.62 * pulse);
        haloMaterial.opacity = 0.7 + (pulse - 1) * 0.9;
        const mat = guideMesh.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.6 + (pulse - 1) * 1.4;
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
        clearGuideGlow();
        setStatus("Reset to solved");
      },
      resetView: () => {
        controls.reset();
        setStatus("View reset");
      },
      setGuide: (face, dir) => {
        clearGuideGlow();
        if (!face) return;
        const mesh = centerByFace.get(face);
        if (!mesh) return;
        guideMesh = mesh;
        const color = mesh.userData.baseColor as string;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.emissive.set(color);
        mat.emissiveIntensity = 0.8;
        haloMaterial.color.set(color);
        mesh.add(halo);
        halo.position.set(0, 0, 0.16);
        halo.scale.setScalar(0.62);
        halo.visible = true;
        haloMaterial.opacity = 0.8;
        void dir;
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
      clearGuideGlow();
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
      <div
        ref={guideRef}
        className="pointer-events-none absolute z-20 h-20 w-20 opacity-0 transition-[opacity,transform] duration-150"
        style={{ transform: "translate(-50%, -50%) scale(.82)" }}
      >
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-1.5 rounded-2xl border border-white/25 bg-black/25 p-1.5 backdrop-blur-[2px]">
          {Array.from({ length: 9 }, (_, index) => (
            <span key={index} className={`rounded-full border ${index === 4 ? "border-white bg-white/80" : "border-white/35 bg-white/10"}`} />
          ))}
        </div>
        <div ref={beamRef} className="absolute left-1/2 top-1/2 h-1 origin-left rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,.9)]" />
        <div
          ref={beamLabelRef}
          className="absolute left-1/2 top-[calc(100%+6px)] -translate-x-1/2 whitespace-nowrap rounded-full border border-white/20 bg-black/80 px-2 py-1 text-[10px] font-black tracking-[.12em] text-white"
        >
          TOUCH
        </div>
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
