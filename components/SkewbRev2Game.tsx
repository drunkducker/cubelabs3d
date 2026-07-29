"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  type SkewbMove,
  applyMove,
  inverseMove,
  isPositionInLayer,
  isSolved,
  moveLabel,
  pivotVector,
  randomScramble,
  solved,
} from "@/lib/skewb-engine";
import {
  SKEWB_FACE_BASES,
  anchorForFacePiece,
  createSkewbFacePolygons,
} from "@/lib/skewb-visual-geometry";

const COLORS = ["#f5f5ef", "#ffd500", "#00a85a", "#1557d5", "#ef3340", "#ff7a00"];
const TURN = (Math.PI * 2) / 3;

type PieceGroup = THREE.Group & {
  userData: {
    kind: "corner" | "center";
    index: number;
    key: string;
  };
};

function makePolygonGeometry(points: readonly [number, number][], depth: number) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.035,
    bevelThickness: 0.025,
    curveSegments: 3,
  });
  geometry.translate(0, 0, -depth);
  return geometry;
}

function orientFaceObject(
  object: THREE.Object3D,
  normal: THREE.Vector3,
  u: THREE.Vector3,
  v: THREE.Vector3,
  localCenter: THREE.Vector3,
) {
  object.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(u, v, normal));
  object.position.copy(localCenter);
}

export default function SkewbRev2Game() {
  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{
    scramble: () => void;
    undo: () => void;
    reset: () => void;
  } | null>(null);
  const [status, setStatus] = useState("Tap a visible corner to select its real pivot");
  const [moves, setMoves] = useState(0);
  const [scramble, setScramble] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedPivot, setSelectedPivot] = useState<string>("None");

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(4.8, 4.2, 5.8);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      setStatus("3D view unavailable in this browser");
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.domElement.style.cssText = "width:100%;height:100%;display:block;touch-action:none";
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 3.5;
    controls.maxDistance = 10;
    controls.target.set(0, 0, 0);

    scene.add(new THREE.HemisphereLight("#ffffff", "#151d2f", 2.2));
    const key = new THREE.DirectionalLight("#ffffff", 3.2);
    key.position.set(7, 10, 8);
    key.castShadow = true;
    scene.add(key);
    const rim = new THREE.DirectionalLight("#6c7fff", 1.1);
    rim.position.set(-8, 3, -7);
    scene.add(rim);

    const root = new THREE.Group();
    root.rotation.set(-0.07, 0.08, 0);
    scene.add(root);

    const plastic = new THREE.MeshStandardMaterial({ color: "#07090d", roughness: 0.38, metalness: 0.025 });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.8, 28, 20), plastic);
    core.castShadow = true;
    root.add(core);

    const polygons = createSkewbFacePolygons(0.43, 0.95);
    const groups = new Map<string, PieceGroup>();
    const pickables: THREE.Mesh[] = [];
    const allGroups: PieceGroup[] = [];
    const cornerAnchors: [number, number, number][] = [];
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) cornerAnchors.push([x, y, z]);
    const centerAnchors: [number, number, number][] = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];

    SKEWB_FACE_BASES.forEach((basis, faceIndex) => {
      const normal = new THREE.Vector3(...basis.normal);
      const u = new THREE.Vector3(...basis.u);
      const v = new THREE.Vector3(...basis.v);
      const facePlane = normal.clone().multiplyScalar(1.04);

      polygons.forEach((polygon) => {
        const anchor = anchorForFacePiece(basis, polygon);
        const keyName = `${polygon.kind}:${anchor.join(",")}`;
        let piece = groups.get(keyName);
        if (!piece) {
          piece = new THREE.Group() as PieceGroup;
          piece.position.set(...anchor);
          piece.userData.kind = polygon.kind;
          piece.userData.key = keyName;
          piece.userData.index = (polygon.kind === "corner" ? cornerAnchors : centerAnchors)
            .findIndex((candidate) => candidate.every((value, i) => value === anchor[i]));
          groups.set(keyName, piece);
          allGroups.push(piece);
          root.add(piece);
        }

        const panel = new THREE.Group();
        const shellGeometry = makePolygonGeometry(polygon.points, polygon.kind === "corner" ? 0.30 : 0.38);
        const shell = new THREE.Mesh(shellGeometry, plastic);
        shell.castShadow = true;
        shell.receiveShadow = true;
        shell.userData.pieceGroup = piece;
        panel.add(shell);
        pickables.push(shell);

        const stickerPoints = polygon.points.map(([x, y]) => [x * 0.87, y * 0.87] as [number, number]);
        const stickerGeometry = makePolygonGeometry(stickerPoints, 0.025);
        const stickerMaterial = new THREE.MeshStandardMaterial({
          color: COLORS[faceIndex],
          emissive: COLORS[faceIndex],
          emissiveIntensity: 0.025,
          roughness: 0.24,
          metalness: 0.01,
        });
        const sticker = new THREE.Mesh(stickerGeometry, stickerMaterial);
        sticker.position.z = 0.03;
        sticker.castShadow = true;
        sticker.userData.pieceGroup = piece;
        sticker.userData.isSticker = true;
        panel.add(sticker);
        pickables.push(sticker);

        const localCenter = facePlane.clone().sub(new THREE.Vector3(...anchor));
        orientFaceObject(panel, normal, u, v, localCenter);
        piece.add(panel);
      });
    });

    let state = solved();
    const history: SkewbMove[] = [];
    let active = false;
    let selectedCorner: PieceGroup | null = null;
    let selectedDirection: 1 | -1 = 1;

    const pieceState = (piece: PieceGroup) => {
      const collection = piece.userData.kind === "corner" ? state.corners : state.centers;
      return collection[piece.userData.index];
    };

    const sync = () => {
      allGroups.forEach((piece) => {
        const current = pieceState(piece);
        piece.position.set(...current.position);
        const o = current.orientation;
        piece.quaternion.setFromRotationMatrix(new THREE.Matrix4().set(
          o[0], o[1], o[2], 0,
          o[3], o[4], o[5], 0,
          o[6], o[7], o[8], 0,
          0, 0, 0, 1,
        ));
      });
    };

    const clearSelection = () => {
      allGroups.forEach((piece) => {
        piece.traverse((child) => {
          if (!(child instanceof THREE.Mesh) || !child.userData.isSticker) return;
          const material = child.material as THREE.MeshStandardMaterial;
          material.emissiveIntensity = 0.025;
        });
      });
    };

    const selectCorner = (piece: PieceGroup) => {
      clearSelection();
      selectedCorner = piece;
      selectedDirection = 1;
      const pos = pieceState(piece).position;
      setSelectedPivot(pos.join(", "));
      allGroups
        .filter((candidate) => isPositionInLayer(pieceState(candidate).position, "U", 1))
        .forEach(() => undefined);
      piece.traverse((child) => {
        if (!(child instanceof THREE.Mesh) || !child.userData.isSticker) return;
        (child.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.22;
      });
      setStatus("Corner pivot locked · swipe left/right to choose direction");
    };

    const moveForCorner = (piece: PieceGroup, direction: 1 | -1): SkewbMove => {
      const [x, y, z] = pieceState(piece).position;
      const key = `${x},${y},${z}`;
      const map: Record<string, SkewbMove> = {
        "1,1,1": { axis: "U", direction },
        "-1,-1,-1": { axis: "U", layer: -1, direction },
        "1,-1,-1": { axis: "R", direction },
        "-1,1,1": { axis: "R", layer: -1, direction },
        "-1,1,-1": { axis: "L", direction },
        "1,-1,1": { axis: "L", layer: -1, direction },
        "-1,-1,1": { axis: "B", direction },
        "1,1,-1": { axis: "B", layer: -1, direction },
      };
      return map[key] ?? { axis: "U", direction };
    };

    const animateMove = (move: SkewbMove, record = true) => {
      if (active) return;
      active = true;
      setBusy(true);
      const selected = allGroups.filter((piece) =>
        isPositionInLayer(pieceState(piece).position, move.axis, move.layer ?? 1),
      );
      const pivot = new THREE.Group();
      root.add(pivot);
      selected.forEach((piece) => pivot.attach(piece));
      const axis = new THREE.Vector3(...pivotVector(move)).normalize();
      const start = performance.now();
      const duration = 430;
      const frame = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        pivot.quaternion.setFromAxisAngle(axis, move.direction * TURN * eased);
        if (t < 1) {
          requestAnimationFrame(frame);
          return;
        }
        state = applyMove(state, move);
        selected.forEach((piece) => root.attach(piece));
        root.remove(pivot);
        sync();
        if (record) history.push(move);
        setMoves(history.length);
        setStatus(isSolved(state) ? "Solved!" : `${moveLabel(move)} complete`);
        active = false;
        setBusy(false);
      };
      requestAnimationFrame(frame);
    };

    let startX = 0;
    let startY = 0;
    let pointerDown = false;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const hitPiece = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(pickables, false)[0];
      return hit?.object.userData.pieceGroup as PieceGroup | undefined;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (active) return;
      pointerDown = true;
      startX = event.clientX;
      startY = event.clientY;
      const piece = hitPiece(event);
      if (piece?.userData.kind === "corner") {
        event.preventDefault();
        controls.enabled = false;
        selectCorner(piece);
        renderer.domElement.setPointerCapture(event.pointerId);
      } else {
        selectedCorner = null;
        clearSelection();
        controls.enabled = true;
        setSelectedPivot("None");
        setStatus("Rotate view, or tap a visible corner");
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!pointerDown || !selectedCorner || active) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (Math.hypot(dx, dy) < 18) return;
      selectedDirection = dx >= 0 ? 1 : -1;
      setStatus(`${selectedDirection === 1 ? "Clockwise" : "Counterclockwise"} · release to turn`);
    };

    const onPointerUp = (event: PointerEvent) => {
      pointerDown = false;
      if (selectedCorner && !active) {
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        if (Math.hypot(dx, dy) >= 28) animateMove(moveForCorner(selectedCorner, selectedDirection));
        else setStatus("Pivot selected · drag left or right");
      }
      if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
      controls.enabled = true;
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown, true);
    renderer.domElement.addEventListener("pointermove", onPointerMove, true);
    renderer.domElement.addEventListener("pointerup", onPointerUp, true);

    apiRef.current = {
      scramble: () => {
        if (active) return;
        state = solved();
        history.length = 0;
        setMoves(0);
        const sequence = randomScramble(10);
        setScramble(sequence.map(moveLabel).join(" "));
        let index = 0;
        const next = () => {
          if (index >= sequence.length) {
            setStatus("Scrambled · select a corner pivot");
            return;
          }
          const move = sequence[index++];
          animateMove(move, false);
          const wait = () => active ? window.setTimeout(wait, 25) : next();
          wait();
        };
        next();
      },
      undo: () => {
        if (active || !history.length) return;
        const move = history.pop()!;
        setMoves(history.length);
        animateMove(inverseMove(move), false);
      },
      reset: () => {
        if (active) return;
        state = solved();
        history.length = 0;
        setMoves(0);
        setScramble("");
        setSelectedPivot("None");
        clearSelection();
        sync();
        setStatus("Tap a visible corner to select its real pivot");
      },
    };

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
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown, true);
      renderer.domElement.removeEventListener("pointermove", onPointerMove, true);
      renderer.domElement.removeEventListener("pointerup", onPointerUp, true);
      renderer.dispose();
      renderer.domElement.remove();
      apiRef.current = null;
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0e16] shadow-2xl shadow-black/50">
      <div className="grid grid-cols-3 border-b border-white/10 bg-black/20 text-center text-[10px] font-black tracking-[0.18em] text-white/55">
        <div className="px-2 py-3"><span className="text-emerald-300">●</span> REV 2 ENGINE</div>
        <div className="border-x border-white/10 px-2 py-3">PIVOT {selectedPivot}</div>
        <div className="px-2 py-3">{moves} MOVES</div>
      </div>

      <div ref={mountRef} className="h-[min(64dvh,640px)] min-h-[440px] w-full bg-[radial-gradient(circle_at_50%_38%,rgba(75,98,180,.18),transparent_56%)]" />

      <div className="border-t border-white/10 bg-black/25 p-4">
        <div className="mb-3 text-center text-sm font-semibold text-white/80">{status}</div>
        {scramble && <div className="mb-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center font-mono text-xs text-white/60">{scramble}</div>}
        <div className="grid grid-cols-3 gap-2">
          <button disabled={busy} onClick={() => apiRef.current?.scramble()} className="rounded-xl bg-emerald-400 px-3 py-3 text-sm font-black text-black disabled:opacity-40">Scramble</button>
          <button disabled={busy || moves === 0} onClick={() => apiRef.current?.undo()} className="rounded-xl border border-white/15 bg-white/5 px-3 py-3 text-sm font-black disabled:opacity-40">Undo</button>
          <button disabled={busy} onClick={() => apiRef.current?.reset()} className="rounded-xl border border-white/15 bg-white/5 px-3 py-3 text-sm font-black disabled:opacity-40">Reset</button>
        </div>
        <p className="mt-3 text-center text-xs text-white/45">Tap a corner · drag left/right to turn · drag empty space to rotate view</p>
      </div>
    </div>
  );
}
