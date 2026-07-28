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
const GRAB_GLOW = "#7CFF00";

type QueuedMove = { moveIndex: number; fast?: boolean };
type Kite = {
  corner: number;
  kite: number;
  quad: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3];
};
type GrabFaceEvent = CustomEvent<{ face: number | null; move: number | null }>;

const toVec3 = (value: readonly [number, number, number]) => new THREE.Vector3(value[0], value[1], value[2]);

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
  const uvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

function readableText(color: string) {
  return color === "#f5f5f5" || color === "#ffd500" || color === "#59a7ff" || color === "#8fe36b" || color === "#9aa3ad"
    ? "#0b0d12"
    : "#ffffff";
}

function labelTexture(label: string, color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);
  context.fillStyle = color;
  context.fillRect(0, 0, 256, 256);
  context.strokeStyle = "rgba(255,255,255,.48)";
  context.lineWidth = 10;
  context.strokeRect(8, 8, 240, 240);
  context.fillStyle = readableText(color);
  context.font = "900 78px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, 128, 132);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export default function KilominxNotationModel() {
  const mountRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<{ scramble: () => void; solve: () => void; reset: () => void; resetView: () => void } | null>(null);
  const [status, setStatus] = useState("Swipe a labeled sticker to turn • tap to identify");
  const [scrambleText, setScrambleText] = useState("");
  const [solutionText, setSolutionText] = useState("");
  const [busy, setBusy] = useState(false);
  const [solvedNow, setSolvedNow] = useState(true);
  const [grabFace, setGrabFace] = useState<number | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#080b14");
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(4.6, 3.6, 6.6);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.55));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
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
    controls.autoRotateSpeed = 0.35;
    controls.update();
    controls.saveState();

    scene.add(new THREE.HemisphereLight("#ffffff", "#223052", 2.1));
    const key = new THREE.DirectionalLight("#ffffff", 2.3);
    key.position.set(8, 12, 10);
    scene.add(key);
    const rim = new THREE.DirectionalLight("#5c7cff", 1.3);
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
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: "#0b0d12", roughness: 0.45, metalness: 0.06 });
    materials.push(bodyMaterial);

    for (let face = 0; face < 12; face++) {
      const color = FACE_COLORS[face]!;
      for (const kite of faceKites(face)) {
        const stickerGeometry = quadGeometry(kite.quad, 0.9);
        const backingGeometry = quadGeometry(kite.quad, 0.99);
        geometries.push(stickerGeometry, backingGeometry);
        const label = `${face + 1}${LETTERS[kite.kite]}`;
        const texture = labelTexture(label, color);
        textures.push(texture);
        const stickerMaterial = new THREE.MeshStandardMaterial({
          map: texture,
          color: "#ffffff",
          roughness: 0.3,
          metalness: 0.02,
          emissive: color,
          emissiveIntensity: 0.035,
          polygonOffset: true,
          polygonOffsetFactor: -4,
          polygonOffsetUnits: -4,
        });
        materials.push(stickerMaterial);
        const sticker = new THREE.Mesh(stickerGeometry, stickerMaterial);
        sticker.userData.isSticker = true;
        sticker.userData.face = face;
        sticker.userData.label = label;
        sticker.userData.baseColor = color;
        const backing = new THREE.Mesh(backingGeometry, bodyMaterial);
        cornerGroups[kite.corner]!.add(backing, sticker);
        pickables.push(sticker);
        stickerMeshes.push(sticker);
      }
    }

    let logicalState: KiloState = solved();
    let disposed = false;
    let moveFrame = 0;
    let active = false;
    let activeGrabFace: number | null = null;
    const queue: QueuedMove[] = [];

    const clearGrabHighlight = () => {
      for (const sticker of stickerMeshes) {
        const material = sticker.material as THREE.MeshStandardMaterial;
        material.emissive.set(sticker.userData.baseColor as string);
        material.emissiveIntensity = 0.035;
      }
    };

    const highlightGrabFace = (face: number | null) => {
      activeGrabFace = face;
      clearGrabHighlight();
      if (face === null) return;
      root.updateMatrixWorld(true);
      const targetNormal = toVec3(faceNormal(face)).normalize();
      for (const sticker of stickerMeshes) {
        const normals = sticker.geometry.getAttribute("normal");
        if (!normals) continue;
        const worldNormal = new THREE.Vector3(normals.getX(0), normals.getY(0), normals.getZ(0)).transformDirection(sticker.matrixWorld);
        if (worldNormal.dot(targetNormal) < 0.94) continue;
        const material = sticker.material as THREE.MeshStandardMaterial;
        material.emissive.set(GRAB_GLOW);
        material.emissiveIntensity = 2.4;
      }
    };

    const onGrabFace = (event: Event) => {
      const detail = (event as GrabFaceEvent).detail;
      const face = typeof detail?.face === "number" ? detail.face : null;
      controls.autoRotate = false;
      highlightGrabFace(face);
      setGrabFace(face);
      if (face !== null) setStatus(`Grab face ${face + 1} • neon green highlight`);
    };
    window.addEventListener(GRAB_FACE_EVENT, onGrabFace);

    const groupsForFace = (face: number) => FACE_CORNERS[face]!.map(slot => cornerGroups[logicalState.cp[slot]!]!);

    const runNext = () => {
      if (active || !queue.length) return;
      active = true;
      setBusy(true);
      controls.autoRotate = false;
      clearGrabHighlight();
      const queued = queue.shift()!;
      const face = faceOfMove(queued.moveIndex);
      const pieces = groupsForFace(face);
      const pivot = new THREE.Group();
      root.add(pivot);
      pieces.forEach(piece => pivot.attach(piece));
      const angle = dirOfMove(queued.moveIndex) === 1 ? TURN : -TURN;
      const axis = toVec3(faceNormal(face));
      const started = performance.now();
      const duration = queued.fast ? 115 : 260;
      const animate = (now: number) => {
        if (disposed) return;
        const progress = Math.min(1, (now - started) / duration);
        pivot.quaternion.setFromAxisAngle(axis, angle * (1 - Math.pow(1 - progress, 3)));
        if (progress < 1) {
          moveFrame = requestAnimationFrame(animate);
          return;
        }
        pivot.updateMatrixWorld(true);
        pieces.forEach(piece => root.attach(piece));
        root.remove(pivot);
        logicalState = applyMoveIndex(logicalState, queued.moveIndex);
        const nowSolved = isSolved(logicalState);
        setSolvedNow(nowSolved);
        active = false;
        setBusy(queue.length > 0);
        setStatus(nowSolved ? "Solved" : queue.length ? "Playing moves…" : "Kilominx ready");
        highlightGrabFace(activeGrabFace);
        runNext();
      };
      moveFrame = requestAnimationFrame(animate);
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
      highlightGrabFace(activeGrabFace);
    };

    actionsRef.current = {
      scramble: () => {
        if (active) return;
        const sequence = randomScramble(30);
        const notation = sequence.map(moveLabel).join(" ");
        setScrambleText(notation);
        setSolutionText("");
        setStatus("Scrambling…");
        queueSequence(sequence, true);
      },
      solve: () => {
        if (active) return;
        const sequence = solve(logicalState);
        if (!sequence.length) {
          setStatus("Already solved");
          return;
        }
        const notation = sequence.map(moveLabel).join(" ");
        setSolutionText(notation);
        setStatus(`Playing ${sequence.length} solution moves…`);
        queueSequence(sequence);
      },
      reset: () => {
        if (active) return;
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
    let pointerStart: { id: number; x: number; y: number; point: THREE.Vector3; face: number; label: string } | null = null;
    const setPointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
    };
    const resolveMove = (face: number, point: THREE.Vector3, dx: number, dy: number) => {
      const axis = toVec3(faceNormal(face));
      const tangent = axis.clone().cross(point).normalize();
      const origin = point.clone().project(camera);
      const target = point.clone().add(tangent).project(camera);
      const screen = new THREE.Vector2(target.x - origin.x, -(target.y - origin.y)).normalize();
      const drag = new THREE.Vector2(dx, dy).normalize();
      return face * 2 + (drag.dot(screen) >= 0 ? 0 : 1);
    };
    const onDown = (event: PointerEvent) => {
      if (active) return;
      setPointer(event);
      const hit = raycaster.intersectObjects(pickables, true)[0];
      if (!hit) return;
      pointerStart = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        point: hit.point.clone(),
        face: hit.object.userData.face as number,
        label: hit.object.userData.label as string,
      };
      controls.enabled = false;
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const onUp = (event: PointerEvent) => {
      if (!pointerStart || pointerStart.id !== event.pointerId) return;
      const start = pointerStart;
      pointerStart = null;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.hypot(dx, dy) >= 34) {
        const move = resolveMove(start.face, start.point, dx, dy);
        setStatus(`Turn ${moveLabel(move)} from sticker ${start.label}`);
        queueSequence([move]);
      } else {
        setStatus(`${start.label} • engine face ${start.face + 1}`);
      }
      controls.enabled = true;
    };
    renderer.domElement.addEventListener("pointerdown", onDown, true);
    renderer.domElement.addEventListener("pointerup", onUp, true);
    renderer.domElement.addEventListener("pointercancel", onUp, true);

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
      window.removeEventListener(GRAB_FACE_EVENT, onGrabFace);
      renderer.domElement.removeEventListener("pointerdown", onDown, true);
      renderer.domElement.removeEventListener("pointerup", onUp, true);
      renderer.domElement.removeEventListener("pointercancel", onUp, true);
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
    <section className="glass overflow-hidden rounded-[22px]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 text-sm text-[var(--muted)]">
        <span>{status}</span>
        <span className="font-bold text-[var(--text)]">{grabFace === null ? (solvedNow ? "Solved" : "In motion") : `Grab face ${grabFace + 1}`}</span>
      </div>
      <div ref={mountRef} className="h-[430px] w-full touch-none sm:h-[480px]" />
      <div className="pointer-events-none px-4 pb-3 text-center text-[13px] font-semibold text-[var(--muted)]">Neon green glow = current grab face • swipe a labeled sticker to turn</div>
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
      {solutionText ? (
        <section className="border-t border-[var(--border)] px-4 py-3">
          <p className="text-xs font-extrabold tracking-[.16em] text-[var(--purple)]">SOLUTION</p>
          <p className="mt-2 break-words font-mono text-xs leading-6 text-[var(--text)]">{solutionText}</p>
        </section>
      ) : null}
    </section>
  );
}
