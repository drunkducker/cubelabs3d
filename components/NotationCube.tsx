"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RefreshIcon } from "./icons";

type Axis = "x" | "y" | "z";
type Direction = 1 | -1;
type Face = "U" | "D" | "F" | "B" | "R" | "L";
type Cubie = { mesh: THREE.Group; grid: THREE.Vector3; home: THREE.Vector3 };
type PointerStart = {
  pointerId: number;
  clientX: number;
  clientY: number;
  cubie: Cubie;
  normal: THREE.Vector3;
  label: string;
};
type Gesture = { axis: Axis; layer: number; direction: Direction; label: string };

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

const FACE_MOVE: Record<Face, { axis: Axis; layerSign: Direction; clockwise: Direction }> = {
  U: { axis: "y", layerSign: 1, clockwise: -1 },
  D: { axis: "y", layerSign: -1, clockwise: 1 },
  F: { axis: "z", layerSign: 1, clockwise: -1 },
  B: { axis: "z", layerSign: -1, clockwise: 1 },
  R: { axis: "x", layerSign: 1, clockwise: -1 },
  L: { axis: "x", layerSign: -1, clockwise: 1 },
};

const NOTATION_ANCHOR_VIEWPORT = {
  x: 349 / 709,
  y: 597 / 1536,
};

const axisVector = (axis: Axis) =>
  axis === "x" ? new THREE.Vector3(1, 0, 0) : axis === "y" ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);

const dominantAxis = (value: THREE.Vector3): Axis => {
  const axes = [Math.abs(value.x), Math.abs(value.y), Math.abs(value.z)];
  const index = axes.indexOf(Math.max(...axes));
  return index === 0 ? "x" : index === 1 ? "y" : "z";
};

const snapGrid = (value: number, size: number) => Math.round(value + (size - 1) / 2) - (size - 1) / 2;

function moveLabel(axis: Axis, layer: number, edge: number, direction: Direction) {
  const face: Face =
    axis === "x" ? (layer > 0 ? "R" : "L") :
    axis === "y" ? (layer > 0 ? "U" : "D") :
    layer > 0 ? "F" : "B";
  const depth = Math.round(edge - Math.abs(layer)) + 1;
  const prime = direction === FACE_MOVE[face].clockwise ? "" : "'";
  return `${depth > 1 ? depth : ""}${face}${prime}`;
}

function makeLabelTexture(label: string, color: string, textColor: string) {
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
  stickerGeometry: THREE.BoxGeometry,
  textures: THREE.Texture[],
  materials: THREE.MeshStandardMaterial[],
  pickables: THREE.Mesh[],
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
  materials.push(material);

  const sticker = new THREE.Mesh(stickerGeometry, material);
  sticker.position.set(...position);
  sticker.rotation.set(...rotation);
  sticker.userData.label = label;
  sticker.userData.face = face;
  sticker.userData.isSticker = true;
  group.add(sticker);
  pickables.push(sticker);
}

export default function NotationCube() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState("Swipe a sticker to turn • tap to identify");
  const [viewNonce, setViewNonce] = useState(0);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const size = 4;
    const edge = (size - 1) / 2;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 240);
    const distance = size * 4.8;
    const cubeAnchor = new THREE.Vector3(0, 0, 0);
    const uCenterStickerAnchor = new THREE.Vector3(0, edge + 0.468, 0);
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
    controls.minDistance = size * 2.2;
    controls.maxDistance = size * 5.4;
    controls.target.copy(cubeAnchor);
    controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.autoRotateSpeed = 0.5;
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

    const bodyGeometry = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const stickerGeometry = new THREE.BoxGeometry(0.76, 0.76, 0.045);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: "#111318", roughness: 0.38, metalness: 0.08 });
    const materials: THREE.MeshStandardMaterial[] = [bodyMaterial];
    const textures: THREE.Texture[] = [];
    const cubies: Cubie[] = [];
    const pickables: THREE.Mesh[] = [];

    for (let xi = 0; xi < size; xi++) for (let yi = 0; yi < size; yi++) for (let zi = 0; zi < size; zi++) {
      const exterior = xi === 0 || yi === 0 || zi === 0 || xi === size - 1 || yi === size - 1 || zi === size - 1;
      if (!exterior) continue;

      const x = xi - edge;
      const y = yi - edge;
      const z = zi - edge;
      const cubieGroup = new THREE.Group();
      cubieGroup.position.set(x, y, z);
      cubieGroup.add(new THREE.Mesh(bodyGeometry, bodyMaterial));

      if (y === edge) addSticker(cubieGroup, "U", zi, xi, [0, 0.468, 0], [Math.PI / 2, 0, 0], stickerGeometry, textures, materials, pickables);
      if (y === -edge) addSticker(cubieGroup, "D", size - 1 - zi, xi, [0, -0.468, 0], [Math.PI / 2, 0, 0], stickerGeometry, textures, materials, pickables);
      if (z === edge) addSticker(cubieGroup, "F", size - 1 - yi, xi, [0, 0, 0.468], [0, 0, 0], stickerGeometry, textures, materials, pickables);
      if (z === -edge) addSticker(cubieGroup, "B", size - 1 - yi, size - 1 - xi, [0, 0, -0.468], [0, Math.PI, 0], stickerGeometry, textures, materials, pickables);
      if (x === edge) addSticker(cubieGroup, "R", size - 1 - yi, size - 1 - zi, [0.468, 0, 0], [0, Math.PI / 2, 0], stickerGeometry, textures, materials, pickables);
      if (x === -edge) addSticker(cubieGroup, "L", size - 1 - yi, zi, [-0.468, 0, 0], [0, Math.PI / 2, 0], stickerGeometry, textures, materials, pickables);

      const cubie = { mesh: cubieGroup, grid: new THREE.Vector3(x, y, z), home: new THREE.Vector3(x, y, z) };
      cubieGroup.traverse(child => {
        child.userData.cubie = cubie;
      });
      root.add(cubieGroup);
      cubies.push(cubie);
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerStart: PointerStart | null = null;
    let selectedSticker: THREE.Mesh | null = null;
    let hoveredSticker: THREE.Mesh | null = null;
    let highlighted: Cubie[] = [];
    let previewGesture: Gesture | null = null;
    let active = false;

    const glowSticker = (mesh: THREE.Mesh | null, intensity: number) => {
      if (!mesh) return;
      const face = mesh.userData.face as Face | undefined;
      if (!face) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissive.set(intensity ? "#4d7cff" : FACE_COLORS[face]);
      mat.emissiveIntensity = intensity || 0.035;
    };

    const glowCubie = (cubie: Cubie, intensity: number) => {
      cubie.mesh.traverse(child => {
        if (!(child instanceof THREE.Mesh) || !child.userData.isSticker) return;
        glowSticker(child, intensity);
      });
    };

    const clearHighlight = (keepSelection = true) => {
      highlighted.forEach(cubie => glowCubie(cubie, 0));
      highlighted = [];
      previewGesture = null;
      if (keepSelection && selectedSticker) glowSticker(selectedSticker, 0.42);
    };

    const highlightLayer = (gesture: Gesture) => {
      clearHighlight();
      highlighted = cubies.filter(cubie => Math.abs(cubie.grid[gesture.axis] - gesture.layer) < 0.01);
      highlighted.forEach(cubie => glowCubie(cubie, 0.3));
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
      const origin = cubeAnchor.clone().project(camera);
      const endpoint = cubeAnchor.clone().add(worldDirection).project(camera);
      return new THREE.Vector2(endpoint.x - origin.x, -(endpoint.y - origin.y)).normalize();
    };

    const resolveGesture = (start: PointerStart, dx: number, dy: number): Gesture => {
      const faceAxis = dominantAxis(start.normal);
      const candidates = (["x", "y", "z"] as Axis[]).filter(axis => axis !== faceAxis);
      const drag = new THREE.Vector2(dx, dy).normalize();
      const best = candidates.reduce(
        (winner, axis) => {
          const score = Math.abs(drag.dot(projectedScreenDirection(axisVector(axis))));
          return score > winner.score ? { axis, score } : winner;
        },
        { axis: candidates[0], score: -1 },
      );
      const worldTangent = axisVector(best.axis);
      if (drag.dot(projectedScreenDirection(worldTangent)) < 0) worldTangent.multiplyScalar(-1);
      const rotationVector = start.normal.clone().cross(worldTangent).normalize();
      const axis = dominantAxis(rotationVector);
      const direction = (Math.sign(rotationVector[axis]) || 1) as Direction;
      const layer = start.cubie.grid[axis];
      return { axis, layer, direction, label: moveLabel(axis, layer, edge, direction) };
    };

    const turnLayer = (gesture: Gesture) => {
      if (active) return;
      if (selectedSticker) {
        glowSticker(selectedSticker, 0);
        selectedSticker = null;
      }
      clearHighlight(false);
      active = true;
      controls.enabled = false;
      controls.autoRotate = false;
      setSelected(`${gesture.label} turn`);

      const selectedCubies = cubies.filter(cubie => Math.abs(cubie.grid[gesture.axis] - gesture.layer) < 0.01);
      const pivot = new THREE.Group();
      root.add(pivot);
      selectedCubies.forEach(cubie => pivot.attach(cubie.mesh));

      const startedAt = performance.now();
      const animateTurn = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / 260);
        const eased = 1 - Math.pow(1 - progress, 3);
        pivot.rotation[gesture.axis] = gesture.direction * Math.PI * 0.5 * eased;

        if (progress < 1) {
          requestAnimationFrame(animateTurn);
          return;
        }

        pivot.updateMatrixWorld(true);
        const rotation = new THREE.Matrix4().makeRotationAxis(axisVector(gesture.axis), gesture.direction * Math.PI * 0.5);
        selectedCubies.forEach(cubie => {
          root.attach(cubie.mesh);
          cubie.mesh.position.set(snapGrid(cubie.mesh.position.x, size), snapGrid(cubie.mesh.position.y, size), snapGrid(cubie.mesh.position.z, size));
          cubie.grid.applyMatrix4(rotation).set(snapGrid(cubie.grid.x, size), snapGrid(cubie.grid.y, size), snapGrid(cubie.grid.z, size));
        });
        root.remove(pivot);
        clearHighlight(false);
        active = false;
        controls.enabled = true;
        setSelected(`${gesture.label} complete`);
      };
      requestAnimationFrame(animateTurn);
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
      const normal =
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
        normal: normal.applyMatrix3(normalMatrix).normalize(),
        label: hit.userData.label as string,
      };
      controls.enabled = false;
      renderer.domElement.setPointerCapture(event.pointerId);
      event.preventDefault();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (active) return;

      if (!pointerStart || event.pointerId !== pointerStart.pointerId) {
        const hit = pickSticker(event) ?? null;
        if (hit === hoveredSticker) return;
        if (hoveredSticker !== selectedSticker) glowSticker(hoveredSticker, 0);
        hoveredSticker = hit;
        if (hoveredSticker && hoveredSticker !== selectedSticker) glowSticker(hoveredSticker, 0.18);
        renderer.domElement.style.cursor = hoveredSticker ? "pointer" : "grab";
        return;
      }

      const dx = event.clientX - pointerStart.clientX;
      const dy = event.clientY - pointerStart.clientY;
      if (Math.hypot(dx, dy) < 16) return;
      event.preventDefault();
      const gesture = resolveGesture(pointerStart, dx, dy);
      highlightLayer(gesture);
      setSelected(`${gesture.label} layer`);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!pointerStart || event.pointerId !== pointerStart.pointerId) {
        controls.enabled = true;
        return;
      }

      const start = pointerStart;
      pointerStart = null;
      const dx = event.clientX - start.clientX;
      const dy = event.clientY - start.clientY;
      const distanceMoved = Math.hypot(dx, dy);

      if (distanceMoved >= 34) {
        turnLayer(previewGesture ?? resolveGesture(start, dx, dy));
        return;
      }

      clearHighlight();
      const hit = pickSticker(event);
      if (hit?.userData.label) {
        if (selectedSticker && selectedSticker !== hit) glowSticker(selectedSticker, 0);
        selectedSticker = hit;
        glowSticker(selectedSticker, 0.42);
        setSelected(`${hit.userData.label} sticker`);
      } else {
        setSelected("Swipe a sticker to turn • tap to identify");
      }
      controls.enabled = true;
    };

    const onPointerCancel = () => {
      pointerStart = null;
      clearHighlight();
      controls.enabled = true;
    };

    const onPointerLeave = () => {
      if (!pointerStart && hoveredSticker !== selectedSticker) glowSticker(hoveredSticker, 0);
      hoveredSticker = null;
      renderer.domElement.style.cursor = "grab";
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown, true);
    renderer.domElement.addEventListener("pointermove", onPointerMove, true);
    renderer.domElement.addEventListener("pointerup", onPointerUp, true);
    renderer.domElement.addEventListener("pointercancel", onPointerCancel, true);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave, true);

    const alignToViewportAnchor = () => {
      camera.updateProjectionMatrix();
      controls.update();

      const rect = renderer.domElement.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewportLeft = viewport?.offsetLeft ?? 0;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportWidth = viewport?.width ?? window.innerWidth;
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const targetClientX = viewportLeft + viewportWidth * NOTATION_ANCHOR_VIEWPORT.x;
      const targetClientY = viewportTop + viewportHeight * NOTATION_ANCHOR_VIEWPORT.y;
      const targetNdc = new THREE.Vector2(
        ((targetClientX - rect.left) / rect.width) * 2 - 1,
        -(((targetClientY - rect.top) / rect.height) * 2 - 1),
      );
      const currentNdc = uCenterStickerAnchor.clone().project(camera);
      camera.projectionMatrix.elements[8] += currentNdc.x - targetNdc.x;
      camera.projectionMatrix.elements[9] += currentNdc.y - targetNdc.y;
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    };

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      alignToViewportAnchor();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    window.addEventListener("scroll", alignToViewportAnchor, { passive: true });
    window.addEventListener("resize", alignToViewportAnchor);
    window.visualViewport?.addEventListener("scroll", alignToViewportAnchor, { passive: true });
    window.visualViewport?.addEventListener("resize", alignToViewportAnchor);
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
      window.removeEventListener("scroll", alignToViewportAnchor);
      window.removeEventListener("resize", alignToViewportAnchor);
      window.visualViewport?.removeEventListener("scroll", alignToViewportAnchor);
      window.visualViewport?.removeEventListener("resize", alignToViewportAnchor);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown, true);
      renderer.domElement.removeEventListener("pointermove", onPointerMove, true);
      renderer.domElement.removeEventListener("pointerup", onPointerUp, true);
      renderer.domElement.removeEventListener("pointercancel", onPointerCancel, true);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave, true);
      controls.dispose();
      bodyGeometry.dispose();
      stickerGeometry.dispose();
      textures.forEach(texture => texture.dispose());
      materials.forEach(material => material.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [viewNonce]);

  const resetView = () => {
    setSelected("Swipe a sticker to turn • tap to identify");
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
        4x4 labels
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
