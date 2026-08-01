"use client";

/**
 * Standalone 3D Skewb renderer (rev3).
 *
 * Independent of every other cube renderer. Piece solids come from the same
 * first-principles geometry as lib/skewb3-engine (a cube cut by four planes →
 * 8 corner solids + 6 centre pyramids), so what is drawn always matches what
 * the engine computes. Stickers are inset and coloured straight from engine
 * state; twisting is a swipe on a corner (drag on empty space orbits the
 * camera). Turns animate with the same 460 ms cubic ease as the other cubes,
 * then the parent commits the move so the reset is seamless.
 */
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  SLOTS, FACES, type Face, type MoveAxis, type SkewbState, type Vec3,
} from "@/lib/skewb3-engine";

// Match the shared cube palette used across the app (U R F D L B).
const COLOR: Record<Face, string> = {
  U: "#f7f7f2", R: "#e53935", F: "#24c45a", D: "#ffd21f", L: "#ff7a18", B: "#1464e8",
};
const AXIS_CORNER: Record<MoveAxis, Vec3> = { R: [1, 1, 1], L: [-1, 1, 1], U: [1, 1, -1], B: [-1, 1, -1] };

const vEq = (a: Vec3, b: Vec3) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cornerName = (c: Vec3) => (Object.keys(AXIS_CORNER) as MoveAxis[]).find((k) => vEq(AXIS_CORNER[k], c));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const TURN_MS = 460;

type StickerDef = { slot: number; color: Face; verts: Vec3[]; normal: Vec3 };
type PieceDef = {
  rep: Vec3;
  topAxis: MoveAxis | null; // the corner is a twistable tip of this axis
  body: Vec3[][];
  stickers: StickerDef[];
};

function buildPieces(): PieceDef[] {
  const pieces: PieceDef[] = [];
  const CORNERS: Vec3[] = [];
  for (const x of [-1, 1] as const) for (const y of [-1, 1] as const) for (const z of [-1, 1] as const) CORNERS.push([x, y, z]);
  const O: Vec3 = [0, 0, 0];
  const slotFor = (kind: "center" | "corner", face: Face, corner?: Vec3) =>
    SLOTS.find((s) => s.kind === kind && s.face === face && (kind === "center" || vEq(s.corner!, corner!)))!.index;

  for (const c of CORNERS) {
    const mids: Vec3[] = [[0, c[1], c[2]], [c[0], 0, c[2]], [c[0], c[1], 0]];
    const facesAt: { face: Face; axis: 0 | 1 | 2 }[] = [];
    if (c[1] === 1) facesAt.push({ face: "U", axis: 1 });
    if (c[1] === -1) facesAt.push({ face: "D", axis: 1 });
    if (c[0] === 1) facesAt.push({ face: "R", axis: 0 });
    if (c[0] === -1) facesAt.push({ face: "L", axis: 0 });
    if (c[2] === 1) facesAt.push({ face: "F", axis: 2 });
    if (c[2] === -1) facesAt.push({ face: "B", axis: 2 });
    const stickers: StickerDef[] = facesAt.map(({ face, axis }) => {
      const tri = [c, ...mids.filter((m) => m[axis] === c[axis])] as Vec3[];
      return { slot: slotFor("corner", face, c), color: face, verts: tri, normal: SLOTS.find((s) => s.kind === "corner" && s.face === face && vEq(s.corner!, c))!.normal };
    });
    const body: Vec3[][] = stickers.map((s) => s.verts.slice());
    body.push([O, mids[0], mids[1]], [O, mids[1], mids[2]], [O, mids[2], mids[0]]);
    pieces.push({ rep: c, topAxis: cornerName(c) ?? null, body, stickers });
  }

  for (const face of FACES) {
    const n = SLOTS.find((s) => s.kind === "center" && s.face === face)!.normal;
    const mids: Vec3[] = [];
    for (const c of CORNERS) {
      const on = (n[0] !== 0 && c[0] === n[0]) || (n[1] !== 0 && c[1] === n[1]) || (n[2] !== 0 && c[2] === n[2]);
      if (!on) continue;
      for (let a = 0; a < 3; a++) {
        if (n[a] !== 0) continue;
        const m: [number, number, number] = [c[0], c[1], c[2]];
        m[a] = 0;
        if (!mids.some((x) => vEq(x, m))) mids.push(m);
      }
    }
    const uAxis = n[1] !== 0 ? 0 : n[0] !== 0 ? 2 : 0;
    const vAxis = n[1] !== 0 ? 2 : 1;
    mids.sort((p, q) => Math.atan2(p[vAxis], p[uAxis]) - Math.atan2(q[vAxis], q[uAxis]));
    const diamond: Vec3[][] = [[mids[0], mids[1], mids[2]], [mids[0], mids[2], mids[3]]];
    const stickers: StickerDef[] = [{ slot: slotFor("center", face), color: face, verts: [mids[0], mids[1], mids[2], mids[3]], normal: [n[0], n[1], n[2]] }];
    const body: Vec3[][] = [...diamond];
    for (let i = 0; i < 4; i++) body.push([[0, 0, 0], mids[i], mids[(i + 1) % 4]]);
    pieces.push({ rep: [n[0], n[1], n[2]], topAxis: null, body, stickers });
  }
  return pieces;
}

function triGeometry(tris: Vec3[][]): THREE.BufferGeometry {
  const pos: number[] = [];
  for (const t of tris) for (const v of t) pos.push(v[0], v[1], v[2]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
// inset polygon (fan), lifted slightly along the outward normal, shrunk toward
// its centroid so the black body shows as a thin gap between stickers
function stickerGeometry(verts: Vec3[], outward: Vec3): THREE.BufferGeometry {
  const cx = verts.reduce((a, v) => a + v[0], 0) / verts.length;
  const cy = verts.reduce((a, v) => a + v[1], 0) / verts.length;
  const cz = verts.reduce((a, v) => a + v[2], 0) / verts.length;
  const lift = new THREE.Vector3(...outward).normalize().multiplyScalar(0.03);
  const inset = 0.9;
  const pts = verts.map((v) => new THREE.Vector3(
    cx + (v[0] - cx) * inset, cy + (v[1] - cy) * inset, cz + (v[2] - cz) * inset,
  ).add(lift));
  const pos: number[] = [];
  for (let i = 1; i < pts.length - 1; i++) for (const p of [pts[0], pts[i], pts[i + 1]]) pos.push(p.x, p.y, p.z);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

type Anim = { axis: MoveAxis; dir: 1 | -1; onDone: () => void } | null;

function Piece({ def, state, onGrab }: {
  def: PieceDef; state: SkewbState;
  onGrab: (axis: MoveAxis, e: ThreeEvent<PointerEvent>) => void;
}) {
  const bodyGeo = useMemo(() => triGeometry(def.body), [def]);
  const stickerGeos = useMemo(() => def.stickers.map((s) => stickerGeometry(s.verts, s.normal)), [def]);
  return (
    <group onPointerDown={def.topAxis ? (e) => { e.stopPropagation(); onGrab(def.topAxis!, e); } : undefined}>
      <mesh geometry={bodyGeo}>
        <meshStandardMaterial color="#080a10" roughness={0.6} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>
      {def.stickers.map((s, i) => (
        <mesh key={i} geometry={stickerGeos[i]}>
          <meshStandardMaterial color={COLOR[state[s.slot]]} roughness={0.35} metalness={0.04} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function Scene({ state, anim, onTwist }: {
  state: SkewbState; anim: Anim; onTwist: (axis: MoveAxis, dir: 1 | -1) => void;
}) {
  const pieces = useMemo(buildPieces, []);
  const pivot = useRef<THREE.Group>(null);
  const startedAt = useRef<number | null>(null);
  const { camera, size, gl } = useThree();
  const controls = useRef<{ enabled: boolean } | null>(null);

  const movingSet = useMemo(() => {
    const s = new Set<PieceDef>();
    if (anim) for (const p of pieces) if (dot(p.rep, AXIS_CORNER[anim.axis]) > 1e-9) s.add(p);
    return s;
  }, [anim, pieces]);

  useFrame(() => {
    if (!pivot.current) return;
    if (!anim) { pivot.current.quaternion.identity(); startedAt.current = null; return; }
    if (startedAt.current === null) startedAt.current = performance.now();
    const t = Math.min(1, (performance.now() - startedAt.current) / TURN_MS);
    const angle = anim.dir * easeInOut(t) * (2 * Math.PI) / 3;
    pivot.current.quaternion.setFromAxisAngle(new THREE.Vector3(...AXIS_CORNER[anim.axis]).normalize(), angle);
    if (t >= 1) { startedAt.current = null; anim.onDone(); }
  });

  // swipe-to-twist: grab a corner, drag; direction inferred by projecting the
  // corner's motion under a small +twist and comparing with the drag vector.
  const gesture = useRef<{ axis: MoveAxis; contact: THREE.Vector3; sx: number; sy: number } | null>(null);
  const toScreen = (v: THREE.Vector3) => {
    const p = v.clone().project(camera);
    return { x: (p.x * 0.5 + 0.5) * size.width, y: (-p.y * 0.5 + 0.5) * size.height };
  };
  const onGrab = (axis: MoveAxis, e: ThreeEvent<PointerEvent>) => {
    if (anim) return;
    gesture.current = { axis, contact: e.point.clone(), sx: e.clientX, sy: e.clientY };
    if (controls.current) controls.current.enabled = false;
  };
  const endGestureRef = useRef<(x: number, y: number) => void>(() => {});
  endGestureRef.current = (clientX: number, clientY: number) => {
    const g = gesture.current;
    gesture.current = null;
    if (controls.current) controls.current.enabled = true;
    if (!g) return;
    const dx = clientX - g.sx, dy = clientY - g.sy;
    if (Math.hypot(dx, dy) < 10) return; // a tap, not a swipe
    const axisVec = new THREE.Vector3(...AXIS_CORNER[g.axis]).normalize();
    const rotated = g.contact.clone().applyAxisAngle(axisVec, 0.35);
    const a = toScreen(g.contact), b = toScreen(rotated);
    const tanx = b.x - a.x, tany = b.y - a.y; // screen tangent of a +twist
    const dir: 1 | -1 = dx * tanx + dy * tany >= 0 ? 1 : -1;
    onTwist(g.axis, dir);
  };

  // window-level pointer up so a swipe that leaves the canvas still resolves
  useEffect(() => {
    const up = (e: PointerEvent) => { if (gesture.current) endGestureRef.current(e.clientX, e.clientY); };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);
  void gl;

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[6, 9, 7]} intensity={1.05} />
      <directionalLight position={[-6, -3, -6]} intensity={0.3} />
      <group scale={1.12} rotation={[-0.05, 0, 0]}>
        <group>
          {pieces.filter((p) => !movingSet.has(p)).map((p, i) => <Piece key={`s${i}`} def={p} state={state} onGrab={onGrab} />)}
        </group>
        <group ref={pivot}>
          {pieces.filter((p) => movingSet.has(p)).map((p, i) => <Piece key={`m${i}`} def={p} state={state} onGrab={onGrab} />)}
        </group>
      </group>
      <OrbitControls ref={(c) => { controls.current = c as unknown as { enabled: boolean } | null; }} enablePan={false} enableZoom={false} rotateSpeed={0.85} />
    </>
  );
}

export default function SkewbRev3Cube({ state, anim, onTwist }: {
  state: SkewbState; anim: Anim; onTwist: (axis: MoveAxis, dir: 1 | -1) => void;
}) {
  return (
    <Canvas camera={{ position: [3.2, 2.7, 3.9], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true }}>
      <Scene state={state} anim={anim} onTwist={onTwist} />
    </Canvas>
  );
}

export type { Anim };
