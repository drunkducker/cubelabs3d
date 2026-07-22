"use client";

/**
 * Facelet-driven NxN solver playback (4x4, 5x5, …).
 *
 * Like SolverCube3D but for bigger cubes and wide turns: every physical cubie
 * stays mounted under one permanent parent, coloured directly from the cube's
 * actual facelet state (not a fixed per-face colour), and solution moves are
 * applied to each selected cubie's local matrix — no re-parenting or flashing.
 * The initial facelets come straight from the solver's cube model, so both a
 * generated scramble and a hand-entered cube render exactly as they are.
 */
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, RoundedBox } from "@react-three/drei";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const COLOR: Record<string, string> = {
  U: "#f7f7f2", R: "#e53935", F: "#24c45a", D: "#ffd21f", L: "#ff7a18", B: "#1464e8",
};
const FACE_LETTERS = ["U", "R", "F", "D", "L", "B"] as const;

type Axis = "x" | "y" | "z";
type Cell = { x: number; y: number; z: number };
type MoveSpec = { axis: Axis; layers: number[]; angle: number };
type CubieRecord = { group: THREE.Group; matrix: THREE.Matrix4 };
type Animation = MoveSpec & { startedAt: number; nextStep: number; cubies: CubieRecord[] };

const BASE: Record<string, { axis: Axis; sign: 1 | -1; clockwise: 1 | -1 }> = {
  U: { axis: "y", sign: 1, clockwise: -1 },
  D: { axis: "y", sign: -1, clockwise: 1 },
  F: { axis: "z", sign: 1, clockwise: -1 },
  B: { axis: "z", sign: -1, clockwise: 1 },
  R: { axis: "x", sign: 1, clockwise: -1 },
  L: { axis: "x", sign: -1, clockwise: 1 },
};

const rotationMatrix = (axis: Axis, angle: number) =>
  axis === "x" ? new THREE.Matrix4().makeRotationX(angle) : axis === "y" ? new THREE.Matrix4().makeRotationY(angle) : new THREE.Matrix4().makeRotationZ(angle);
const coordinate = (matrix: THREE.Matrix4, axis: Axis, step: number) => matrix.elements[axis === "x" ? 12 : axis === "y" ? 13 : 14] / step;

function snap(matrix: THREE.Matrix4, step: number) {
  const next = matrix.clone();
  const e = next.elements;
  for (const i of [0, 1, 2, 4, 5, 6, 8, 9, 10]) e[i] = Math.abs(e[i]) < 0.5 ? 0 : e[i] > 0 ? 1 : -1;
  for (const i of [12, 13, 14]) e[i] = (Math.round((e[i] / step) * 2) / 2) * step;
  e[3] = e[7] = e[11] = 0;
  e[15] = 1;
  return next;
}

function moveSpec(move: string, size: number): MoveSpec {
  const match = move.match(/^([URFDLB])(w?)(2|'?)$/);
  if (!match) throw new Error(`Invalid NxN move: ${move}`);
  const [, face, wide, suffix] = match;
  const base = BASE[face];
  const edge = (size - 1) / 2;
  const outer = base.sign * edge;
  const inner = base.sign * (edge - 1);
  const turns = suffix === "2" ? 2 : suffix === "'" ? -1 : 1;
  return { axis: base.axis, layers: wide ? [outer, inner] : [outer], angle: (base.clockwise * turns * Math.PI) / 2 };
}

function invert(move: string) {
  return move.endsWith("2") ? move : move.endsWith("'") ? move.slice(0, -1) : `${move}'`;
}

/** Facelet index (into the size*size*6 U,R,F,D,L,B state) for the sticker of
 * cubie (gx,gy,gz) facing `face`. Inverse of nxn-cube.faceGridCoordinate. */
function faceletIndex(size: number, face: string, gx: number, gy: number, gz: number) {
  const edge = (size - 1) / 2;
  const base = FACE_LETTERS.indexOf(face as (typeof FACE_LETTERS)[number]) * size * size;
  let row = 0, col = 0;
  if (face === "U") { col = gx + edge; row = gz + edge; }
  else if (face === "R") { row = edge - gy; col = edge - gz; }
  else if (face === "F") { col = gx + edge; row = edge - gy; }
  else if (face === "D") { col = gx + edge; row = edge - gz; }
  else if (face === "L") { row = edge - gy; col = gz + edge; }
  else { col = edge - gx; row = edge - gy; } // B
  return base + Math.round(row) * size + Math.round(col);
}

function Sticker({ color, position, rotation = [0, 0, 0], stickerSize }: { color: string; position: [number, number, number]; rotation?: [number, number, number]; stickerSize: number }) {
  return (
    <RoundedBox args={[stickerSize, stickerSize, 0.04]} radius={0.03} smoothness={2} position={position} rotation={rotation}>
      <meshStandardMaterial color={color} roughness={0.34} metalness={0.02} />
    </RoundedBox>
  );
}

const Cubie = memo(function Cubie({
  cell, facelets, size, step, bodySize, stickerSize, offset, register,
}: {
  cell: Cell; facelets: string; size: number; step: number; bodySize: number; stickerSize: number; offset: number;
  register: (key: string, group: THREE.Group | null) => void;
}) {
  const { x, y, z } = cell;
  const key = `${x}:${y}:${z}`;
  const edge = (size - 1) / 2;
  const matrix = useMemo(() => new THREE.Matrix4().makeTranslation(x * step, y * step, z * step), [x, y, z, step]);
  const ref = useCallback((group: THREE.Group | null) => register(key, group), [key, register]);
  const colorAt = (face: string) => COLOR[facelets[faceletIndex(size, face, x, y, z)]] ?? "#111318";
  return (
    <group ref={ref} matrixAutoUpdate={false} matrix={matrix}>
      <RoundedBox args={[bodySize, bodySize, bodySize]} radius={0.04} smoothness={2}>
        <meshStandardMaterial color="#111318" roughness={0.43} />
      </RoundedBox>
      {x === edge && <Sticker color={colorAt("R")} position={[offset, 0, 0]} rotation={[0, Math.PI / 2, 0]} stickerSize={stickerSize} />}
      {x === -edge && <Sticker color={colorAt("L")} position={[-offset, 0, 0]} rotation={[0, Math.PI / 2, 0]} stickerSize={stickerSize} />}
      {y === edge && <Sticker color={colorAt("U")} position={[0, offset, 0]} rotation={[Math.PI / 2, 0, 0]} stickerSize={stickerSize} />}
      {y === -edge && <Sticker color={colorAt("D")} position={[0, -offset, 0]} rotation={[Math.PI / 2, 0, 0]} stickerSize={stickerSize} />}
      {z === edge && <Sticker color={colorAt("F")} position={[0, 0, offset]} stickerSize={stickerSize} />}
      {z === -edge && <Sticker color={colorAt("B")} position={[0, 0, -offset]} stickerSize={stickerSize} />}
    </group>
  );
});

function Scene({ size, initialFacelets, solution, step, onAnimating, durationMs }: { size: number; initialFacelets: string; solution: string[]; step: number; onAnimating: (v: boolean) => void; durationMs: number }) {
  const edge = (size - 1) / 2;
  const positions = useMemo(() => Array.from({ length: size }, (_, i) => i - edge), [edge, size]);
  // Every cell, interior included: a wide turn selects layers.length*size*size
  // cubies, which only holds if each layer is fully populated. Interior cubies
  // render only a dark body (no stickers) and stay hidden inside the shell.
  const cells = useMemo(() => positions.flatMap((x) => positions.flatMap((y) => positions.map((z) => ({ x, y, z })))), [positions]);
  const stepSize = size <= 4 ? 0.66 : 0.58;
  const bodySize = stepSize * 0.93;
  const stickerSize = stepSize * 0.86;
  const offset = bodySize / 2 + 0.006;
  const cubies = useRef(new Map<string, THREE.Group>());
  const shown = useRef(0);
  const active = useRef<Animation | null>(null);
  const callback = useRef(onAnimating);
  const duration = useRef(durationMs);

  useEffect(() => { callback.current = onAnimating; }, [onAnimating]);
  useEffect(() => { duration.current = durationMs; }, [durationMs]);

  const register = useCallback((key: string, group: THREE.Group | null) => {
    if (group) cubies.current.set(key, group);
    else cubies.current.delete(key);
  }, []);

  useEffect(() => {
    shown.current = 0;
    active.current = null;
    callback.current(false);
  }, [initialFacelets]);

  useEffect(() => {
    if (step === shown.current || active.current) return;
    const forward = step > shown.current;
    const move = forward ? solution[shown.current] : invert(solution[shown.current - 1]);
    if (!move) return;
    const target = moveSpec(move, size);
    const nextStep = forward ? shown.current + 1 : shown.current - 1;
    const selected = Array.from(cubies.current.values())
      .filter((group) => target.layers.some((layer) => Math.abs(coordinate(group.matrix, target.axis, stepSize) - layer) < 0.1))
      .map((group) => ({ group, matrix: group.matrix.clone() }));
    const expected = target.layers.length * size * size;
    if (selected.length !== expected) {
      console.error(`${size}x${size} selected ${selected.length} for ${move}; expected ${expected}`);
      return;
    }
    active.current = { ...target, startedAt: performance.now(), nextStep, cubies: selected };
    callback.current(true);
  }, [size, solution, step]);

  useFrame(() => {
    const animation = active.current;
    if (!animation) return;
    const t = Math.min(1, (performance.now() - animation.startedAt) / duration.current);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const currentRotation = rotationMatrix(animation.axis, animation.angle * eased);
    for (const cubie of animation.cubies) {
      cubie.group.matrix.multiplyMatrices(currentRotation, cubie.matrix);
      cubie.group.matrixWorldNeedsUpdate = true;
    }
    if (t >= 1) {
      const doneRotation = rotationMatrix(animation.axis, animation.angle);
      for (const cubie of animation.cubies) {
        cubie.group.matrix.copy(snap(new THREE.Matrix4().multiplyMatrices(doneRotation, cubie.matrix), stepSize));
        cubie.group.matrixWorldNeedsUpdate = true;
      }
      shown.current = animation.nextStep;
      active.current = null;
      callback.current(false);
    }
  });

  return (
    <>
      <hemisphereLight args={["#ffffff", "#18345f", 1.5]} />
      <directionalLight position={[5, 8, 7]} intensity={1.8} />
      <directionalLight position={[-5, 3, 4]} intensity={0.8} color="#9fd8ff" />
      <group rotation={[-0.08, -0.08, 0]} scale={0.9}>
        {cells.map((cell) => (
          <Cubie key={`${initialFacelets}:${cell.x}:${cell.y}:${cell.z}`} cell={cell} facelets={initialFacelets} size={size} step={stepSize} bodySize={bodySize} stickerSize={stickerSize} offset={offset} register={register} />
        ))}
      </group>
      <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={Math.PI / 4.5} maxPolarAngle={(3.4 * Math.PI) / 4.5} />
    </>
  );
}

export default function NxNSolverCube3D({ size, initialFacelets, solution, step, onAnimating, durationMs = 460 }: { size: number; initialFacelets: string; solution: string[]; step: number; onAnimating: (v: boolean) => void; durationMs?: number }) {
  const distance = size <= 4 ? 5.9 : 6.4;
  return (
    <Canvas camera={{ position: [distance * 0.8, distance * 0.66, distance], fov: 37 }} dpr={[1, 1.3]} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} style={{ background: "transparent" }}>
      <Scene key={initialFacelets} size={size} initialFacelets={initialFacelets} solution={solution} step={step} onAnimating={onAnimating} durationMs={durationMs} />
    </Canvas>
  );
}
