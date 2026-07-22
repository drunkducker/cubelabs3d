"use client";

/**
 * Stable, flash-free solver-playback cube.
 *
 * Every physical cubie stays mounted under one permanent cube parent. Face turns
 * are applied directly to each selected cubie's local matrix, so there is no
 * re-parenting, flashing, folding, or accumulated quaternion drift.
 */
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, RoundedBox } from "@react-three/drei";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const COLOR: Record<string, string> = {
  U: "#f7f7f2",
  R: "#e53935",
  F: "#24c45a",
  D: "#ffd21f",
  L: "#ff7a18",
  B: "#1464e8",
};

type Vec3 = [number, number, number];
type Axis = "x" | "y" | "z";
type Cell = { x: number; y: number; z: number };
type MoveSpec = { axis: Axis; layer: -1 | 0 | 1; angle: number };
type CubieRecord = { group: THREE.Group; matrix: THREE.Matrix4 };
type Animation = MoveSpec & { startedAt: number; nextStep: number; cubies: CubieRecord[] };

const MOVE: Record<string, Omit<MoveSpec, "angle"> & { clockwise: number }> = {
  U: { axis: "y", layer: 1, clockwise: -1 },
  D: { axis: "y", layer: -1, clockwise: 1 },
  F: { axis: "z", layer: 1, clockwise: -1 },
  B: { axis: "z", layer: -1, clockwise: 1 },
  R: { axis: "x", layer: 1, clockwise: -1 },
  L: { axis: "x", layer: -1, clockwise: 1 },
};

const CELLS: Cell[] = [];
for (let x = -1; x <= 1; x += 1) {
  for (let y = -1; y <= 1; y += 1) {
    for (let z = -1; z <= 1; z += 1) CELLS.push({ x, y, z });
  }
}

function invert(move: string) {
  return move.endsWith("2") ? move : move.endsWith("'") ? move[0] : `${move}'`;
}

function spec(move: string): MoveSpec {
  const base = MOVE[move[0]];
  const turns = move.endsWith("2") ? 2 : move.endsWith("'") ? -1 : 1;
  return { ...base, angle: base.clockwise * turns * Math.PI / 2 };
}

function stickerIndex(face: string, x: number, y: number, z: number) {
  if (face === "U") return (z + 1) * 3 + (x + 1);
  if (face === "R") return 9 + (1 - y) * 3 + (1 - z);
  if (face === "F") return 18 + (1 - y) * 3 + (x + 1);
  if (face === "D") return 27 + (1 - z) * 3 + (x + 1);
  if (face === "L") return 36 + (1 - y) * 3 + (z + 1);
  return 45 + (1 - y) * 3 + (1 - x);
}

function matrixCoordinate(matrix: THREE.Matrix4, axis: Axis) {
  return matrix.elements[axis === "x" ? 12 : axis === "y" ? 13 : 14];
}

function snapCubeMatrix(matrix: THREE.Matrix4) {
  const snapped = matrix.clone();
  const elements = snapped.elements;
  [0, 1, 2, 4, 5, 6, 8, 9, 10].forEach((index) => {
    const value = elements[index];
    elements[index] = Math.abs(value) < 0.5 ? 0 : value > 0 ? 1 : -1;
  });
  elements[12] = Math.round(elements[12]);
  elements[13] = Math.round(elements[13]);
  elements[14] = Math.round(elements[14]);
  elements[3] = 0;
  elements[7] = 0;
  elements[11] = 0;
  elements[15] = 1;
  return snapped;
}

function rotationMatrix(axis: Axis, angle: number) {
  const matrix = new THREE.Matrix4();
  if (axis === "x") return matrix.makeRotationX(angle);
  if (axis === "y") return matrix.makeRotationY(angle);
  return matrix.makeRotationZ(angle);
}

function Sticker({ color, position, rotation = [0, 0, 0] }: { color: string; position: Vec3; rotation?: Vec3 }) {
  return (
    <RoundedBox args={[0.76, 0.76, 0.045]} radius={0.055} smoothness={3} position={position} rotation={rotation}>
      <meshStandardMaterial color={color} roughness={0.34} metalness={0.01} />
    </RoundedBox>
  );
}

const Cubie = memo(function Cubie({ cell, facelets, register }: { cell: Cell; facelets: string; register: (key: string, group: THREE.Group | null) => void }) {
  const { x, y, z } = cell;
  const key = `${x}:${y}:${z}`;
  const initialMatrix = useMemo(() => new THREE.Matrix4().makeTranslation(x, y, z), [x, y, z]);
  const setGroup = useCallback((group: THREE.Group | null) => register(key, group), [key, register]);
  return (
    <group ref={setGroup} matrixAutoUpdate={false} matrix={initialMatrix}>
      <RoundedBox args={[0.9, 0.9, 0.9]} radius={0.075} smoothness={3}><meshStandardMaterial color="#111318" roughness={0.4} metalness={0.05} /></RoundedBox>
      {x === 1 && <Sticker color={COLOR[facelets[stickerIndex("R", x, y, z)]]} position={[0.468, 0, 0]} rotation={[0, Math.PI / 2, 0]} />}
      {x === -1 && <Sticker color={COLOR[facelets[stickerIndex("L", x, y, z)]]} position={[-0.468, 0, 0]} rotation={[0, Math.PI / 2, 0]} />}
      {y === 1 && <Sticker color={COLOR[facelets[stickerIndex("U", x, y, z)]]} position={[0, 0.468, 0]} rotation={[Math.PI / 2, 0, 0]} />}
      {y === -1 && <Sticker color={COLOR[facelets[stickerIndex("D", x, y, z)]]} position={[0, -0.468, 0]} rotation={[Math.PI / 2, 0, 0]} />}
      {z === 1 && <Sticker color={COLOR[facelets[stickerIndex("F", x, y, z)]]} position={[0, 0, 0.468]} />}
      {z === -1 && <Sticker color={COLOR[facelets[stickerIndex("B", x, y, z)]]} position={[0, 0, -0.468]} />}
    </group>
  );
});

function Scene({ initialFacelets, solution, step, onAnimating, durationMs }: { initialFacelets: string; solution: string[]; step: number; onAnimating: (value: boolean) => void; durationMs: number }) {
  const cubies = useRef(new Map<string, THREE.Group>());
  const shownStep = useRef(0);
  const animation = useRef<Animation | null>(null);
  const onAnimatingRef = useRef(onAnimating);
  const durationRef = useRef(durationMs);
  const [settleTick, setSettleTick] = useState(0);

  useEffect(() => { onAnimatingRef.current = onAnimating; }, [onAnimating]);
  useEffect(() => { durationRef.current = durationMs; }, [durationMs]);

  const register = useCallback((key: string, group: THREE.Group | null) => {
    if (group) cubies.current.set(key, group);
    else cubies.current.delete(key);
  }, []);

  useEffect(() => {
    shownStep.current = 0;
    animation.current = null;
    onAnimatingRef.current(false);
  }, [initialFacelets]);

  useEffect(() => {
    if (step === shownStep.current || animation.current) return;
    const forward = step > shownStep.current;
    const move = forward ? solution[shownStep.current] : invert(solution[shownStep.current - 1]);
    if (!move) return;
    const target = spec(move);
    const nextStep = forward ? shownStep.current + 1 : shownStep.current - 1;
    const selected = Array.from(cubies.current.values())
      .filter((group) => Math.round(matrixCoordinate(group.matrix, target.axis)) === target.layer)
      .map((group) => ({ group, matrix: group.matrix.clone() }));
    if (selected.length !== 9) {
      console.error(`Cube animation selected ${selected.length} cubies for ${move}; expected 9.`);
      return;
    }
    animation.current = { ...target, startedAt: performance.now(), nextStep, cubies: selected };
    onAnimatingRef.current(true);
  }, [step, solution, settleTick]);

  useFrame(() => {
    const current = animation.current;
    if (!current) return;
    const t = Math.min(1, (performance.now() - current.startedAt) / durationRef.current);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const animatedRotation = rotationMatrix(current.axis, current.angle * eased);
    current.cubies.forEach(({ group, matrix }) => {
      group.matrix.multiplyMatrices(animatedRotation, matrix);
      group.matrixWorldNeedsUpdate = true;
    });
    if (t >= 1) {
      const completedRotation = rotationMatrix(current.axis, current.angle);
      current.cubies.forEach(({ group, matrix }) => {
        group.matrix.copy(snapCubeMatrix(new THREE.Matrix4().multiplyMatrices(completedRotation, matrix)));
        group.matrixWorldNeedsUpdate = true;
      });
      shownStep.current = current.nextStep;
      animation.current = null;
      onAnimatingRef.current(false);
      setSettleTick((value) => value + 1);
    }
  });

  return (
    <>
      <hemisphereLight args={["#ffffff", "#18345f", 1.5]} />
      <directionalLight position={[5, 8, 7]} intensity={1.8} />
      <directionalLight position={[-5, 3, 4]} intensity={0.8} color="#9fd8ff" />
      <group rotation={[-0.08, -0.08, 0]} scale={0.9}>
        {CELLS.map((cell) => <Cubie key={`${initialFacelets}:${cell.x}:${cell.y}:${cell.z}`} cell={cell} facelets={initialFacelets} register={register} />)}
      </group>
      <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={Math.PI / 4.5} maxPolarAngle={(3.4 * Math.PI) / 4.5} />
    </>
  );
}

export default function SolverCube3D({ initialFacelets, solution, step, onAnimating, durationMs = 460 }: { initialFacelets: string; solution: string[]; step: number; onAnimating: (value: boolean) => void; durationMs?: number }) {
  return (
    <Canvas camera={{ position: [4.4, 3.5, 5.1], fov: 36 }} dpr={[1, 1.35]} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} style={{ background: "transparent" }}>
      <Scene key={initialFacelets} initialFacelets={initialFacelets} solution={solution} step={step} onAnimating={onAnimating} durationMs={durationMs} />
    </Canvas>
  );
}
