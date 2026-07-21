"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

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
  group.add(sticker);
}

export default function NotationCube() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState("Spin the cube, then tap a sticker");

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 240);
    const distance = 4 * 4.8;
    camera.position.set(distance * 0.82, distance * 0.68, distance);

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
    controls.target.set(0, 0, 0);
    controls.update();

    scene.add(new THREE.HemisphereLight("#ffffff", "#223052", 2.2));
    const key = new THREE.DirectionalLight("#ffffff", 2.4);
    key.position.set(8, 12, 10);
    scene.add(key);
    const rim = new THREE.DirectionalLight("#8fb7ff", 1.35);
    rim.position.set(-10, 3, -8);
    scene.add(rim);

    const root = new THREE.Group();
    root.position.set(-2.5, 2, 0);
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
    const onPointerUp = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(pickables, false)[0];
      if (hit?.object.userData.label) setSelected(`${hit.object.userData.label} sticker`);
    };
    renderer.domElement.addEventListener("pointerup", onPointerUp);

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
  }, []);

  return (
    <section className="cube-card relative mt-3 overflow-hidden rounded-[22px]">
      <div className="absolute left-3 top-3 z-[4] rounded-[11px] border border-[var(--border)] bg-black/35 px-3 py-1.5 text-xs font-bold text-[var(--muted)]">
        EXPLAINER CUBE
      </div>
      <div className="absolute right-3 top-3 z-[4] rounded-[11px] border border-[rgba(46,166,255,.28)] bg-black/35 px-3 py-1.5 text-xs font-extrabold text-[var(--blue)]">
        4×4 labels
      </div>
      <div ref={mountRef} className="h-[min(58dvh,500px)] min-h-[390px] w-full touch-none" />
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-[4] -translate-x-1/2 whitespace-nowrap text-[13px] font-semibold text-[var(--muted)]">
        {selected}
      </div>
    </section>
  );
}
