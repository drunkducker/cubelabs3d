"use client";

/**
 * Solver playback cube using one permanent set of 27 physical cubies.
 *
 * During a turn, the affected cubies are temporarily attached to a pivot group,
 * rotated, and then attached back to the cube root. No duplicate layers, mesh
 * replacement, visibility swaps, or sticker recoloring happen between moves.
 */
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, RoundedBox } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { applySequence, solved, toFaceletString } from "@/lib/cube-engine";

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
type Animation = MoveSpec & { startedAt: number; nextStep: number; cubies: THREE.Group[] };

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

function Sticker({ color, position, rotation = [0, 0, 0] }: { color: string; position: Vec3; rotation?: Vec3 }) {
  return (
    <RoundedBox args={[0.76, 0.76, 0.045]} radius={0.055} smoothness={3} position={position} rotation={rotation}>
      <meshStandardMaterial color={color} roughness={0.34} metalness={0.01} />
    </RoundedBox>
  );
}

function Cubie({ cell, facelets, register }: { cell: Cell; facelets: string; register: (key: string, group: THREE.Group | null) => void }) {
  const { x, y, z } = cell;
  const key = `${x}:${y}:${z}`;
  return (
    <group
      ref={(group) => {
        if (group) group.userData.grid = new THREE.Vector3(x, y, z);
        register(key, group);
      }}
      position={[x, y, z]}
    >
      <RoundedBox args={[0.9, 0.9, 0.9]} radius={0.075} smoothness={3}>
        <meshStandardMaterial color="#111318" roughness={0.4} metalness={0.05} />
      </RoundedBox>
      {x === 1 && <Sticker color={COLOR[facelets[stickerIndex("R", x, y, z)]]} position={[0.468, 0, 0]} rotation={[0, Math.PI / 2, 0]} />}
      {x === -1 && <Sticker color={COLOR[facelets[stickerIndex("L", x, y, z)]]} position={[-0.468, 0, 0]} rotation={[0, Math.PI / 2, 0]} />}
      {y === 1 && <Sticker color={COLOR[facelets[stickerIndex("U", x, y, z)]]} position={[0, 0.468, 0]} rotation={[Math.PI / 2, 0, 0]} />}
      {y === -1 && <Sticker color={COLOR[facelets[stickerIndex("D", x, y, z)]]} position={[0, -0.468, 0]} rotation={[Math.PI / 2, 0, 0]} />}
      {z === 1 && <Sticker color={COLOR[facelets[stickerIndex("F", x, y, z)]]} position={[0, 0, 0.468]} />}
      {z === -1 && <Sticker color={COLOR[facelets[stickerIndex("B", x, y, z)]]} position={[0, 0, -0.468]} />}
    </group>
  );
}

function Scene({ scramble, solution, step, onAnimating }: { scramble: string; solution: string[]; step: number; onAnimating: (value: boolean) => void }) {
  const initialFacelets = useMemo(() => toFaceletString(applySequence(solved(), scramble)), [scramble]);
  const cubeRoot = useRef<THREE.Group>(null);
  const pivot = useRef<THREE.Group>(null);
  const cubies = useRef(new Map<string, THREE.Group>());
  const shownStep = useRef(0);
  const animation = useRef<Animation | null>(null);

  const register = (key: string, group: THREE.Group | null) => {
    if (group) cubies.current.set(key, group);
    else cubies.current.delete(key);
  };

  useEffect(() => {
    shownStep.current = 0;
    animation.current = null;
    if (pivot.current) pivot.current.rotation.set(0, 0, 0);
    onAnimating(false);
  }, [initialFacelets, onAnimating]);

  useEffect(() => {
    if (step === shownStep.current || animation.current || !cubeRoot.current || !pivot.current) return;

    const forward = step > shownStep.current;
    const move = forward ? solution[shownStep.current] : invert(solution[shownStep.current - 1]);
    const target = spec(move);
    const nextStep = forward ? shownStep.current + 1 : shownStep.current - 1;
    const selected = [...cubies.current.values()].filter((group) => {
      const grid = group.userData.grid as THREE.Vector3;
      return Math.round(grid[target.axis]) === target.layer;
    });

    pivot.current.rotation.set(0, 0, 0);
    pivot.current.updateMatrixWorld(true);
    selected.forEach((group) => pivot.current?.attach(group));
    animation.current = { ...target, startedAt: performance.now(), nextStep, cubies: selected };
    onAnimating(true);
  }, [step, solution, onAnimating]);

  useFrame(() => {
    const current = animation.current;
    const root = cubeRoot.current;
    const turnGroup = pivot.current;
    if (!current || !root || !turnGroup) return;

    const t = Math.min(1, (performance.now() - current.startedAt) / 460);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    turnGroup.rotation.set(0, 0, 0);
    turnGroup.rotation[current.axis] = current.angle * eased;

    if (t >= 1) {
      current.cubies.forEach((group) => {
        root.attach(group);
        group.position.set(Math.round(group.position.x), Math.round(group.position.y), Math.round(group.position.z));
        group.userData.grid = group.position.clone();
        group.quaternion.normalize();
      });
      turnGroup.rotation.set(0, 0, 0);
      shownStep.current = current.nextStep;
      animation.current = null;
      onAnimating(false);
    }
  });

  return (
    <>
      <hemisphereLight args={["#ffffff", "#18345f", 1.5]} />
      <directionalLight position={[5, 8, 7]} intensity={1.8} />
      <directionalLight position={[-5, 3, 4]} intensity={0.8} color="#9fd8ff" />
      <group ref={cubeRoot} rotation={[-0.08, -0.08, 0]} scale={0.9}>
        {CELLS.map((cell) => <Cubie key={`${initialFacelets}:${cell.x}:${cell.y}:${cell.z}`} cell={cell} facelets={initialFacelets} register={register} />)}
        <group ref={pivot} />
      </group>
      <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={Math.PI / 4.5} maxPolarAngle={(3.4 * Math.PI) / 4.5} />
    </>
  );
}

export default function SolverCube3D({ scramble, solution, step, onAnimating }: { scramble: string; solution: string[]; step: number; onAnimating: (value: boolean) => void }) {
  const sceneKey = useMemo(() => toFaceletString(applySequence(solved(), scramble)), [scramble]);
  return (
    <Canvas camera={{ position: [4.4, 3.5, 5.1], fov: 36 }} dpr={[1, 1.35]} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} style={{ background: "transparent" }}>
      <Scene key={sceneKey} scramble={scramble} solution={solution} step={step} onAnimating={onAnimating} />
    </Canvas>
  );
}
