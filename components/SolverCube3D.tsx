"use client";

/**
 * Solver playback cube.
 *
 * Every cubie remains mounted. The moving layer keeps its pre-move sticker state
 * while rotating. At the end of a move, the updated base cube is rendered behind
 * the still-visible moving layer for two frames before the duplicate layer is
 * hidden. That two-phase handoff prevents the visible flash caused by changing
 * colors and visibility in the same render.
 */
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, RoundedBox } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { applySequence, solved, toFaceletString } from "@/lib/cube-engine";

const COLOR: Record<string, string> = {
  U: "#f7f7f2", R: "#e53935", F: "#24c45a",
  D: "#ffd21f", L: "#ff7a18", B: "#1464e8",
};

type Vec3 = [number, number, number];
type Axis = "x" | "y" | "z";
type MoveSpec = { axis: Axis; layer: -1 | 0 | 1; angle: number };
type Cell = { x: number; y: number; z: number };
type ActiveMove = MoveSpec & {
  nextFacelets: string;
  nextStep: number;
  startedAt: number;
  settling: boolean;
  settleFrames: number;
};

const MOVE: Record<string, Omit<MoveSpec, "angle"> & { clockwise: number }> = {
  U: { axis: "y", layer: 1, clockwise: -1 }, D: { axis: "y", layer: -1, clockwise: 1 },
  F: { axis: "z", layer: 1, clockwise: -1 }, B: { axis: "z", layer: -1, clockwise: 1 },
  R: { axis: "x", layer: 1, clockwise: -1 }, L: { axis: "x", layer: -1, clockwise: 1 },
};

const CELLS: Cell[] = [];
for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) CELLS.push({ x, y, z });

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

function Cubie({ x, y, z, facelets, visible = true }: Cell & { facelets: string; visible?: boolean }) {
  return (
    <group position={[x, y, z]} visible={visible}>
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
  const initial = useMemo(() => toFaceletString(applySequence(solved(), scramble)), [scramble]);
  const [facelets, setFacelets] = useState(initial);
  const [movingFacelets, setMovingFacelets] = useState(initial);
  const [active, setActive] = useState<MoveSpec | null>(null);
  const shownStep = useRef(0);
  const layerRef = useRef<THREE.Group>(null);
  const animation = useRef<ActiveMove | null>(null);

  useEffect(() => {
    setFacelets(initial);
    setMovingFacelets(initial);
    setActive(null);
    shownStep.current = 0;
    animation.current = null;
    if (layerRef.current) layerRef.current.rotation.set(0, 0, 0);
    onAnimating(false);
  }, [initial, onAnimating]);

  useEffect(() => {
    if (step === shownStep.current || animation.current) return;

    const forward = step > shownStep.current;
    const move = forward ? solution[shownStep.current] : invert(solution[shownStep.current - 1]);
    const target = spec(move);
    const nextStep = forward ? shownStep.current + 1 : shownStep.current - 1;
    const nextFacelets = toFaceletString(
      applySequence(solved(), [scramble, ...solution.slice(0, nextStep)].filter(Boolean).join(" ")),
    );

    if (layerRef.current) layerRef.current.rotation.set(0, 0, 0);
    setMovingFacelets(facelets);
    setActive(target);
    animation.current = {
      ...target,
      nextFacelets,
      nextStep,
      startedAt: performance.now(),
      settling: false,
      settleFrames: 0,
    };
    onAnimating(true);
  }, [step, solution, scramble, onAnimating, facelets]);

  useFrame(() => {
    const current = animation.current;
    const group = layerRef.current;
    if (!current || !group) return;

    if (current.settling) {
      current.settleFrames += 1;
      if (current.settleFrames >= 2) {
        shownStep.current = current.nextStep;
        animation.current = null;
        setActive(null);
        group.rotation.set(0, 0, 0);
        onAnimating(false);
      }
      return;
    }

    const t = Math.min(1, (performance.now() - current.startedAt) / 460);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    group.rotation.set(0, 0, 0);
    group.rotation[current.axis] = current.angle * eased;

    if (t >= 1) {
      current.settling = true;
      current.settleFrames = 0;
      setFacelets(current.nextFacelets);
      // Keep the old, fully rotated moving layer visible while the new base state
      // renders beneath it. The layer is hidden two frames later.
    }
  });

  const inLayer = (cell: Cell) => active ? cell[active.axis] === active.layer : false;

  return (
    <>
      <hemisphereLight args={["#ffffff", "#18345f", 1.5]} />
      <directionalLight position={[5, 8, 7]} intensity={1.8} />
      <directionalLight position={[-5, 3, 4]} intensity={0.8} color="#9fd8ff" />
      <group rotation={[-0.08, -0.08, 0]} scale={0.9}>
        {CELLS.map((cell) => (
          <Cubie key={`base:${cell.x}:${cell.y}:${cell.z}`} {...cell} facelets={facelets} visible={!inLayer(cell)} />
        ))}
        <group ref={layerRef}>
          {CELLS.map((cell) => (
            <Cubie key={`move:${cell.x}:${cell.y}:${cell.z}`} {...cell} facelets={movingFacelets} visible={Boolean(active && inLayer(cell))} />
          ))}
        </group>
      </group>
      <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={Math.PI / 4.5} maxPolarAngle={(3.4 * Math.PI) / 4.5} />
    </>
  );
}

export default function SolverCube3D({ scramble, solution, step, onAnimating }: { scramble: string; solution: string[]; step: number; onAnimating: (value: boolean) => void }) {
  return (
    <Canvas camera={{ position: [4.4, 3.5, 5.1], fov: 36 }} dpr={[1, 1.35]} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} style={{ background: "transparent" }}>
      <Scene scramble={scramble} solution={solution} step={step} onAnimating={onAnimating} />
    </Canvas>
  );
}
