"use client";

/**
 * Stable solver-playback cube.
 *
 * The important rule in this version is that a cubie is never re-parented.
 * Every physical cubie stays directly under `cubeRoot` for its entire lifetime.
 * A face turn is displayed by multiplying the selected cubies' exact starting
 * matrices by a temporary rotation matrix. When the animation finishes, the
 * result is snapped back to the cube's discrete coordinate system: every matrix
 * entry is exactly -1, 0, or 1 and every position is exactly -1, 0, or 1.
 *
 * That removes the two causes of the folding/drifting bug:
 * 1. accumulated floating-point quaternion error; and
 * 2. repeated attach/detach operations through a rotated/scaled parent.
 */
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, RoundedBox } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useRef } from "react";
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
type CubieRecord = { group: THREE.Group; matrix: THREE.Matrix4 };
type Animation = MoveSpec & {
  startedAt: number;
  nextStep: number;
  cubies: CubieRecord[];
};

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
  const index = axis === "x" ? 12 : axis === "y" ? 13 : 14;
  return matrix.elements[index];
}

function snapCubeMatrix(matrix: THREE.Matrix4) {
  const snapped = matrix.clone();
  const elements = snapped.elements;
  const orientationIndexes = [0, 1, 2, 4, 5, 6, 8, 9, 10];

  orientationIndexes.forEach((index) => {
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

function Cubie({ cell, facelets, register }: { cell: Cell; facelets: string; register: (key: string, group: THREE.Group | null) => void }) {
  const { x, y, z } = cell;
  const key = `${x}:${y}:${z}`;

  return (
    <group
      ref={(group) => register(key, group)}
      matrixAutoUpdate={false}
      matrix={new THREE.Matrix4().makeTranslation(x, y, z)}
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
  const cubies = useRef(new Map<string, THREE.Group>());
  const shownStep = useRef(0);
  const animation = useRef<Animation | null>(null);

  const register = useCallback((key: string, group: THREE.Group | null) => {
    if (group) cubies.current.set(key, group);
    else cubies.current.delete(key);
  }, []);

  useEffect(() => {
    shownStep.current = 0;
    animation.current = null;
    onAnimating(false);
  }, [initialFacelets, onAnimating]);

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
    onAnimating(true);
  }, [step, solution, onAnimating]);

  useFrame(() => {
    const current = animation.current;
    if (!current) return;

    const elapsed = performance.now() - current.startedAt;
    const t = Math.min(1, elapsed / 460);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const animatedRotation = rotationMatrix(current.axis, current.angle * eased);

    current.cubies.forEach(({ group, matrix }) => {
      group.matrix.multiplyMatrices(animatedRotation, matrix);
      group.matrixWorldNeedsUpdate = true;
    });

    if (t >= 1) {
      const completedRotation = rotationMatrix(current.axis, current.angle);

      current.cubies.forEach(({ group, matrix }) => {
        const exactResult = snapCubeMatrix(new THREE.Matrix4().multiplyMatrices(completedRotation, matrix));
        group.matrix.copy(exactResult);
        group.matrixWorldNeedsUpdate = true;
      });

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
      <group rotation={[-0.08, -0.08, 0]} scale={0.9}>
        {CELLS.map((cell) => (
          <Cubie key={`${initialFacelets}:${cell.x}:${cell.y}:${cell.z}`} cell={cell} facelets={initialFacelets} register={register} />
        ))}
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
