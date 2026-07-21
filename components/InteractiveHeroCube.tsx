"use client";

/**
 * Homepage-only interactive cube. Tapping an exposed sticker queues a real face
 * turn while dragging still rotates the camera. It uses the same permanent-matrix
 * animation model as the production solver, so it remains flash-free and stable.
 */
import { Canvas, ThreeEvent, useFrame } from "@react-three/fiber";
import { OrbitControls, RoundedBox } from "@react-three/drei";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type Axis = "x" | "y" | "z";
type Cell = { x: number; y: number; z: number };
type MoveSpec = { axis: Axis; layer: -1 | 1; angle: number };
type Animation = MoveSpec & { startedAt: number; nextStep: number; cubies: { group: THREE.Group; matrix: THREE.Matrix4 }[] };

const COLORS: Record<string, string> = { U: "#f7f7f2", R: "#e53935", F: "#24c45a", D: "#ffd21f", L: "#ff7a18", B: "#1464e8" };
const MOVE: Record<string, { axis: Axis; layer: -1 | 1; clockwise: number }> = {
  U: { axis: "y", layer: 1, clockwise: -1 }, D: { axis: "y", layer: -1, clockwise: 1 },
  F: { axis: "z", layer: 1, clockwise: -1 }, B: { axis: "z", layer: -1, clockwise: 1 },
  R: { axis: "x", layer: 1, clockwise: -1 }, L: { axis: "x", layer: -1, clockwise: 1 },
};
const CELLS: Cell[] = [];
for (let x = -1; x <= 1; x += 1) for (let y = -1; y <= 1; y += 1) for (let z = -1; z <= 1; z += 1) CELLS.push({ x, y, z });

const invert = (move: string) => move.endsWith("2") ? move : move.endsWith("'") ? move[0] : `${move}'`;
function spec(move: string): MoveSpec { const base = MOVE[move[0]]; const turns = move.endsWith("2") ? 2 : move.endsWith("'") ? -1 : 1; return { ...base, angle: base.clockwise * turns * Math.PI / 2 }; }
function rotation(axis: Axis, angle: number) { return axis === "x" ? new THREE.Matrix4().makeRotationX(angle) : axis === "y" ? new THREE.Matrix4().makeRotationY(angle) : new THREE.Matrix4().makeRotationZ(angle); }
function coordinate(matrix: THREE.Matrix4, axis: Axis) { return matrix.elements[axis === "x" ? 12 : axis === "y" ? 13 : 14]; }
function snap(matrix: THREE.Matrix4) { const out = matrix.clone(), e = out.elements; for (const i of [0,1,2,4,5,6,8,9,10]) e[i] = Math.abs(e[i]) < .5 ? 0 : e[i] > 0 ? 1 : -1; e[12] = Math.round(e[12]); e[13] = Math.round(e[13]); e[14] = Math.round(e[14]); e[3] = e[7] = e[11] = 0; e[15] = 1; return out; }

function Sticker({ face, color, position, rotation: turn = [0,0,0], onFaceTap }: { face: string; color: string; position: [number,number,number]; rotation?: [number,number,number]; onFaceTap: (face: string) => void }) {
  const tap = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); if (event.delta < 7) onFaceTap(face); };
  return <RoundedBox args={[.76,.76,.045]} radius={.055} smoothness={3} position={position} rotation={turn} onClick={tap}><meshStandardMaterial color={color} roughness={.3} metalness={.02} emissive={color} emissiveIntensity={.035}/></RoundedBox>;
}

const Cubie = memo(function Cubie({ cell, register, onFaceTap }: { cell: Cell; register: (key: string, group: THREE.Group | null) => void; onFaceTap: (face: string) => void }) {
  const { x,y,z } = cell, key = `${x}:${y}:${z}`;
  const matrix = useMemo(() => new THREE.Matrix4().makeTranslation(x,y,z), [x,y,z]);
  const setGroup = useCallback((group: THREE.Group | null) => register(key, group), [key, register]);
  return <group ref={setGroup} matrixAutoUpdate={false} matrix={matrix}>
    <RoundedBox args={[.9,.9,.9]} radius={.075} smoothness={3}><meshStandardMaterial color="#111318" roughness={.38} metalness={.08}/></RoundedBox>
    {x===1&&<Sticker face="R" color={COLORS.R} position={[.468,0,0]} rotation={[0,Math.PI/2,0]} onFaceTap={onFaceTap}/>} {x===-1&&<Sticker face="L" color={COLORS.L} position={[-.468,0,0]} rotation={[0,Math.PI/2,0]} onFaceTap={onFaceTap}/>} {y===1&&<Sticker face="U" color={COLORS.U} position={[0,.468,0]} rotation={[Math.PI/2,0,0]} onFaceTap={onFaceTap}/>} {y===-1&&<Sticker face="D" color={COLORS.D} position={[0,-.468,0]} rotation={[Math.PI/2,0,0]} onFaceTap={onFaceTap}/>} {z===1&&<Sticker face="F" color={COLORS.F} position={[0,0,.468]} onFaceTap={onFaceTap}/>} {z===-1&&<Sticker face="B" color={COLORS.B} position={[0,0,-.468]} onFaceTap={onFaceTap}/>} 
  </group>;
});

function Scene({ moves, step, onFaceTap, onAnimating }: { moves: string[]; step: number; onFaceTap: (face: string) => void; onAnimating: (value: boolean) => void }) {
  const cubies = useRef(new Map<string, THREE.Group>()), shown = useRef(0), active = useRef<Animation | null>(null), callback = useRef(onAnimating), faceTap = useRef(onFaceTap);
  const [settle, setSettle] = useState(0);
  useEffect(() => { callback.current = onAnimating; }, [onAnimating]);
  useEffect(() => { faceTap.current = onFaceTap; }, [onFaceTap]);
  const register = useCallback((key: string, group: THREE.Group | null) => { if (group) cubies.current.set(key, group); else cubies.current.delete(key); }, []);
  useEffect(() => {
    if (step === shown.current || active.current) return;
    const forward = step > shown.current, move = forward ? moves[shown.current] : invert(moves[shown.current - 1]); if (!move) return;
    const target = spec(move), nextStep = forward ? shown.current + 1 : shown.current - 1;
    const selected = Array.from(cubies.current.values()).filter(group => Math.round(coordinate(group.matrix, target.axis)) === target.layer).map(group => ({ group, matrix: group.matrix.clone() }));
    if (selected.length !== 9) return;
    active.current = { ...target, startedAt: performance.now(), nextStep, cubies: selected }; callback.current(true);
  }, [step, moves, settle]);
  useFrame(() => {
    const current = active.current; if (!current) return;
    const t = Math.min(1, (performance.now() - current.startedAt) / 380), eased = t < .5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2, turn = rotation(current.axis, current.angle * eased);
    for (const item of current.cubies) { item.group.matrix.multiplyMatrices(turn, item.matrix); item.group.matrixWorldNeedsUpdate = true; }
    if (t >= 1) { const done = rotation(current.axis, current.angle); for (const item of current.cubies) { item.group.matrix.copy(snap(new THREE.Matrix4().multiplyMatrices(done, item.matrix))); item.group.matrixWorldNeedsUpdate = true; } shown.current = current.nextStep; active.current = null; callback.current(false); setSettle(value => value + 1); }
  });
  return <><hemisphereLight args={["#fff","#18345f",1.65]}/><directionalLight position={[5,8,7]} intensity={2.15}/><directionalLight position={[-5,3,4]} intensity={1.15} color="#9fd8ff"/><group rotation={[-.08,-.08,0]} scale={.9}>{CELLS.map(cell => <Cubie key={`${cell.x}:${cell.y}:${cell.z}`} cell={cell} register={register} onFaceTap={(face) => faceTap.current(face)}/>)}</group><OrbitControls enablePan={false} enableZoom={false} minPolarAngle={Math.PI/4.5} maxPolarAngle={3.4*Math.PI/4.5}/></>;
}

export default function InteractiveHeroCube(props: { moves: string[]; step: number; onFaceTap: (face: string) => void; onAnimating: (value: boolean) => void }) {
  return <Canvas camera={{ position:[4.4,3.5,5.1], fov:36 }} dpr={[1,1.5]} gl={{ antialias:true, alpha:true, powerPreference:"high-performance" }} style={{ background:"transparent", touchAction:"none" }}><Scene {...props}/></Canvas>;
}
