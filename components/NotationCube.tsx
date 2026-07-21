"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RefreshIcon } from "./icons";

type Face = "U" | "D" | "F" | "B" | "R" | "L";

const FACE_COLORS: Record<Face, string> = {
  U: "#f7f7f2",
  D: "#ffd21f",
  F: "#24c45a",
  B: "#1464e8",
  R: "#e53935",
  L: "#ff7a18",
};

const FACE_TEXT: Record<Face, string> = {
  U: "#111318",
  D: "#191200",
  F: "#041b0b",
  B: "#f4f8ff",
  R: "#fff5f5",
  L: "#1d0d00",
};

function makeLabelTexture(label: string, color: string, textColor: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const radius = 34;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(12, 12, 232, 232, radius);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.42)";
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.fillStyle = textColor;
  ctx.font = "900 68px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 128, 132);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function labelFor(face: Face, row: number, col: number) {
  return `${face}${row * 4 + col + 1}`;
}

function addSticker(
  group: THREE.Group,
  face: Face,
  row: number,
  col: number,
  position: [number, number, number],
  rotation: [number, number, number],
  textures: THREE.Texture[],
) {
  const label = labelFor(face, row, col);
  const texture = makeLabelTexture(label, FACE_COLORS[face], FACE_TEXT[face]);
  textures.push(texture);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.28,
    metalness: 0.025,
    emissive: FACE_COLORS[face],
    emissiveIntensity: 0.035,
  });
  const sticker = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.76), material);
  sticker.position.set(...position);
  sticker.rotation.set(...rotation);
  sticker.userData.label = label;
  sticker.userData.face = face;
  group.add(sticker);
}

export default function NotationCube() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState("Spin the cube, then tap a sticker");
  const [viewNonce, setViewNonce] = useState(0);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 240);
    const distance = 4 * 4.8;
    const cubeAnchor = new THREE.Vector3(-2.5, 2, 0);
    camera.position.set(cubeAnchor.x + distance * 0.82, cubeAnchor.y + distance * 0.68, cubeAnchor.z + distance);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.55));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearAlpha(0);
    renderer.domElement.style.touchAction = "none";
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.zoomSpeed = 0.8;
    controls.rotateSpeed = 0.72;
    controls.minDistance = 4 * 2.2;
    controls.maxDistance = 4 * 5.4;
    controls.target.copy(cubeAnchor);
    controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.autoRotateSpeed = 0.55;
    controls.touches.ONE = THREE.TOUCH.ROTATE;
    controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
    controls.update();
    controls.saveState();

    scene.add(new THREE.HemisphereLight("#ffffff", "#223052", 2.2));
    const key = new THREE.DirectionalLight("#ffffff", 2.4);
    key.position.set(8, 12, 10);
    scene.add(key);
    const rim = new THREE.DirectionalLight("#8fb7ff", 1.35);
    rim.position.set(-10, 3, -8);
    scene.add(rim);

    const root = new THREE.Group();
    root.position.copy(cubeAnchor);
    scene.add(root);

    const size = 4;
    const edge = (size - 1) / 2;
    const bodyGeometry = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: "#111318", roughness: 0.38, metalness: 0.08 });
    const textures: THREE.Texture[] = [];
    const pickables: THREE.Mesh[] = [];

    for (let xi = 0; xi < size; xi++) for (let yi = 0; yi < size; yi++) for (let zi = 0; zi < size; zi++) {
      const exterior = xi === 0 || yi === 0 || zi === 0 || xi === size - 1 || yi === size - 1 || zi === size - 1;
      if (!exterior) continue;

      const x = xi - edge;
      const y = yi - edge;
      const z = zi - edge;
      const cubie = new THREE.Group();
      cubie.position.set(x, y, z);
      cubie.add(new THREE.Mesh(bodyGeometry, bodyMaterial));

      if (y === edge) addSticker(cubie, "U", zi, xi, [0, 0.476, 0], [-Math.PI / 2, 0, 0], textures);
      if (y === -edge) addSticker(cubie, "D", size - 1 - zi, xi, [0, -0.476, 0], [Math.PI / 2, 0, 0], textures);
      if (z === edge) addSticker(cubie, "F", size - 1 - yi, xi, [0, 0, 0.476], [0, 0, 0], textures);
      if (z === -edge) addSticker(cubie, "B", size - 1 - yi, size - 1 - xi, [0, 0, -0.476], [0, Math.PI, 0], textures);
      if (x === edge) addSticker(cubie, "R", size - 1 - yi, size - 1 - zi, [0.476, 0, 0], [0, Math.PI / 2, 0], textures);
      if (x === -edge) addSticker(cubie, "L", size - 1 - yi, zi, [-0.476, 0, 0], [0, -Math.PI / 2, 0], textures);

      cubie.traverse(child => {
        if (child instanceof THREE.Mesh && child.userData.label) pickables.push(child);
      });
      root.add(cubie);
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let selectedSticker: THREE.Mesh | null = null;
    let hoveredSticker: THREE.Mesh | null = null;
    let pointerStart: { pointerId: number; x: number; y: number } | null = null;

    const glowSticker = (mesh: THREE.Mesh | null, intensity: number) => {
      if (!mesh) return;
      const face = mesh.userData.face as Face | undefined;
      if (!face) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach(item => {
        const mat = item as THREE.MeshStandardMaterial;
        mat.emissive.set(intensity ? "#4d7cff" : FACE_COLORS[face]);
        mat.emissiveIntensity = intensity || 0.035;
      });
    };

    const pickSticker = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(pickables, false)[0]?.object as THREE.Mesh | undefined;
    };

    const onPointerDown = (event: PointerEvent) => {
      pointerStart = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      controls.autoRotate = false;
    };

    const onPointerMove = (event: PointerEvent) => {
      const hit = pickSticker(event) ?? null;
      if (hit === hoveredSticker) return;
      if (hoveredSticker !== selectedSticker) glowSticker(hoveredSticker, 0);
      hoveredSticker = hit;
      if (hoveredSticker && hoveredSticker !== selectedSticker) glowSticker(hoveredSticker, 0.18);
      renderer.domElement.style.cursor = hoveredSticker ? "pointer" : "grab";
    };

    const onPointerUp = (event: PointerEvent) => {
      const start = pointerStart;
      pointerStart = null;
      if (!start || start.pointerId !== event.pointerId) return;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) return;
      const hit = pickSticker(event);
      if (!hit?.userData.label) return;
      if (selectedSticker && selectedSticker !== hit) glowSticker(selectedSticker, 0);
      selectedSticker = hit;
      glowSticker(selectedSticker, 0.42);
      setSelected(`${hit.userData.label} sticker`);
    };
    const onPointerLeave = () => {
      if (hoveredSticker !== selectedSticker) glowSticker(hoveredSticker, 0);
      hoveredSticker = null;
      renderer.domElement.style.cursor = "grab";
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);

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
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      controls.dispose();
      bodyGeometry.dispose();
      bodyMaterial.dispose();
      textures.forEach(texture => texture.dispose());
      pickables.forEach(mesh => {
        mesh.geometry.dispose();
        const material = mesh.material;
        if (Array.isArray(material)) material.forEach(item => item.dispose());
        else material.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [viewNonce]);

  const resetView = () => {
    setSelected("Spin the cube, then tap a sticker");
    setViewNonce(value => value + 1);
    setSpinning(true);
    window.setTimeout(() => setSpinning(false), 500);
  };

  return (
    <section className="cube-card relative mt-3 overflow-hidden rounded-[22px]">
      <div className="absolute left-3 top-3 z-[4] rounded-[11px] border border-[var(--border)] bg-black/35 px-3 py-1.5 text-xs font-bold text-[var(--muted)]">
        EXPLAINER CUBE
      </div>
      <div className="absolute right-3 top-3 z-[4] rounded-[11px] border border-[rgba(46,166,255,.28)] bg-black/35 px-3 py-1.5 text-xs font-extrabold text-[var(--blue)]">
        4×4 labels
      </div>
      <button
        type="button"
        aria-label="Reset notation cube view"
        onClick={resetView}
        style={{ transform: spinning ? "rotate(360deg)" : "rotate(0deg)" }}
        className="absolute right-3 top-12 z-[4] grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] bg-black/35 text-[var(--text)] transition-transform duration-500"
      >
        <RefreshIcon className="h-[19px] w-[19px]" />
      </button>
      <div ref={mountRef} className="h-[min(58dvh,500px)] min-h-[390px] w-full touch-none" />
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-[4] -translate-x-1/2 whitespace-nowrap text-[13px] font-semibold text-[var(--muted)]">
        {selected}
      </div>
    </section>
  );
}
