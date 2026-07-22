"use client";

/**
 * Playable + solver Pyraminx engine, mirroring app/NxNCubeGame.tsx's shape:
 * one raw three.js scene, a turn queue driving pivot-group animations, and
 * an actionsRef exposing imperative controls to the React shell below.
 *
 * All puzzle GEOMETRY (vertices, faces, edges, which piece touches which
 * face) and all discrete MOVE/SOLVE logic come from lib/pyraminx-engine.ts,
 * which is independently verified (see the round-trip tests referenced in
 * CUBE-ENGINE-NOTES.md). This component's own job is narrow: place sticker
 * triangles at the right spots and physically turn the right pieces —
 * it does not re-derive any combinatorics of its own.
 *
 * One geometric difference from the NxN cube engine matters here: a Pyraminx
 * turn axis passes through a VERTEX, not through a world X/Y/Z axis, so the
 * turn animation rotates each pivot group with
 * `quaternion.setFromAxisAngle(axis, angle)` instead of the NxN engine's
 * `pivot.rotation[axis] = angle` (which only works when axis is literally x/y/z).
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import SiteHeader from "@/components/SiteHeader";
import {
  VERTICES, FACE_VERTICES, FACE_COLORS, EDGE_PAIRS, EDGES_AT_VERTEX,
  solved as pyraSolved, applyMove as pyraApplyMove, isSolved as pyraIsSolved,
  randomScramble, solve as pyraSolve, parseMove,
  type PyraState, type PyraMove,
} from "@/lib/pyraminx-engine";

const toVec3 = (v: readonly [number, number, number]) => new THREE.Vector3(v[0], v[1], v[2]);
const TWO_PI_3 = (2 * Math.PI) / 3;

/**
 * Splits triangular face `faceIndex` into its 9 standard cells (a Pyraminx
 * face divided into 3 rows) using integer barycentric coordinates (denominator
 * n=3), and classifies each cell as belonging to a tip, an edge, or the
 * face's center piece. This exact classification rule (a cell touching one
 * of the face's 3 real corners is a tip cell; a cell with 2 corners sharing
 * a zero coordinate lies flush against one of the face's 3 real edges; the
 * remaining 3 cells belong to the center) was verified numerically before
 * being used here — see the barycentric-subdivision check referenced in
 * CUBE-ENGINE-NOTES.md — rather than assumed from a mental picture of the
 * puzzle, which is easy to get subtly wrong (this file's author did, once).
 */
function faceCells(faceIndex: number) {
  // FACE_VERTICES[k] lists 3 vertex indices with no guarantee they wind
  // counter-clockwise as seen from outside the tetrahedron — for a
  // tetrahedron specifically, "vertices other than k, in ascending index
  // order" alternates between CCW and CW depending on k's parity. Rendering
  // every face's triangles with whatever winding falls out of that ordering
  // left 2 of the 4 faces backwards: normals pointing inward, which THREE.js's
  // face culling reads as "facing the camera" whenever that face should
  // actually be hidden on the far side of the puzzle — the wrong face wins
  // the depth conversation and bleeds through the correct one. Verify the
  // winding against the face's true outward direction and swap two vertices
  // to correct it, rather than hardcoding which faces need it.
  let [vA, vB, vC] = FACE_VERTICES[faceIndex];
  const outwardCheck = toVec3(VERTICES[faceIndex]).multiplyScalar(-1);
  const rawA = toVec3(VERTICES[vA]), rawB = toVec3(VERTICES[vB]), rawC = toVec3(VERTICES[vC]);
  const windingNormal = new THREE.Vector3().subVectors(rawB, rawA).cross(new THREE.Vector3().subVectors(rawC, rawA));
  if (windingNormal.dot(outwardCheck) < 0) [vB, vC] = [vC, vB];

  const verts = [vA, vB, vC];
  const A = toVec3(VERTICES[vA]), B = toVec3(VERTICES[vB]), C = toVec3(VERTICES[vC]);
  const P = (i: number, j: number, k: number) =>
    new THREE.Vector3().addScaledVector(A, i / 3).addScaledVector(B, j / 3).addScaledVector(C, k / 3);

  type Cell = { corners: [THREE.Vector3, THREE.Vector3, THREE.Vector3]; target: { kind: "tip"; vertex: number } | { kind: "edge"; edge: number } | { kind: "center" } };
  const cells: Cell[] = [];

  const classify = (ijk: [number, number, number][]): Cell["target"] => {
    const tipPos = ijk.findIndex(c => c.some(v => v === 3));
    if (tipPos >= 0) {
      const axisIndex = ijk[tipPos].findIndex(v => v === 3);
      return { kind: "tip", vertex: verts[axisIndex] };
    }
    for (let pos = 0; pos < 3; pos++) {
      if (ijk.filter(c => c[pos] === 0).length >= 2) {
        const otherTwo = [0, 1, 2].filter(p => p !== pos).map(p => verts[p]);
        const [lo, hi] = otherTwo.sort((a, b) => a - b);
        const edge = EDGE_PAIRS.findIndex(([i, j]) => i === lo && j === hi);
        return { kind: "edge", edge };
      }
    }
    return { kind: "center" };
  };

  // 6 upward cells: i+j+k = 2.
  for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2 - i; j++) {
    const k = 2 - i - j;
    const ijk: [number, number, number][] = [[i + 1, j, k], [i, j + 1, k], [i, j, k + 1]];
    cells.push({ corners: [P(...ijk[0]), P(...ijk[1]), P(...ijk[2])], target: classify(ijk) });
  }
  // 3 downward cells: i+j+k = 1. Their natural corner order
  // ([i+1,j+1,k], [i+1,j,k+1], [i,j+1,k+1]) winds opposite to the upward
  // cells' — confirmed by computing both cells' cross-product normals
  // against the same reference and finding downward cells consistently
  // flipped, regardless of which face they're on. `classify` only cares
  // about the barycentric values, not their order, so it keeps the natural
  // ijk; only the rendered `corners` swap the last two to match upward
  // cells' winding.
  for (let i = 0; i <= 1; i++) for (let j = 0; j <= 1 - i; j++) {
    const k = 1 - i - j;
    const ijk: [number, number, number][] = [[i + 1, j + 1, k], [i + 1, j, k + 1], [i, j + 1, k + 1]];
    cells.push({ corners: [P(...ijk[0]), P(...ijk[2]), P(...ijk[1])], target: classify(ijk) });
  }
  return cells;
}

/**
 * Builds a shrunk (gapped) copy of `corners` sitting exactly on the true
 * face plane — no outward offset.
 *
 * An earlier version nudged the sticker outward along the face normal to
 * avoid it z-fighting with its own backing triangle underneath. That works
 * for a flat cube face, but a Pyraminx's 4 faces meet at a sharp ~70.5°
 * dihedral angle: near a shared vertex or edge, even a small outward push
 * can carry a sticker's geometry past the plane of the *neighboring* face,
 * making it visible where it shouldn't be — confirmed by reproducing the
 * bug and watching it get worse as the offset was increased, not better.
 * `polygonOffset` on the sticker material (set where it's created) resolves
 * the sticker/backing z-fight in depth-buffer space instead, so neither
 * layer ever actually leaves the true face plane and neither can overshoot
 * into a neighboring face.
 */
function triangleGeometry(corners: [THREE.Vector3, THREE.Vector3, THREE.Vector3], shrink: number) {
  const centroid = new THREE.Vector3().add(corners[0]).add(corners[1]).add(corners[2]).multiplyScalar(1 / 3);
  const positions = new Float32Array(9);
  corners.forEach((corner, i) => {
    const shrunk = new THREE.Vector3().lerpVectors(centroid, corner, shrink);
    positions[i * 3] = shrunk.x; positions[i * 3 + 1] = shrunk.y; positions[i * 3 + 2] = shrunk.z;
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export default function PyraminxGame({ variant = "full" }: { variant?: "full" | "focus" }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<{
    scramble: () => void; solveNow: () => void; resetPuzzle: () => void; resetView: () => void; turnLabel: (label: string) => void;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Pyraminx ready");
  const [moves, setMoves] = useState(0);
  const [isSolvedNow, setIsSolvedNow] = useState(true);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const focusLayout = variant === "focus";
    scene.background = focusLayout ? null : new THREE.Color("#080b14");
    const camera = new THREE.PerspectiveCamera(focusLayout ? 37 : 34, 1, 0.1, 100);
    const distance = 6.4;
    camera.position.set(distance * 0.82, distance * 0.68, distance);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.55));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearAlpha(0);
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.zoomSpeed = 0.8;
    controls.rotateSpeed = 0.75;
    controls.minDistance = 3.2;
    controls.maxDistance = 11;
    controls.target.set(0, 0, 0);
    controls.update();
    controls.saveState();

    scene.add(new THREE.HemisphereLight("#ffffff", "#223052", 2.2));
    const key = new THREE.DirectionalLight("#ffffff", 2.4); key.position.set(8, 12, 10); scene.add(key);
    const rim = new THREE.DirectionalLight("#5c7cff", 1.4); rim.position.set(-10, 3, -8); scene.add(rim);

    const root = new THREE.Group();
    scene.add(root);

    // 14 rigid piece groups: 4 tips + 6 edges + 4 centers. Every sticker cell
    // computed below gets added as a child of exactly one of these, so
    // turning a piece later is just "pivot this group."
    const tipGroups = [0, 1, 2, 3].map(() => { const g = new THREE.Group(); root.add(g); return g; });
    const edgeGroups = [0, 1, 2, 3, 4, 5].map(() => { const g = new THREE.Group(); root.add(g); return g; });
    const centerGroups = [0, 1, 2, 3].map(() => { const g = new THREE.Group(); root.add(g); return g; });

    const materials: THREE.Material[] = [];
    const geometries: THREE.BufferGeometry[] = [];
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: "#111318", roughness: 0.4, metalness: 0.06 });
    materials.push(bodyMaterial);

    for (let face = 0; face < 4; face++) {
      for (const cell of faceCells(face)) {
        const stickerGeo = triangleGeometry(cell.corners, 0.78);
        const backingGeo = triangleGeometry(cell.corners, 0.94);
        geometries.push(stickerGeo, backingGeo);
        const stickerMat = new THREE.MeshStandardMaterial({
          color: FACE_COLORS[face], roughness: 0.3, metalness: 0.02, emissive: FACE_COLORS[face], emissiveIntensity: 0.035,
          // Deliberately NOT THREE.DoubleSide. With winding verified correct
          // (see faceCells' comments), every sticker's front side already
          // faces outward. Rendering both sides let the FAR side of the
          // tetrahedron — normally hidden — show through the intentional
          // gaps between near-side stickers (the gaps have nothing blocking
          // that view once the near sticker doesn't cover the ray). Bright,
          // differently-lit interior surfaces bled through as streaks
          // exactly tracing the gap pattern. FrontSide culls those interior
          // faces properly, so only genuinely visible geometry renders.
          polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
        });
        materials.push(stickerMat);
        const sticker = new THREE.Mesh(stickerGeo, stickerMat);
        const backing = new THREE.Mesh(backingGeo, bodyMaterial);

        const group = cell.target.kind === "tip" ? tipGroups[cell.target.vertex]
          : cell.target.kind === "edge" ? edgeGroups[cell.target.edge]
          : centerGroups[face];
        group.add(backing);
        group.add(sticker);
      }
    }

    // ---- Turn machinery: mirrors NxNCubeGame's queue/runNext, but pivots
    // around an arbitrary vertex axis via quaternion instead of a world axis.
    let logicalState: PyraState = pyraSolved();
    let disposed = false;
    let moveFrame = 0;
    let active = false;
    const queue: PyraMove[] = [];

    // `edgeGroups[p]` is indexed by piece IDENTITY (its home slot at
    // construction), not by current position — a piece's colored stickers
    // never get reassigned, so the group itself is what physically moves
    // between slots as turns are made. Selecting "which pieces to turn" by
    // EDGES_AT_VERTEX[vertex] directly would grab whichever pieces call
    // this vertex home, not whichever pieces are actually sitting there
    // right now — correct only for a freshly-solved puzzle. After a single
    // scramble move it grabs the wrong pieces, and every following move
    // compounds the error, which is exactly why the puzzle still looked
    // scrambled after a "solve" that the logical engine verified as
    // correct: the logical state was right, but the wrong physical pieces
    // were being rotated the whole time. `logicalState.ep[slot]` gives the
    // piece CURRENTLY at each slot — same principle as NxNCubeGame
    // filtering cubies by current grid position rather than original index.
    const groupsForMove = (move: PyraMove): THREE.Group[] => {
      const groups = [tipGroups[move.vertex]];
      if (move.depth === "deep") {
        EDGES_AT_VERTEX[move.vertex].forEach(slot => groups.push(edgeGroups[logicalState.ep[slot]]));
      }
      return groups;
    };

    const runNext = () => {
      if (active || !queue.length) return;
      active = true; setBusy(true);
      const move = queue.shift()!;
      const axisVec = toVec3(VERTICES[move.vertex]).normalize();
      const angle = move.direction === 1 ? TWO_PI_3 : -TWO_PI_3;
      const pieces = groupsForMove(move);
      const pivot = new THREE.Group(); root.add(pivot);
      pieces.forEach(g => pivot.attach(g));
      const started = performance.now();
      const animate = (now: number) => {
        if (disposed) return;
        const p = Math.min(1, (now - started) / 280);
        const eased = 1 - Math.pow(1 - p, 3);
        pivot.quaternion.setFromAxisAngle(axisVec, angle * eased);
        if (p < 1) { moveFrame = requestAnimationFrame(animate); return; }
        pivot.updateMatrixWorld(true);
        pieces.forEach(g => root.attach(g));
        root.remove(pivot);
        logicalState = pyraApplyMove(logicalState, move);
        const solvedNow = pyraIsSolved(logicalState);
        setMoves(m => m + 1);
        setIsSolvedNow(solvedNow);
        setStatus(solvedNow ? "Solved!" : "Pyraminx ready");
        active = false; setBusy(queue.length > 0); runNext();
      };
      moveFrame = requestAnimationFrame(animate);
    };

    const queueLabel = (label: string) => { queue.push(parseMove(label)); runNext(); };
    const queueSequence = (labels: string[]) => { labels.forEach(l => queue.push(parseMove(l))); runNext(); };

    const scramble = () => {
      if (active) return;
      const seq = randomScramble(9);
      setStatus("Scrambling…");
      queueSequence(seq.split(" "));
    };
    const solveNow = () => {
      if (active) return;
      const sequence = pyraSolve(logicalState);
      if (!sequence.length) { setStatus("Already solved"); return; }
      setStatus("Solving…");
      queueSequence(sequence);
    };
    const resetPuzzle = () => {
      if (active || pyraIsSolved(logicalState)) return;
      // "Reset" is just "solve" — both mean "animate back to the solved
      // state" — so this reuses the same verified solver and turn queue
      // rather than snapping transforms directly through a second,
      // untested code path.
      queue.length = 0;
      setStatus("Resetting…");
      queueSequence(pyraSolve(logicalState));
    };
    const resetView = () => { controls.reset(); setStatus("View reset"); };

    actionsRef.current = { scramble, solveNow, resetPuzzle, resetView, turnLabel: queueLabel };

    const resize = () => {
      const w = Math.max(1, mount.clientWidth), h = Math.max(1, mount.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    window.addEventListener("resize", resize);
    resize();

    let frame = 0;
    const render = () => { frame = requestAnimationFrame(render); controls.update(); renderer.render(scene, camera); };
    render();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame); cancelAnimationFrame(moveFrame); observer.disconnect();
      window.removeEventListener("resize", resize);
      controls.dispose(); actionsRef.current = null;
      materials.forEach(m => m.dispose());
      geometries.forEach(g => g.dispose());
      renderer.dispose(); renderer.domElement.remove();
    };
  }, [variant]);

  const deepMoves = ["U", "L", "R", "B"];
  const tipMoves = ["u", "l", "r", "b"];

  const description = "Turn with the buttons below, scramble, or let the verified solver play back the full solution.";

  return <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[22px]">
    <div className="orb orb-a" /><div className="orb orb-b" />
    <div className="relative z-[1]">
      <SiteHeader />
      <Link href="/solve" className="mt-4 inline-flex text-sm font-bold text-[var(--muted)]">← Back to solvers</Link>
      <section className="mt-5">
        <p className="text-xs font-extrabold tracking-[.18em] text-[var(--green)]">PYRAMINX</p>
        <h1 className="mt-2 text-[39px] font-extrabold leading-[1.02] tracking-[-1px]">Play &amp; solve<br /><span className="accent-text">the Pyraminx</span></h1>
        <p className="mt-3 text-[15px] leading-6 text-[var(--muted)]">{description}</p>
      </section>

      <section className="glass mt-3 overflow-hidden rounded-[22px]">
        <div className="flex justify-between border-b border-[var(--border)] px-4 py-3 text-sm text-[var(--muted)]"><span>{status}</span><strong className="text-[var(--text)]">{moves} moves</strong></div>
        <div ref={mountRef} className="h-[390px] w-full touch-none sm:h-[440px]" />
      </section>

      <div className="mt-3 grid grid-cols-4 gap-2">{deepMoves.map(label => <button key={label} disabled={busy} onClick={() => actionsRef.current?.turnLabel(label)} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">{label}</button>)}</div>
      <div className="mt-2 grid grid-cols-4 gap-2">{deepMoves.map(label => <button key={`${label}'`} disabled={busy} onClick={() => actionsRef.current?.turnLabel(`${label}'`)} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">{label}&apos;</button>)}</div>
      <details className="glass mt-2 rounded-[18px] p-3">
        <summary className="cursor-pointer text-sm font-extrabold text-[var(--muted)]">Tip twists</summary>
        <div className="mt-3 grid grid-cols-4 gap-2">{tipMoves.map(label => <button key={label} disabled={busy} onClick={() => actionsRef.current?.turnLabel(label)} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">{label}</button>)}</div>
        <div className="mt-2 grid grid-cols-4 gap-2">{tipMoves.map(label => <button key={`${label}'`} disabled={busy} onClick={() => actionsRef.current?.turnLabel(`${label}'`)} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">{label}&apos;</button>)}</div>
      </details>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button disabled={busy} onClick={() => actionsRef.current?.scramble()} className="cta-purple min-h-12 rounded-xl font-extrabold disabled:opacity-40">Scramble</button>
        <button disabled={busy || isSolvedNow} onClick={() => actionsRef.current?.solveNow()} className="cta-green min-h-12 rounded-xl font-extrabold disabled:opacity-40">Solve</button>
        <button onClick={() => actionsRef.current?.resetView()} className="glass min-h-12 rounded-xl font-extrabold">Reset View</button>
      </div>
      <button disabled={busy || isSolvedNow} onClick={() => actionsRef.current?.resetPuzzle()} className="glass mt-2 min-h-12 w-full rounded-xl font-extrabold disabled:opacity-40">Reset Puzzle</button>

      <section className="glass mt-4 rounded-[18px] p-4 text-sm leading-6 text-[var(--muted)]">
        <p><strong className="text-[var(--text)]">U/L/R/B:</strong> deep turn — spins a vertex tip plus its 3 adjacent edges together.</p>
        <p><strong className="text-[var(--text)]">u/l/r/b:</strong> tip twist — spins only the small trivial corner piece.</p>
        <p><strong className="text-[var(--text)]">Drag the puzzle</strong> to rotate the camera and inspect all four faces.</p>
      </section>
    </div>
  </main>;
}
