"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import SiteHeader from "@/components/SiteHeader";

type Axis = "x" | "y" | "z";
type Direction = 1 | -1;
type Move = { axis: Axis; layer: number; direction: Direction; label: string };
type Cubie = { mesh: THREE.Mesh; grid: THREE.Vector3; home: THREE.Vector3 };
type PointerStart = {
  pointerId: number;
  clientX: number;
  clientY: number;
  cubie: Cubie;
  normal: THREE.Vector3;
  startedAt: number;
};

const COLORS = {
  R: "#e52b3d",
  L: "#ff7a00",
  U: "#f5f1e8",
  D: "#ffd500",
  F: "#00a85a",
  B: "#1557d5",
  I: "#111319",
};

const axisVector = (axis: Axis) =>
  axis === "x"
    ? new THREE.Vector3(1, 0, 0)
    : axis === "y"
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(0, 0, 1);

const dominantAxis = (vector: THREE.Vector3): Axis => {
  const values = [Math.abs(vector.x), Math.abs(vector.y), Math.abs(vector.z)];
  const largest = values.indexOf(Math.max(...values));
  return largest === 0 ? "x" : largest === 1 ? "y" : "z";
};

const snap = (value: number, size: number) =>
  Math.round(value + (size - 1) / 2) - (size - 1) / 2;

const moveLabel = (axis: Axis, layer: number, edge: number, direction: Direction) => {
  const depth = Math.round(edge - Math.abs(layer)) + 1;
  const side = layer > 0
    ? axis === "x" ? "R" : axis === "y" ? "U" : "F"
    : axis === "x" ? "L" : axis === "y" ? "D" : "B";
  return `${depth > 1 ? depth : ""}${side}${direction < 0 ? "′" : ""}`;
};

export default function NxNCubeGame({ size = 10 }: { size?: number }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<{
    turn: (move: Move) => void;
    scramble: () => void;
    resetCube: () => void;
    resetView: () => void;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(`${size}×${size} ready`);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#080b14");

    // Match the familiar 3×3 three-quarter view while leaving enough room to
    // see the whole large cube. Pinch zoom can then bring any section close.
    const camera = new THREE.PerspectiveCamera(27, 1, 0.1, 250);
    const distance = size * 2.65;
    const homePosition = new THREE.Vector3(distance * 0.72, distance * 0.62, distance);
    camera.position.copy(homePosition);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.55));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.touchAction = "none";
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.enableZoom = true;
    controls.zoomSpeed = 0.9;
    controls.rotateSpeed = 0.72;
    controls.panSpeed = 0.7;
    controls.minDistance = size * 0.78;
    controls.maxDistance = size * 5;
    controls.target.set(0, 0, 0);
    controls.touches.ONE = THREE.TOUCH.ROTATE;
    controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
    controls.update();
    controls.saveState();

    scene.add(new THREE.HemisphereLight("#ffffff", "#223052", 2.2));
    const key = new THREE.DirectionalLight("#ffffff", 2.4);
    key.position.set(8, 12, 10);
    scene.add(key);
    const rim = new THREE.DirectionalLight("#5c7cff", 1.4);
    rim.position.set(-10, 3, -8);
    scene.add(rim);

    const root = new THREE.Group();
    scene.add(root);
    const edge = (size - 1) / 2;
    const geometry = new THREE.BoxGeometry(0.92, 0.92, 0.92);
    const cubies: Cubie[] = [];
    const material = (color: string) =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.38, metalness: 0.02 });

    for (let xi = 0; xi < size; xi += 1) {
      for (let yi = 0; yi < size; yi += 1) {
        for (let zi = 0; zi < size; zi += 1) {
          const exterior =
            xi === 0 || yi === 0 || zi === 0 ||
            xi === size - 1 || yi === size - 1 || zi === size - 1;
          if (!exterior) continue;

          const x = xi - edge;
          const y = yi - edge;
          const z = zi - edge;
          const mats = [
            material(x === edge ? COLORS.R : COLORS.I),
            material(x === -edge ? COLORS.L : COLORS.I),
            material(y === edge ? COLORS.U : COLORS.I),
            material(y === -edge ? COLORS.D : COLORS.I),
            material(z === edge ? COLORS.F : COLORS.I),
            material(z === -edge ? COLORS.B : COLORS.I),
          ];
          const mesh = new THREE.Mesh(geometry, mats);
          mesh.position.set(x, y, z);
          root.add(mesh);
          cubies.push({
            mesh,
            grid: new THREE.Vector3(x, y, z),
            home: new THREE.Vector3(x, y, z),
          });
        }
      }
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerStart: PointerStart | null = null;
    let activePointers = 0;
    let highlighted: Cubie[] = [];

    const clearHighlight = () => {
      highlighted.forEach((cubie) => {
        const materials = Array.isArray(cubie.mesh.material)
          ? cubie.mesh.material
          : [cubie.mesh.material];
        materials.forEach((entry) => {
          const mat = entry as THREE.MeshStandardMaterial;
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
        });
      });
      highlighted = [];
    };

    const highlightLayer = (axis: Axis, layer: number) => {
      clearHighlight();
      highlighted = cubies.filter((cubie) => Math.abs(cubie.grid[axis] - layer) < 0.01);
      highlighted.forEach((cubie) => {
        const materials = Array.isArray(cubie.mesh.material)
          ? cubie.mesh.material
          : [cubie.mesh.material];
        materials.forEach((entry) => {
          const mat = entry as THREE.MeshStandardMaterial;
          mat.emissive.set("#4d7cff");
          mat.emissiveIntensity = 0.32;
        });
      });
    };

    const queue: Move[] = [];
    let active = false;

    const runNext = () => {
      if (active || !queue.length) return;
      clearHighlight();
      active = true;
      setBusy(true);
      const move = queue.shift()!;
      const selected = cubies.filter(
        (cubie) => Math.abs(cubie.grid[move.axis] - move.layer) < 0.01,
      );
      const pivot = new THREE.Group();
      root.add(pivot);
      selected.forEach((cubie) => pivot.attach(cubie.mesh));
      const started = performance.now();

      const animate = (now: number) => {
        const progress = Math.min(1, (now - started) / 245);
        const eased = 1 - Math.pow(1 - progress, 3);
        pivot.rotation[move.axis] = move.direction * Math.PI * 0.5 * eased;
        if (progress < 1) {
          requestAnimationFrame(animate);
          return;
        }

        pivot.updateMatrixWorld(true);
        const rotation = new THREE.Matrix4().makeRotationAxis(
          axisVector(move.axis),
          move.direction * Math.PI * 0.5,
        );
        selected.forEach((cubie) => {
          root.attach(cubie.mesh);
          cubie.mesh.position.set(
            snap(cubie.mesh.position.x, size),
            snap(cubie.mesh.position.y, size),
            snap(cubie.mesh.position.z, size),
          );
          cubie.grid.applyMatrix4(rotation).set(
            snap(cubie.grid.x, size),
            snap(cubie.grid.y, size),
            snap(cubie.grid.z, size),
          );
        });
        root.remove(pivot);
        setMoves((value) => value + 1);
        setStatus(`${move.label} complete`);
        active = false;
        setBusy(queue.length > 0);
        runNext();
      };
      requestAnimationFrame(animate);
    };

    const turn = (move: Move) => {
      queue.push(move);
      runNext();
    };

    const outerMoves: Record<string, Move> = {
      R: { axis: "x", layer: edge, direction: -1, label: "R" },
      L: { axis: "x", layer: -edge, direction: 1, label: "L" },
      U: { axis: "y", layer: edge, direction: -1, label: "U" },
      D: { axis: "y", layer: -edge, direction: 1, label: "D" },
      F: { axis: "z", layer: edge, direction: -1, label: "F" },
      B: { axis: "z", layer: -edge, direction: 1, label: "B" },
    };

    const scramble = () => {
      if (active) return;
      const labels = Object.keys(outerMoves);
      for (let index = 0; index < 16; index += 1) {
        const label = labels[Math.floor(Math.random() * labels.length)];
        const base = outerMoves[label];
        queue.push({
          ...base,
          direction: Math.random() > 0.5
            ? base.direction
            : ((base.direction * -1) as Direction),
        });
      }
      setStatus(`Scrambling ${size}×${size}…`);
      runNext();
    };

    const resetCube = () => {
      if (active) return;
      queue.length = 0;
      clearHighlight();
      cubies.forEach((cubie) => {
        cubie.mesh.position.copy(cubie.home);
        cubie.mesh.quaternion.identity();
        cubie.grid.copy(cubie.home);
      });
      setMoves(0);
      setStatus(`${size}×${size} reset`);
    };

    const resetView = () => {
      controls.reset();
      setStatus("View reset");
    };

    actionsRef.current = { turn, scramble, resetCube, resetView };

    const setPointerFromEvent = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
    };

    const projectedScreenDirection = (worldDirection: THREE.Vector3) => {
      const origin = new THREE.Vector3(0, 0, 0).project(camera);
      const endpoint = worldDirection.clone().project(camera);
      return new THREE.Vector2(endpoint.x - origin.x, -(endpoint.y - origin.y)).normalize();
    };

    const onPointerDown = (event: PointerEvent) => {
      activePointers += 1;
      if (active || activePointers > 1) {
        pointerStart = null;
        controls.enabled = true;
        clearHighlight();
        return;
      }

      setPointerFromEvent(event);
      const hits = raycaster.intersectObjects(cubies.map((cubie) => cubie.mesh), false);
      const hit = hits[0];
      if (!hit || !hit.face) {
        controls.enabled = true;
        return;
      }

      const cubie = cubies.find((entry) => entry.mesh === hit.object);
      if (!cubie) return;

      const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
      const normal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
      pointerStart = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        cubie,
        normal,
        startedAt: performance.now(),
      };
      controls.enabled = false;
      renderer.domElement.setPointerCapture(event.pointerId);
      setStatus("Swipe a row or column");
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!pointerStart || event.pointerId !== pointerStart.pointerId || activePointers > 1) return;
      const dx = event.clientX - pointerStart.clientX;
      const dy = event.clientY - pointerStart.clientY;
      if (Math.hypot(dx, dy) < 10) return;

      const faceAxis = dominantAxis(pointerStart.normal);
      const candidates = (["x", "y", "z"] as Axis[]).filter((axis) => axis !== faceAxis);
      const drag = new THREE.Vector2(dx, dy).normalize();
      const tangentAxis = candidates.reduce((best, axis) => {
        const score = Math.abs(drag.dot(projectedScreenDirection(axisVector(axis))));
        return score > best.score ? { axis, score } : best;
      }, { axis: candidates[0], score: -1 });

      const worldTangent = axisVector(tangentAxis.axis);
      const screenTangent = projectedScreenDirection(worldTangent);
      if (drag.dot(screenTangent) < 0) worldTangent.multiplyScalar(-1);
      const rotationVector = pointerStart.normal.clone().cross(worldTangent).normalize();
      const rotationAxis = dominantAxis(rotationVector);
      const layer = pointerStart.cubie.grid[rotationAxis];
      highlightLayer(rotationAxis, layer);
      setStatus(`Selected ${moveLabel(rotationAxis, layer, edge, 1)} layer`);
    };

    const finishPointer = (event: PointerEvent) => {
      activePointers = Math.max(0, activePointers - 1);
      if (!pointerStart || event.pointerId !== pointerStart.pointerId) {
        if (activePointers === 0) controls.enabled = true;
        return;
      }

      const start = pointerStart;
      pointerStart = null;
      const dx = event.clientX - start.clientX;
      const dy = event.clientY - start.clientY;
      const distanceDragged = Math.hypot(dx, dy);

      if (distanceDragged >= 28 && !active) {
        const faceAxis = dominantAxis(start.normal);
        const candidates = (["x", "y", "z"] as Axis[]).filter((axis) => axis !== faceAxis);
        const drag = new THREE.Vector2(dx, dy).normalize();
        const tangentAxis = candidates.reduce((best, axis) => {
          const score = Math.abs(drag.dot(projectedScreenDirection(axisVector(axis))));
          return score > best.score ? { axis, score } : best;
        }, { axis: candidates[0], score: -1 });

        const worldTangent = axisVector(tangentAxis.axis);
        if (drag.dot(projectedScreenDirection(worldTangent)) < 0) worldTangent.multiplyScalar(-1);
        const rotationVector = start.normal.clone().cross(worldTangent).normalize();
        const rotationAxis = dominantAxis(rotationVector);
        const direction = (Math.sign(rotationVector[rotationAxis]) || 1) as Direction;
        const layer = start.cubie.grid[rotationAxis];
        turn({
          axis: rotationAxis,
          layer,
          direction,
          label: moveLabel(rotationAxis, layer, edge, direction),
        });
      } else {
        clearHighlight();
        setStatus(`${size}×${size} ready`);
      }

      controls.enabled = activePointers === 0;
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown, true);
    renderer.domElement.addEventListener("pointermove", onPointerMove, true);
    renderer.domElement.addEventListener("pointerup", finishPointer, true);
    renderer.domElement.addEventListener("pointercancel", finishPointer, true);

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
      renderer.domElement.removeEventListener("pointerdown", onPointerDown, true);
      renderer.domElement.removeEventListener("pointermove", onPointerMove, true);
      renderer.domElement.removeEventListener("pointerup", finishPointer, true);
      renderer.domElement.removeEventListener("pointercancel", finishPointer, true);
      controls.dispose();
      actionsRef.current = null;
      cubies.forEach((cubie) => {
        const materials = Array.isArray(cubie.mesh.material)
          ? cubie.mesh.material
          : [cubie.mesh.material];
        materials.forEach((entry) => entry.dispose());
      });
      geometry.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [size]);

  const edge = (size - 1) / 2;
  const faceMoves: Record<string, Move> = {
    R: { axis: "x", layer: edge, direction: -1, label: "R" },
    L: { axis: "x", layer: -edge, direction: 1, label: "L" },
    U: { axis: "y", layer: edge, direction: -1, label: "U" },
    D: { axis: "y", layer: -edge, direction: 1, label: "D" },
    F: { axis: "z", layer: edge, direction: -1, label: "F" },
    B: { axis: "z", layer: -edge, direction: 1, label: "B" },
  };

  return (
    <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[22px]">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="relative z-[1]">
        <SiteHeader />
        <Link href="/solve" className="mt-4 inline-flex text-sm font-bold text-[var(--muted)]">
          ← Back to solvers
        </Link>

        <section className="mt-5">
          <p className="text-xs font-extrabold tracking-[.18em] text-[var(--green)]">PLAYABLE LARGE CUBE</p>
          <h1 className="mt-2 text-[39px] font-extrabold leading-[1.02] tracking-[-1px]">
            Play the<br /><span className="accent-text">{size}×{size} Cube</span>
          </h1>
          <p className="mt-3 text-[15px] leading-6 text-[var(--muted)]">
            Swipe any visible section to turn that exact layer. Rotate, zoom, and pan to reach every edge and corner.
          </p>
        </section>

        <section className="glass mt-[18px] overflow-hidden rounded-[22px]">
          <div className="flex justify-between border-b border-[var(--border)] px-4 py-3 text-sm text-[var(--muted)]">
            <span>{status}</span>
            <strong className="text-[var(--text)]">{moves} moves</strong>
          </div>
          <div ref={mountRef} className="h-[390px] w-full touch-none sm:h-[440px]" />
        </section>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {Object.entries(faceMoves).map(([label, move]) => (
            <button
              key={label}
              disabled={busy}
              onClick={() => actionsRef.current?.turn(move)}
              className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            disabled={busy}
            onClick={() => actionsRef.current?.scramble()}
            className="cta-purple min-h-12 rounded-xl font-extrabold disabled:opacity-40"
          >
            Scramble
          </button>
          <button
            onClick={() => actionsRef.current?.resetView()}
            className="glass min-h-12 rounded-xl font-extrabold"
          >
            Reset View
          </button>
        </div>

        <button
          disabled={busy}
          onClick={() => actionsRef.current?.resetCube()}
          className="glass mt-2 min-h-12 w-full rounded-xl font-extrabold disabled:opacity-40"
        >
          Reset Cube
        </button>

        <section className="glass mt-4 rounded-[18px] p-4 text-sm leading-6 text-[var(--muted)]">
          <p><strong className="text-[var(--text)]">On a sticker:</strong> swipe to turn that exact row or column.</p>
          <p><strong className="text-[var(--text)]">On empty space:</strong> drag to rotate the cube.</p>
          <p><strong className="text-[var(--text)]">Two fingers:</strong> pinch to zoom and drag together to pan toward a corner.</p>
        </section>
      </div>
    </main>
  );
}
