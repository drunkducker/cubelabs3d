"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  VERTICES,
  FACE_CORNERS,
  FACE_COLORS,
  faceNormal,
  solved,
  applyMoveIndex,
  isSolved,
  randomScramble,
  solve,
  faceOfMove,
  dirOfMove,
  moveLabel,
  type KiloState,
} from "@/lib/kilominx-engine";

const TURN = (2 * Math.PI) / 5;
const LETTERS = ["A", "B", "C", "D", "E"] as const;
const GRAB_FACE_EVENT = "kilominx-notation-grab-face";
const DRAG_PIXELS_FOR_TURN = 92;
const COMMIT_ANGLE = TURN * 0.22;
const FLICK_VELOCITY = 0.38;

type QueuedMove = { moveIndex: number; fast?: boolean };
type Kite = { corner: number; kite: number; quad: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3] };
type GrabFaceEvent = CustomEvent<{
  face: number | null;
  move: number | null;
  kite?: number | null;
  stickerLabel?: string | null;
  color?: string | null;
  stickerColor?: string | null;
}>;

type DragSession = {
  id: number;
  x: number;
  y: number;
  face: number;
  label: string;
  hitPoint: THREE.Vector3;
  screenDirection: THREE.Vector2;
  pivot: THREE.Group;
  pieces: THREE.Group[];
  angle: number;
  lastSigned: number;
  lastTime: number;
  velocity: number;
};

const toVec3 = (value: readonly [number, number, number]) => new THREE.Vector3(value[0], value[1], value[2]);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function orderedFaceCorners(face: number): number[] {
  const normal = faceNormal(face);
  const corners = FACE_CORNERS[face]!;
  const center = corners.reduce((sum, corner) => sum.add(toVec3(VERTICES[corner]!)), new THREE.Vector3()).multiplyScalar(1 / 5);
  const tangent = toVec3(VERTICES[corners[0]!]!).sub(center).normalize();
  const bitangent = new THREE.Vector3().crossVectors(toVec3(normal), tangent);
  const angle = (corner: number) => {
    const point = toVec3(VERTICES[corner]!).sub(center);
    return Math.atan2(point.dot(bitangent), point.dot(tangent));
  };
  return corners.slice().sort((a, b) => angle(a) - angle(b));
}

function faceKites(face: number): Kite[] {
  const ordered = orderedFaceCorners(face);
  const points = ordered.map(corner => toVec3(VERTICES[corner]!));
  const center = points.reduce((sum, point) => sum.add(point.clone()), new THREE.Vector3()).multiplyScalar(1 / 5);
  const midpoint = (a: number, b: number) => points[a]!.clone().add(points[b]!).multiplyScalar(0.5);
  return ordered.map((corner, kite) => ({
    corner,
    kite,
    quad: [points[kite]!.clone(), midpoint(kite, (kite + 1) % 5), center.clone(), midpoint(kite, (kite + 4) % 5)],
  }));
}

function quadGeometry(quad: Kite["quad"], shrink: number) {
  const center = quad.reduce((sum, point) => sum.add(point.clone()), new THREE.Vector3()).multiplyScalar(0.25);
  const points = quad.map(point => new THREE.Vector3().lerpVectors(center, point, shrink));
  const positions = new Float32Array([
    points[0]!.x, points[0]!.y, points[0]!.z, points[1]!.x, points[1]!.y, points[1]!.z, points[2]!.x, points[2]!.y, points[2]!.z,
    points[0]!.x, points[0]!.y, points[0]!.z, points[2]!.x, points[2]!.y, points[2]!.z, points[3]!.x, points[3]!.y, points[3]!.z,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]), 2));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function readableText(color: string) {
  return color === "#f5f5f5" || color === "#ffd500" || color === "#59a7ff" || color === "#8fe36b" || color === "#9aa3ad" ? "#0b0d12" : "#ffffff";
}

function labelTexture(label: string, color: string, glowing = false) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);
  context.fillStyle = color;
  context.fillRect(0, 0, 256, 256);
  context.strokeStyle = glowing ? "rgba(0,0,0,.96)" : "rgba(255,255,255,.48)";
  context.lineWidth = glowing ? 16 : 10;
  context.strokeRect(8, 8, 240, 240);
  context.font = "900 78px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  if (glowing) {
    context.lineJoin = "round";
    context.strokeStyle = "rgba(255,255,255,.96)";
    context.lineWidth = 18;
    context.strokeText(label, 128, 132);
    context.fillStyle = "#050505";
  } else {
    context.fillStyle = readableText(color);
  }
  context.fillText(label, 128, 132);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function glowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);
  const gradient = context.createRadialGradient(256, 256, 0, 256, 256, 256);
  gradient.addColorStop(0, "rgba(255,255,255,.78)");
  gradient.addColorStop(0.18, "rgba(255,255,255,.64)");
  gradient.addColorStop(0.5, "rgba(255,255,255,.22)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default function KilominxNotationModel() {
  const mountRef = useRef<HTMLDivElement>(null);
  const touchGuideRef = useRef<HTMLDivElement>(null);
  const touchBeamRef = useRef<HTMLDivElement>(null);
  const touchDirectionRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<{ scramble: () => void; solve: () => void; reset: () => void; resetView: () => void } | null>(null);
  const [status, setStatus] = useState("Touch a sticker and drag the layer directly");
  const [scrambleText, setScrambleText] = useState("");
  const [solutionText, setSolutionText] = useState("");
  const [busy, setBusy] = useState(false);
  const [solvedNow, setSolvedNow] = useState(true);
  const [grabLabel, setGrabLabel] = useState<string | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#05070d");
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(4.6, 3.6, 6.6);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.16;
    renderer.setClearAlpha(0);
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none";
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 3.6;
    controls.maxDistance = 13;
    controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.autoRotateSpeed = 0.28;
    controls.update();
    controls.saveState();

    scene.add(new THREE.HemisphereLight("#ffffff", "#16203d", 1.7));
    const key = new THREE.DirectionalLight("#ffffff", 2.15);
    key.position.set(8, 12, 10);
    scene.add(key);
    const rim = new THREE.DirectionalLight("#5c7cff", 1.45);
    rim.position.set(-10, 3, -8);
    scene.add(rim);

    const root = new THREE.Group();
    scene.add(root);
    const cornerGroups = Array.from({ length: 20 }, () => {
      const group = new THREE.Group();
      root.add(group);
      return group;
    });
    const materials: THREE.Material[] = [];
    const geometries: THREE.BufferGeometry[] = [];
    const textures: THREE.Texture[] = [];
    const pickables: THREE.Mesh[] = [];
    const stickerMeshes: THREE.Mesh[] = [];
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: "#090b10", roughness: 0.48, metalness: 0.08 });
    materials.push(bodyMaterial);

    for (let face = 0; face < 12; face++) {
      const color = FACE_COLORS[face]!;
      for (const kite of faceKites(face)) {
        const stickerGeometry = quadGeometry(kite.quad, 0.9);
        const backingGeometry = quadGeometry(kite.quad, 0.99);
        geometries.push(stickerGeometry, backingGeometry);
        const label = `${face + 1}${LETTERS[kite.kite]}`;
        const texture = labelTexture(label, color);
        const contrastTexture = labelTexture(label, color, true);
        textures.push(texture, contrastTexture);
        const stickerMaterial = new THREE.MeshStandardMaterial({
          map: texture,
          color: "#ffffff",
          roughness: 0.26,
          metalness: 0.02,
          emissive: color,
          emissiveIntensity: 0.035,
          polygonOffset: true,
          polygonOffsetFactor: -4,
          polygonOffsetUnits: -4,
        });
        materials.push(stickerMaterial);
        const sticker = new THREE.Mesh(stickerGeometry, stickerMaterial);
        sticker.userData.label = label;
        sticker.userData.baseColor = color;
        sticker.userData.baseTexture = texture;
        sticker.userData.contrastTexture = contrastTexture;
        const backing = new THREE.Mesh(backingGeometry, bodyMaterial);
        cornerGroups[kite.corner]!.add(backing, sticker);
        pickables.push(sticker);
        stickerMeshes.push(sticker);
      }
    }

    const haloMap = glowTexture();
    textures.push(haloMap);
    const haloMaterial = new THREE.SpriteMaterial({ map: haloMap, color: "#ffffff", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true });
    const coreMaterial = new THREE.SpriteMaterial({ map: haloMap, color: "#ffffff", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true });
    materials.push(haloMaterial, coreMaterial);
    const grabHalo = new THREE.Sprite(haloMaterial);
    const grabCore = new THREE.Sprite(coreMaterial);
    const grabLight = new THREE.PointLight("#ffffff", 0, 2.2, 1.8);
    grabHalo.visible = false;
    grabCore.visible = false;
    let glowParent: THREE.Mesh | null = null;

    let logicalState: KiloState = solved();
    let disposed = false;
    let moveFrame = 0;
    let active = false;
    let dragSession: DragSession | null = null;
    let activeStickerLabel: string | null = null;
    let activeStickerColor: string | null = null;
    const queue: QueuedMove[] = [];

    const groupsForFace = (face: number) => FACE_CORNERS[face]!.map(slot => cornerGroups[logicalState.cp[slot]!]!);

    const detachGlow = () => {
      grabHalo.removeFromParent();
      grabCore.removeFromParent();
      grabLight.removeFromParent();
      glowParent = null;
    };

    const clearStickerHighlight = () => {
      for (const sticker of stickerMeshes) {
        const material = sticker.material as THREE.MeshStandardMaterial;
        material.map = sticker.userData.baseTexture as THREE.Texture;
        material.emissive.set(sticker.userData.baseColor as string);
        material.emissiveIntensity = 0.035;
        material.needsUpdate = true;
      }
      grabHalo.visible = false;
      grabCore.visible = false;
      haloMaterial.opacity = 0;
      coreMaterial.opacity = 0;
      grabLight.intensity = 0;
      detachGlow();
    };

    const highlightSticker = (label: string | null, requestedColor: string | null) => {
      activeStickerLabel = label;
      activeStickerColor = requestedColor;
      clearStickerHighlight();
      if (!label) return;
      const sticker = stickerMeshes.find(candidate => candidate.userData.label === label);
      if (!sticker) return;
      const color = requestedColor || (sticker.userData.baseColor as string);
      const material = sticker.material as THREE.MeshStandardMaterial;
      material.map = sticker.userData.contrastTexture as THREE.Texture;
      material.emissive.set(color);
      material.emissiveIntensity = 2.2;
      material.needsUpdate = true;
      haloMaterial.color.set(color);
      coreMaterial.color.set(color);
      grabLight.color.set(color);
      const geometry = sticker.geometry as THREE.BufferGeometry;
      const center = geometry.boundingSphere?.center.clone() ?? new THREE.Vector3();
      const normals = geometry.getAttribute("normal");
      const normal = normals ? new THREE.Vector3(normals.getX(0), normals.getY(0), normals.getZ(0)).normalize() : new THREE.Vector3(0, 0, 1);
      sticker.add(grabHalo, grabCore, grabLight);
      glowParent = sticker;
      grabHalo.position.copy(center).addScaledVector(normal, 0.075);
      grabCore.position.copy(center).addScaledVector(normal, 0.09);
      grabLight.position.copy(center).addScaledVector(normal, 0.22);
      grabHalo.scale.setScalar(0.8);
      grabCore.scale.setScalar(0.34);
      grabHalo.visible = true;
      grabCore.visible = true;
      haloMaterial.opacity = 0.7;
      coreMaterial.opacity = 0.72;
      grabLight.intensity = 18;
    };

    const onGrabFace = (event: Event) => {
      const detail = (event as GrabFaceEvent).detail;
      const label = typeof detail?.stickerLabel === "string" ? detail.stickerLabel : null;
      const color = typeof detail?.color === "string" ? detail.color : typeof detail?.stickerColor === "string" ? detail.stickerColor : null;
      controls.autoRotate = false;
      highlightSticker(label, color);
      setGrabLabel(label);
      if (label) setStatus(`Target ${label} • touch and drag its layer`);
    };
    window.addEventListener(GRAB_FACE_EVENT, onGrabFace);

    const finishQueuedMove = (moveIndex: number) => {
      logicalState = applyMoveIndex(logicalState, moveIndex);
      const nowSolved = isSolved(logicalState);
      setSolvedNow(nowSolved);
      active = false;
      setBusy(queue.length > 0);
      setStatus(nowSolved ? "Solved" : queue.length ? "Playing moves…" : "Kilominx ready");
      highlightSticker(activeStickerLabel, activeStickerColor);
      runNext();
    };

    const animatePivot = (pivot: THREE.Group, pieces: THREE.Group[], axis: THREE.Vector3, from: number, to: number, duration: number, onDone: () => void) => {
      const started = performance.now();
      const animate = (now: number) => {
        if (disposed) return;
        const progress = Math.min(1, (now - started) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        pivot.quaternion.setFromAxisAngle(axis, from + (to - from) * eased);
        if (progress < 1) {
          moveFrame = requestAnimationFrame(animate);
          return;
        }
        pivot.updateMatrixWorld(true);
        pieces.forEach(piece => root.attach(piece));
        root.remove(pivot);
        onDone();
      };
      moveFrame = requestAnimationFrame(animate);
    };

    const runNext = () => {
      if (active || dragSession || !queue.length) return;
      active = true;
      setBusy(true);
      controls.autoRotate = false;
      clearStickerHighlight();
      const queued = queue.shift()!;
      const face = faceOfMove(queued.moveIndex);
      const pieces = groupsForFace(face);
      const pivot = new THREE.Group();
      root.add(pivot);
      pieces.forEach(piece => pivot.attach(piece));
      const angle = dirOfMove(queued.moveIndex) === 1 ? TURN : -TURN;
      animatePivot(pivot, pieces, toVec3(faceNormal(face)).normalize(), 0, angle, queued.fast ? 115 : 260, () => finishQueuedMove(queued.moveIndex));
    };

    const queueSequence = (moves: number[], fast = false) => {
      moves.forEach(moveIndex => queue.push({ moveIndex, fast }));
      runNext();
    };

    const hardReset = () => {
      queue.length = 0;
      cornerGroups.forEach(group => {
        group.position.set(0, 0, 0);
        group.quaternion.identity();
        group.scale.set(1, 1, 1);
      });
      logicalState = solved();
      setSolvedNow(true);
      highlightSticker(activeStickerLabel, activeStickerColor);
    };

    actionsRef.current = {
      scramble: () => {
        if (active || dragSession) return;
        const sequence = randomScramble(30);
        setScrambleText(sequence.map(move => moveLabel(move)).join(" "));
        setSolutionText("");
        setStatus("Scrambling…");
        queueSequence(sequence, true);
      },
      solve: () => {
        if (active || dragSession) return;
        const sequence = solve(logicalState);
        if (!sequence.length) {
          setStatus("Already solved");
          return;
        }
        setSolutionText(sequence.map(move => moveLabel(move)).join(" "));
        setStatus(`Playing ${sequence.length} solution moves…`);
        queueSequence(sequence);
      },
      reset: () => {
        if (active || dragSession) return;
        hardReset();
        setScrambleText("");
        setSolutionText("");
        setStatus("Reset to solved");
      },
      resetView: () => {
        controls.reset();
        setStatus("View reset");
      },
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const setPointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
    };

    const spatialFaceForSticker = (sticker: THREE.Mesh) => {
      sticker.updateMatrixWorld(true);
      const normals = sticker.geometry.getAttribute("normal");
      const worldNormal = normals
        ? new THREE.Vector3(normals.getX(0), normals.getY(0), normals.getZ(0)).transformDirection(sticker.matrixWorld).normalize()
        : new THREE.Vector3(0, 0, 1);
      let bestFace = 0;
      let bestDot = -Infinity;
      for (let face = 0; face < 12; face++) {
        const dot = worldNormal.dot(toVec3(faceNormal(face)).normalize());
        if (dot > bestDot) {
          bestDot = dot;
          bestFace = face;
        }
      }
      return bestFace;
    };

    const projectedDirection = (face: number, point: THREE.Vector3) => {
      const axis = toVec3(faceNormal(face)).normalize();
      const tangent = axis.clone().cross(point.clone().normalize()).normalize();
      const origin = point.clone().project(camera);
      const target = point.clone().add(tangent).project(camera);
      return new THREE.Vector2(target.x - origin.x, -(target.y - origin.y)).normalize();
    };

    const showTouchGuide = (event: PointerEvent) => {
      const guide = touchGuideRef.current;
      const beam = touchBeamRef.current;
      const direction = touchDirectionRef.current;
      if (!guide || !beam || !direction) return;
      const rect = renderer.domElement.getBoundingClientRect();
      guide.style.left = `${event.clientX - rect.left}px`;
      guide.style.top = `${event.clientY - rect.top}px`;
      guide.style.opacity = "1";
      guide.style.transform = "translate(-50%, -50%) scale(1)";
      beam.style.width = "0px";
      beam.style.transform = "rotate(0deg)";
      direction.textContent = "HOLD";
    };

    const updateTouchGuide = (dx: number, dy: number, move: number | null, progress: number) => {
      const beam = touchBeamRef.current;
      const direction = touchDirectionRef.current;
      if (!beam || !direction) return;
      const distance = Math.min(84, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      beam.style.width = `${distance}px`;
      beam.style.transform = `rotate(${angle}deg)`;
      beam.style.opacity = `${0.42 + progress * 0.58}`;
      direction.textContent = move === null ? "HOLD" : `${moveLabel(move)} ${Math.round(progress * 100)}%`;
    };

    const hideTouchGuide = () => {
      const guide = touchGuideRef.current;
      if (!guide) return;
      guide.style.opacity = "0";
      guide.style.transform = "translate(-50%, -50%) scale(.88)";
    };

    const onDown = (event: PointerEvent) => {
      if (active || dragSession || event.button > 0) return;
      setPointer(event);
      const hit = raycaster.intersectObjects(pickables, true)[0];
      if (!hit) return;
      const sticker = hit.object as THREE.Mesh;
      const face = spatialFaceForSticker(sticker);
      const pieces = groupsForFace(face);
      const pivot = new THREE.Group();
      root.add(pivot);
      pieces.forEach(piece => pivot.attach(piece));
      dragSession = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        face,
        label: sticker.userData.label as string,
        hitPoint: hit.point.clone(),
        screenDirection: projectedDirection(face, hit.point.clone()),
        pivot,
        pieces,
        angle: 0,
        lastSigned: 0,
        lastTime: performance.now(),
        velocity: 0,
      };
      event.preventDefault();
      controls.enabled = false;
      controls.autoRotate = false;
      showTouchGuide(event);
      renderer.domElement.setPointerCapture(event.pointerId);
      setStatus(`${dragSession.label} • drag the layer`);
    };

    const onMove = (event: PointerEvent) => {
      const session = dragSession;
      if (!session || session.id !== event.pointerId) return;
      event.preventDefault();
      const dx = event.clientX - session.x;
      const dy = event.clientY - session.y;
      const signed = new THREE.Vector2(dx, dy).dot(session.screenDirection);
      const now = performance.now();
      const dt = Math.max(1, now - session.lastTime);
      session.velocity = (signed - session.lastSigned) / dt;
      session.lastSigned = signed;
      session.lastTime = now;
      const normalized = clamp(signed / DRAG_PIXELS_FOR_TURN, -1, 1);
      const softened = Math.sign(normalized) * Math.pow(Math.abs(normalized), 0.86);
      session.angle = softened * TURN * 0.92;
      session.pivot.quaternion.setFromAxisAngle(toVec3(faceNormal(session.face)).normalize(), session.angle);
      const move = session.face * 2 + (session.angle >= 0 ? 0 : 1);
      updateTouchGuide(dx, dy, Math.abs(signed) < 6 ? null : move, Math.min(1, Math.abs(session.angle) / TURN));
      setStatus(Math.abs(signed) < 6 ? `${session.label} • keep dragging` : `Preview ${moveLabel(move)} • release to snap`);
    };

    const finishPointer = (event: PointerEvent, cancelled = false) => {
      const session = dragSession;
      if (!session || session.id !== event.pointerId) return;
      dragSession = null;
      hideTouchGuide();
      const direction = session.angle === 0 ? Math.sign(session.velocity || 1) : Math.sign(session.angle);
      const shouldCommit = !cancelled && (Math.abs(session.angle) >= COMMIT_ANGLE || Math.abs(session.velocity) >= FLICK_VELOCITY);
      const target = shouldCommit ? direction * TURN : 0;
      const move = session.face * 2 + (direction >= 0 ? 0 : 1);
      active = true;
      setBusy(true);
      const remaining = Math.abs(target - session.angle) / TURN;
      const duration = shouldCommit ? 120 + remaining * 100 : 120;
      animatePivot(session.pivot, session.pieces, toVec3(faceNormal(session.face)).normalize(), session.angle, target, duration, () => {
        if (shouldCommit) {
          finishQueuedMove(move);
        } else {
          active = false;
          setBusy(false);
          setStatus(`${session.label} • gesture cancelled`);
          highlightSticker(activeStickerLabel, activeStickerColor);
          runNext();
        }
      });
      controls.enabled = true;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
    };

    const onUp = (event: PointerEvent) => finishPointer(event, false);
    const onCancel = (event: PointerEvent) => finishPointer(event, true);
    renderer.domElement.addEventListener("pointerdown", onDown, true);
    renderer.domElement.addEventListener("pointermove", onMove, true);
    renderer.domElement.addEventListener("pointerup", onUp, true);
    renderer.domElement.addEventListener("pointercancel", onCancel, true);

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
      if (glowParent && grabHalo.visible) {
        const pulse = 1 + Math.sin(clock.getElapsedTime() * 3.6) * 0.08;
        grabHalo.scale.setScalar(0.8 * pulse);
        grabCore.scale.setScalar(0.34 * (1 + (pulse - 1) * 0.45));
        haloMaterial.opacity = 0.62 + (pulse - 1) * 0.8;
        coreMaterial.opacity = 0.7;
        grabLight.intensity = 17 + (pulse - 1) * 42;
      }
      renderer.render(scene, camera);
    };
    render();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(moveFrame);
      observer.disconnect();
      window.removeEventListener(GRAB_FACE_EVENT, onGrabFace);
      renderer.domElement.removeEventListener("pointerdown", onDown, true);
      renderer.domElement.removeEventListener("pointermove", onMove, true);
      renderer.domElement.removeEventListener("pointerup", onUp, true);
      renderer.domElement.removeEventListener("pointercancel", onCancel, true);
      detachGlow();
      controls.dispose();
      materials.forEach(material => material.dispose());
      geometries.forEach(geometry => geometry.dispose());
      textures.forEach(texture => texture.dispose());
      renderer.dispose();
      renderer.domElement.remove();
      actionsRef.current = null;
    };
  }, []);

  return (
    <section className="glass overflow-hidden rounded-[22px] border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,.48)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 text-sm text-[var(--muted)]">
        <span>{status}</span>
        <span className="font-bold text-[var(--text)]">{grabLabel ?? (solvedNow ? "Solved" : "In motion")}</span>
      </div>
      <div className="relative overflow-hidden">
        <div ref={mountRef} data-kilominx-direction-anchor className="h-[430px] w-full touch-none sm:h-[480px]" />
        <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-[10px] font-black tracking-[.18em] text-white/70 backdrop-blur">3D PUZZLE • DIRECT TOUCH</div>
        <div
          ref={touchGuideRef}
          className="pointer-events-none absolute z-20 h-14 w-14 opacity-0 transition-[opacity,transform] duration-100"
          style={{ transform: "translate(-50%, -50%) scale(.88)" }}
        >
          <div className="absolute inset-0 grid grid-cols-3 gap-1 rounded-2xl border border-white/45 bg-black/55 p-2 backdrop-blur-sm">
            {Array.from({ length: 9 }, (_, index) => <span key={index} className={`rounded-full ${index === 4 ? "bg-white" : "bg-white/25"}`} />)}
          </div>
          <div ref={touchBeamRef} className="absolute left-1/2 top-1/2 h-[3px] origin-left rounded-full bg-white opacity-60" />
          <div ref={touchDirectionRef} className="absolute left-1/2 top-[calc(100%+7px)] -translate-x-1/2 whitespace-nowrap rounded-full border border-white/25 bg-black/70 px-2 py-1 text-[9px] font-black tracking-[.12em] text-white">HOLD</div>
        </div>
      </div>
      <div className="pointer-events-none px-4 pb-3 text-center text-[13px] font-semibold text-[var(--muted)]">Hold a sticker • drag the layer • release to snap or cancel</div>
      <div className="grid grid-cols-4 gap-2 border-t border-[var(--border)] p-3">
        <button disabled={busy} onClick={() => actionsRef.current?.scramble()} className="cta-purple min-h-11 rounded-xl text-sm font-extrabold disabled:opacity-40">Scramble</button>
        <button disabled={busy || solvedNow} onClick={() => actionsRef.current?.solve()} className="cta-green min-h-11 rounded-xl text-sm font-extrabold disabled:opacity-40">Solve</button>
        <button disabled={busy || solvedNow} onClick={() => actionsRef.current?.reset()} className="glass min-h-11 rounded-xl text-sm font-extrabold disabled:opacity-40">Reset</button>
        <button onClick={() => actionsRef.current?.resetView()} className="glass min-h-11 rounded-xl text-sm font-extrabold">View</button>
      </div>
      <section className="border-t border-[var(--border)] px-4 py-3">
        <p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">SCRAMBLE</p>
        <p data-puzzle-scramble={scrambleText} className="mt-2 min-h-6 break-words text-sm leading-6 text-[var(--text)]">{scrambleText || "Tap Scramble to load the same sequence into the flat reference."}</p>
      </section>
      {solutionText ? <section className="border-t border-[var(--border)] px-4 py-3"><p className="text-xs font-extrabold tracking-[.16em] text-[var(--purple)]">SOLUTION</p><p className="mt-2 break-words font-mono text-xs leading-6 text-[var(--text)]">{solutionText}</p></section> : null}
    </section>
  );
}
