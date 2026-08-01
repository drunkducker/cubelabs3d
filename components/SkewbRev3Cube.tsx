"use client";

/**
 * Standalone 3D Skewb renderer (rev3).
 *
 * Independent of every other cube renderer in the app. The piece solids are
 * derived from the same first-principles geometry as lib/skewb3-engine (a cube
 * cut by four planes through its centre → 8 corner solids + 6 centre pyramids),
 * so what is drawn always matches what the engine computes. Stickers are
 * coloured straight from engine state; a twist animates by rotating the moving
 * pieces about their body diagonal, then the parent commits the move so the
 * reset is seamless.
 */
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  SLOTS, FACES, MOVE_AXES, type Face, type MoveAxis, type Move, type SkewbState, type Vec3,
} from "@/lib/skewb3-engine";

const COLOR: Record<Face, string> = {
  U: "#f6f7fb", D: "#ffd21f", F: "#22c55e", B: "#2563eb", R: "#ef4444", L: "#ff7a18",
};
const AXIS_CORNER: Record<MoveAxis, Vec3> = { R: [1, 1, 1], L: [-1, 1, 1], U: [1, 1, -1], B: [-1, 1, -1] };

const vEq = (a: Vec3, b: Vec3) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cornerName = (c: Vec3) => (Object.keys(AXIS_CORNER) as MoveAxis[]).find((k) => vEq(AXIS_CORNER[k], c));

type StickerDef = { slot: number; color: Face; verts: Vec3[]; normal: Vec3 };
type PieceDef = {
  rep: Vec3;            // representative point deciding which half a move rotates
  topAxis: MoveAxis | null; // the move axis this piece is the tip of (top corners only)
  body: Vec3[][];      // black body triangles
  stickers: StickerDef[];
};

/** Build the 14 piece solids and tag each sticker with its engine slot. */
function buildPieces(): PieceDef[] {
  const pieces: PieceDef[] = [];
  const CORNERS: Vec3[] = [];
  for (const x of [-1, 1] as const) for (const y of [-1, 1] as const) for (const z of [-1, 1] as const) CORNERS.push([x, y, z]);
  const O: Vec3 = [0, 0, 0];
  const slotFor = (kind: "center" | "corner", face: Face, corner?: Vec3) =>
    SLOTS.find((s) => s.kind === kind && s.face === face && (kind === "center" || vEq(s.corner!, corner!)))!.index;

  // corner pieces
  for (const c of CORNERS) {
    const mids: Vec3[] = [[0, c[1], c[2]], [c[0], 0, c[2]], [c[0], c[1], 0]]; // adjacent edge midpoints
    const facesAt: { face: Face; axis: 0 | 1 | 2 }[] = [];
    if (c[1] === 1) facesAt.push({ face: "U", axis: 1 });
    if (c[1] === -1) facesAt.push({ face: "D", axis: 1 });
    if (c[0] === 1) facesAt.push({ face: "R", axis: 0 });
    if (c[0] === -1) facesAt.push({ face: "L", axis: 0 });
    if (c[2] === 1) facesAt.push({ face: "F", axis: 2 });
    if (c[2] === -1) facesAt.push({ face: "B", axis: 2 });
    const stickers: StickerDef[] = facesAt.map(({ face, axis }) => {
      // triangle on `face`: the corner + the two edge-mids sharing this face's fixed axis
      const tri = [c, ...mids.filter((m) => m[axis] === c[axis])] as Vec3[];
      return { slot: slotFor("corner", face, c), color: face, verts: tri, normal: SLOTS.find((s) => s.kind === "corner" && s.face === face && vEq(s.corner!, c))!.normal };
    });
    // body: 3 outer sticker triangles + 3 inner triangles to the centre
    const body: Vec3[][] = stickers.map((s) => s.verts.slice());
    body.push([O, mids[0], mids[1]], [O, mids[1], mids[2]], [O, mids[2], mids[0]]);
    pieces.push({ rep: c, topAxis: c[1] === 1 ? cornerName(c) ?? null : null, body, stickers });
  }

  // centre pieces (square pyramid: diamond on the face + apex at cube centre)
  for (const face of FACES) {
    const n = SLOTS.find((s) => s.kind === "center" && s.face === face)!.normal;
    // the four edge midpoints on this face
    const mids: Vec3[] = [];
    for (const c of CORNERS) {
      const on = (n[0] !== 0 && c[0] === n[0]) || (n[1] !== 0 && c[1] === n[1]) || (n[2] !== 0 && c[2] === n[2]);
      if (!on) continue;
      // edge midpoints from this corner that lie on the face: zero one of the two free coords
      for (let a = 0; a < 3; a++) {
        if (n[a] !== 0) continue;
        const m: [number, number, number] = [c[0], c[1], c[2]];
        m[a] = 0;
        if (!mids.some((x) => vEq(x, m))) mids.push(m);
      }
    }
    // order the 4 mids around the diamond by angle in the face plane
    const center: Vec3 = [n[0], n[1], n[2]];
    const uAxis = n[1] !== 0 ? 0 : n[0] !== 0 ? 2 : 0; // pick two in-plane axes
    const vAxis = n[1] !== 0 ? 2 : 1;
    mids.sort((p, q) => Math.atan2(p[vAxis], p[uAxis]) - Math.atan2(q[vAxis], q[uAxis]));
    const diamond: Vec3[][] = [
      [mids[0], mids[1], mids[2]],
      [mids[0], mids[2], mids[3]],
    ];
    const stickers: StickerDef[] = [{ slot: slotFor("center", face), color: face, verts: [mids[0], mids[1], mids[2], mids[3]], normal: [n[0], n[1], n[2]] }];
    const body: Vec3[][] = [...diamond];
    for (let i = 0; i < 4; i++) body.push([[0, 0, 0], mids[i], mids[(i + 1) % 4]]);
    void center;
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
// polygon (fan) geometry, pushed slightly outward along the known face normal
function stickerGeometry(verts: Vec3[], outward: Vec3): THREE.BufferGeometry {
  const lift = new THREE.Vector3(...outward).normalize().multiplyScalar(0.02);
  const pts = verts.map((v) => new THREE.Vector3(v[0], v[1], v[2]).add(lift));
  const pos: number[] = [];
  for (let i = 1; i < pts.length - 1; i++) {
    for (const p of [pts[0], pts[i], pts[i + 1]]) pos.push(p.x, p.y, p.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

type Anim = { axis: MoveAxis; dir: 1 | -1; onDone: () => void } | null;

function Piece({ def, state, onGrab }: { def: PieceDef; state: SkewbState; onGrab: (axis: MoveAxis, e: ThreeEvent<MouseEvent>) => void }) {
  const bodyGeo = useMemo(() => triGeometry(def.body), [def]);
  const stickerGeos = useMemo(() => def.stickers.map((s) => stickerGeometry(s.verts, s.normal)), [def]);
  return (
    <group
      onPointerDown={def.topAxis ? (e) => { e.stopPropagation(); onGrab(def.topAxis!, e); } : undefined}
    >
      <mesh geometry={bodyGeo}>
        <meshStandardMaterial color="#0b0d12" roughness={0.55} metalness={0.15} side={THREE.DoubleSide} />
      </mesh>
      {def.stickers.map((s, i) => (
        <mesh key={i} geometry={stickerGeos[i]}>
          <meshStandardMaterial color={COLOR[state[s.slot]]} roughness={0.32} metalness={0.05} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function Scene({ state, anim, onGrab }: { state: SkewbState; anim: Anim; onGrab: (axis: MoveAxis, e: ThreeEvent<MouseEvent>) => void }) {
  const pieces = useMemo(buildPieces, []);
  const pivot = useRef<THREE.Group>(null);
  const progress = useRef(0);

  const movingSet = useMemo(() => {
    if (!anim) return new Set<PieceDef>();
    const s = new Set<PieceDef>();
    for (const p of pieces) if (dot(p.rep, AXIS_CORNER[anim.axis]) > 1e-9) s.add(p);
    return s;
  }, [anim, pieces]);

  useFrame((_, delta) => {
    if (!pivot.current) return;
    if (!anim) { progress.current = 0; pivot.current.quaternion.identity(); return; }
    progress.current = Math.min(1, progress.current + delta / 0.34);
    const angle = anim.dir * (progress.current * (2 * Math.PI) / 3);
    const axis = new THREE.Vector3(...AXIS_CORNER[anim.axis]).normalize();
    pivot.current.quaternion.setFromAxisAngle(axis, angle);
    if (progress.current >= 1) { progress.current = 0; const done = anim.onDone; done(); }
  });

  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[6, 9, 7]} intensity={1.1} />
      <directionalLight position={[-6, -4, -6]} intensity={0.35} />
      <group scale={1.15}>
        <group>
          {pieces.filter((p) => !movingSet.has(p)).map((p, i) => (
            <Piece key={`s${i}`} def={p} state={state} onGrab={onGrab} />
          ))}
        </group>
        <group ref={pivot}>
          {pieces.filter((p) => movingSet.has(p)).map((p, i) => (
            <Piece key={`m${i}`} def={p} state={state} onGrab={onGrab} />
          ))}
        </group>
      </group>
    </>
  );
}

export default function SkewbRev3Cube({
  state, anim, onGrab,
}: {
  state: SkewbState;
  anim: Anim;
  onGrab: (axis: MoveAxis, e: ThreeEvent<MouseEvent>) => void;
}) {
  return (
    <Canvas camera={{ position: [3.4, 3.0, 3.8], fov: 38 }} dpr={[1, 2]} gl={{ antialias: true }}>
      <color attach="background" args={["#05070d"]} />
      <Scene state={state} anim={anim} onGrab={onGrab} />
      <OrbitControls enablePan={false} enableZoom={false} rotateSpeed={0.9} />
    </Canvas>
  );
}

export { MOVE_AXES };
export type { Anim };
