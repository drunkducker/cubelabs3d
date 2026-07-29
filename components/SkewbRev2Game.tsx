"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  CENTER_POSITIONS,
  CORNER_POSITIONS,
  type SkewbMove,
  type Vec3,
  applyMove,
  inverseMove,
  isPositionInLayer,
  isSolved,
  moveLabel,
  pivotVector,
  randomScramble,
  solve,
  solved,
} from "@/lib/skewb-engine";

const TURN_ANGLE = (Math.PI * 2) / 3;
const CORNER_DISTANCE = 0.68;
const CENTER_DISTANCE = 0.90;
const CORNER_SIZE = 0.72;

const FACE_COLORS = [
  { normal: [1, 0, 0] as Vec3, color: "#e32636" },
  { normal: [-1, 0, 0] as Vec3, color: "#ff7a18" },
  { normal: [0, 1, 0] as Vec3, color: "#f7f7f2" },
  { normal: [0, -1, 0] as Vec3, color: "#ffd500" },
  { normal: [0, 0, 1] as Vec3, color: "#00a651" },
  { normal: [0, 0, -1] as Vec3, color: "#1457d9" },
] as const;

type PieceKind = "corner" | "center";
type PieceMeta = { kind: PieceKind; index: number };
type PieceGroup = THREE.Group;

type GameApi = {
  scramble: () => void;
  solve: () => void;
  undo: () => void;
  reset: () => void;
};

const dot = (a: readonly number[], b: readonly number[]) =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function meta(piece: PieceGroup): PieceMeta {
  return piece.userData as PieceMeta;
}

function basisForNormal(normal: Vec3) {
  if (normal[0] !== 0) {
    return {
      u: new THREE.Vector3(0, 1, 0),
      v: new THREE.Vector3(0, 0, normal[0]),
    };
  }
  if (normal[1] !== 0) {
    return {
      u: new THREE.Vector3(1, 0, 0),
      v: new THREE.Vector3(0, 0, -normal[1]),
    };
  }
  return {
    u: new THREE.Vector3(1, 0, 0),
    v: new THREE.Vector3(0, normal[2], 0),
  };
}

function orientToFace(object: THREE.Object3D, normalTuple: Vec3) {
  const normal = new THREE.Vector3(...normalTuple);
  const { u, v } = basisForNormal(normalTuple);
  object.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(u, v, normal));
}

function makeCornerStickerGeometry(position: Vec3, normal: Vec3) {
  const { u, v } = basisForNormal(normal);
  const qU = Math.sign(dot(position, u.toArray())) || 1;
  const qV = Math.sign(dot(position, v.toArray())) || 1;
  const edge = 0.292;
  const inner = 0.092;
  const shape = new THREE.Shape();
  shape.moveTo(qU * edge, qV * edge);
  shape.lineTo(-qU * edge * 0.88, qV * edge);
  shape.lineTo(-qU * inner, -qV * inner);
  shape.lineTo(qU * edge, -qV * edge * 0.88);
  shape.closePath();
  return new THREE.ShapeGeometry(shape, 3);
}

function makeDiamondGeometry(radius: number, depth: number) {
  const shape = new THREE.Shape();
  shape.moveTo(0, radius);
  shape.lineTo(radius, 0);
  shape.lineTo(0, -radius);
  shape.lineTo(-radius, 0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.045,
    bevelThickness: 0.035,
    curveSegments: 3,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function makeDiamondStickerGeometry(radius: number) {
  const shape = new THREE.Shape();
  shape.moveTo(0, radius);
  shape.lineTo(radius, 0);
  shape.lineTo(0, -radius);
  shape.lineTo(-radius, 0);
  shape.closePath();
  return new THREE.ShapeGeometry(shape, 3);
}

function colorForNormal(normal: Vec3) {
  return FACE_COLORS.find(face => face.normal.every((value, index) => value === normal[index]))?.color ?? "#ffffff";
}

function moveForCorner(position: readonly number[], direction: 1 | -1): SkewbMove {
  const mapping: Record<string, Omit<SkewbMove, "direction">> = {
    "1,1,1": { axis: "U" },
    "-1,-1,-1": { axis: "U", layer: -1 },
    "1,-1,-1": { axis: "R" },
    "-1,1,1": { axis: "R", layer: -1 },
    "-1,1,-1": { axis: "L" },
    "1,-1,1": { axis: "L", layer: -1 },
    "-1,-1,1": { axis: "B" },
    "1,1,-1": { axis: "B", layer: -1 },
  };
  const layer = mapping[position.join(",")];
  if (!layer) throw new Error(`Unknown Skewb corner pivot: ${position.join(",")}`);
  return { ...layer, direction };
}

export default function SkewbRev2Game() {
  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<GameApi | null>(null);
  const [status, setStatus] = useState("Drag a corner around its diagonal to turn");
  const [moves, setMoves] = useState(0);
  const [notation, setNotation] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedPivot, setSelectedPivot] = useState("none");
  const [controlsOpen, setControlsOpen] = useState(true);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
    camera.position.set(4.45, 3.55, 5.25);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setStatus("3D view unavailable in this browser");
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.16;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 3.75;
    controls.maxDistance = 8.5;
    controls.rotateSpeed = 0.72;
    controls.target.set(0, 0, 0);

    scene.add(new THREE.HemisphereLight("#ffffff", "#101522", 2.65));
    const keyLight = new THREE.DirectionalLight("#ffffff", 4.6);
    keyLight.position.set(6, 9, 7);
    keyLight.castShadow = true;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight("#88a7ff", 1.45);
    fillLight.position.set(-6, 2, 5);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight("#ff8b52", 0.72);
    rimLight.position.set(3, -4, -6);
    scene.add(rimLight);

    const root = new THREE.Group();
    scene.add(root);

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: "#080b10",
      roughness: 0.29,
      metalness: 0.05,
    });
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: "#030509",
      roughness: 0.48,
      metalness: 0.02,
    });
    const coreGeometry = new RoundedBoxGeometry(1.72, 1.72, 1.72, 4, 0.11);
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.castShadow = true;
    core.receiveShadow = true;
    root.add(core);

    const allPieces: PieceGroup[] = [];
    const pickables: THREE.Mesh[] = [];
    const stickerMeshes: THREE.Mesh[] = [];
    const geometries: THREE.BufferGeometry[] = [coreGeometry];
    const materials: THREE.Material[] = [bodyMaterial, coreMaterial];

    CORNER_POSITIONS.forEach((identityPosition, index) => {
      const piece = new THREE.Group();
      piece.userData = { kind: "corner", index } satisfies PieceMeta;
      piece.position.set(
        identityPosition[0] * CORNER_DISTANCE,
        identityPosition[1] * CORNER_DISTANCE,
        identityPosition[2] * CORNER_DISTANCE,
      );

      const bodyGeometry = new RoundedBoxGeometry(CORNER_SIZE, CORNER_SIZE, CORNER_SIZE, 5, 0.095);
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.castShadow = true;
      body.receiveShadow = true;
      body.userData.pieceGroup = piece;
      piece.add(body);
      pickables.push(body);
      geometries.push(bodyGeometry);

      FACE_COLORS.forEach(({ normal, color }) => {
        if (dot(identityPosition, normal) <= 0) return;
        const geometry = makeCornerStickerGeometry(identityPosition, normal);
        const material = new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.018,
          roughness: 0.2,
          metalness: 0,
          side: THREE.DoubleSide,
        });
        const sticker = new THREE.Mesh(geometry, material);
        orientToFace(sticker, normal);
        sticker.position.set(
          normal[0] * (CORNER_SIZE / 2 + 0.008),
          normal[1] * (CORNER_SIZE / 2 + 0.008),
          normal[2] * (CORNER_SIZE / 2 + 0.008),
        );
        sticker.userData.pieceGroup = piece;
        sticker.userData.isSticker = true;
        sticker.castShadow = true;
        piece.add(sticker);
        pickables.push(sticker);
        stickerMeshes.push(sticker);
        geometries.push(geometry);
        materials.push(material);
      });

      allPieces.push(piece);
      root.add(piece);
    });

    CENTER_POSITIONS.forEach((identityNormal, index) => {
      const piece = new THREE.Group();
      piece.userData = { kind: "center", index } satisfies PieceMeta;
      piece.position.set(
        identityNormal[0] * CENTER_DISTANCE,
        identityNormal[1] * CENTER_DISTANCE,
        identityNormal[2] * CENTER_DISTANCE,
      );

      const panel = new THREE.Group();
      orientToFace(panel, identityNormal);
      const bodyGeometry = makeDiamondGeometry(0.655, 0.25);
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.castShadow = true;
      body.receiveShadow = true;
      body.userData.pieceGroup = piece;
      panel.add(body);
      pickables.push(body);
      geometries.push(bodyGeometry);

      const color = colorForNormal(identityNormal);
      const stickerGeometry = makeDiamondStickerGeometry(0.565);
      const stickerMaterial = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.018,
        roughness: 0.18,
        metalness: 0,
        side: THREE.DoubleSide,
      });
      const sticker = new THREE.Mesh(stickerGeometry, stickerMaterial);
      sticker.position.z = 0.135;
      sticker.userData.pieceGroup = piece;
      sticker.userData.isSticker = true;
      sticker.castShadow = true;
      panel.add(sticker);
      pickables.push(sticker);
      stickerMeshes.push(sticker);
      geometries.push(stickerGeometry);
      materials.push(stickerMaterial);

      piece.add(panel);
      allPieces.push(piece);
      root.add(piece);
    });

    let state = solved();
    const history: SkewbMove[] = [];
    let active = false;
    let disposed = false;
    let selectedCorner: PieceGroup | null = null;
    let selectedDirection: 1 | -1 = 1;
    let gestureTangent = new THREE.Vector2(1, 0);
    let pointerDown = false;
    let startX = 0;
    let startY = 0;
    let moveFrame = 0;
    let renderFrame = 0;

    const pieceState = (piece: PieceGroup) => {
      const data = meta(piece);
      return (data.kind === "corner" ? state.corners : state.centers)[data.index];
    };

    const renderDistance = (piece: PieceGroup) =>
      meta(piece).kind === "corner" ? CORNER_DISTANCE : CENTER_DISTANCE;

    const sync = () => {
      allPieces.forEach(piece => {
        const current = pieceState(piece);
        const scale = renderDistance(piece);
        piece.position.set(
          current.position[0] * scale,
          current.position[1] * scale,
          current.position[2] * scale,
        );
        const o = current.orientation;
        piece.quaternion.setFromRotationMatrix(new THREE.Matrix4().set(
          o[0], o[1], o[2], 0,
          o[3], o[4], o[5], 0,
          o[6], o[7], o[8], 0,
          0, 0, 0, 1,
        ));
      });
    };

    const clearHighlight = () => {
      stickerMeshes.forEach(sticker => {
        (sticker.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.018;
      });
    };

    const highlightLayer = (move: SkewbMove) => {
      clearHighlight();
      allPieces
        .filter(piece => isPositionInLayer(pieceState(piece).position, move.axis, move.layer ?? 1))
        .forEach(piece => piece.traverse(child => {
          if (child instanceof THREE.Mesh && child.userData.isSticker) {
            (child.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.26;
          }
        }));
    };

    const finishSequenceState = () => {
      selectedCorner = null;
      setSelectedPivot("none");
      clearHighlight();
    };

    const animateMove = (move: SkewbMove, record = true, onDone?: () => void) => {
      if (active || disposed) return false;
      active = true;
      setBusy(true);
      const selected = allPieces.filter(piece =>
        isPositionInLayer(pieceState(piece).position, move.axis, move.layer ?? 1),
      );
      const pivot = new THREE.Group();
      root.add(pivot);
      selected.forEach(piece => pivot.attach(piece));
      const axis = new THREE.Vector3(...pivotVector(move)).normalize();
      const started = performance.now();

      const animate = (now: number) => {
        if (disposed) return;
        const progress = Math.min(1, (now - started) / 360);
        const eased = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        pivot.quaternion.setFromAxisAngle(axis, move.direction * TURN_ANGLE * eased);
        if (progress < 1) {
          moveFrame = requestAnimationFrame(animate);
          return;
        }

        state = applyMove(state, move);
        selected.forEach(piece => root.attach(piece));
        root.remove(pivot);
        sync();
        if (record) history.push(move);
        setMoves(history.length);
        setStatus(isSolved(state) ? "Solved" : `${moveLabel(move)} complete`);
        active = false;
        setBusy(false);
        finishSequenceState();
        onDone?.();
      };

      moveFrame = requestAnimationFrame(animate);
      return true;
    };

    const playSequence = (sequence: SkewbMove[], done: () => void) => {
      let index = 0;
      const next = () => {
        if (index >= sequence.length) {
          done();
          return;
        }
        animateMove(sequence[index++], false, next);
      };
      next();
    };

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

    const calculateTangent = (piece: PieceGroup) => {
      const cornerWorld = piece.getWorldPosition(new THREE.Vector3()).project(camera);
      const centerWorld = root.getWorldPosition(new THREE.Vector3()).project(camera);
      const radial = new THREE.Vector2(
        cornerWorld.x - centerWorld.x,
        -(cornerWorld.y - centerWorld.y),
      );
      if (radial.lengthSq() < 0.0001) return new THREE.Vector2(1, 0);
      radial.normalize();
      return new THREE.Vector2(-radial.y, radial.x).normalize();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (active) return;
      const piece = hitPiece(event);
      if (!piece || meta(piece).kind !== "corner") {
        pointerDown = false;
        selectedCorner = null;
        clearHighlight();
        setSelectedPivot("none");
        controls.enabled = true;
        setStatus("Drag empty space to rotate the cube");
        return;
      }

      event.preventDefault();
      pointerDown = true;
      selectedCorner = piece;
      selectedDirection = 1;
      startX = event.clientX;
      startY = event.clientY;
      gestureTangent = calculateTangent(piece);
      controls.enabled = false;
      const position = pieceState(piece).position;
      const move = moveForCorner(position, 1);
      highlightLayer(move);
      setSelectedPivot(position.join(","));
      setStatus("Pivot locked — drag around the highlighted diagonal");
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!pointerDown || !selectedCorner || active) return;
      const drag = new THREE.Vector2(event.clientX - startX, event.clientY - startY);
      const signedDistance = drag.dot(gestureTangent);
      if (Math.abs(signedDistance) < 15) return;
      selectedDirection = signedDistance >= 0 ? 1 : -1;
      setStatus(`${selectedDirection === 1 ? "Clockwise" : "Counterclockwise"} — release to turn`);
    };

    const finishPointer = (event: PointerEvent) => {
      if (!pointerDown) return;
      pointerDown = false;
      if (selectedCorner && !active) {
        const drag = new THREE.Vector2(event.clientX - startX, event.clientY - startY);
        const signedDistance = drag.dot(gestureTangent);
        if (Math.abs(signedDistance) >= 26) {
          animateMove(moveForCorner(pieceState(selectedCorner).position, selectedDirection));
        } else {
          setStatus("Drag farther around the corner to turn");
        }
      }
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      controls.enabled = true;
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown, true);
    renderer.domElement.addEventListener("pointermove", onPointerMove, true);
    renderer.domElement.addEventListener("pointerup", finishPointer, true);
    renderer.domElement.addEventListener("pointercancel", finishPointer, true);

    apiRef.current = {
      scramble: () => {
        if (active) return;
        state = solved();
        history.length = 0;
        sync();
        setMoves(0);
        const sequence = randomScramble(10);
        setNotation(sequence.map(moveLabel).join(" "));
        setStatus("Scrambling");
        playSequence(sequence, () => {
          setStatus("Scrambled — drag any visible corner");
          setBusy(false);
        });
      },
      solve: () => {
        if (active || isSolved(state)) return;
        setStatus("Finding a verified solution");
        window.setTimeout(() => {
          try {
            const solution = solve(state, history);
            setNotation(solution.map(moveLabel).join(" "));
            setStatus(`Solving in ${solution.length} moves`);
            playSequence(solution, () => {
              history.length = 0;
              setMoves(0);
              setStatus("Solved");
              setBusy(false);
            });
          } catch {
            setStatus("This position could not be solved");
            setBusy(false);
          }
        }, 20);
      },
      undo: () => {
        if (active || history.length === 0) return;
        const move = history.pop();
        if (!move) return;
        setMoves(history.length);
        animateMove(inverseMove(move), false);
      },
      reset: () => {
        if (active) return;
        state = solved();
        history.length = 0;
        selectedCorner = null;
        setMoves(0);
        setNotation("");
        setSelectedPivot("none");
        clearHighlight();
        sync();
        setStatus("Drag a corner around its diagonal to turn");
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
    sync();

    const render = () => {
      renderFrame = requestAnimationFrame(render);
      controls.update();
      renderer.render(scene, camera);
    };
    render();

    return () => {
      disposed = true;
      cancelAnimationFrame(moveFrame);
      cancelAnimationFrame(renderFrame);
      observer.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown, true);
      renderer.domElement.removeEventListener("pointermove", onPointerMove, true);
      renderer.domElement.removeEventListener("pointerup", finishPointer, true);
      renderer.domElement.removeEventListener("pointercancel", finishPointer, true);
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      renderer.dispose();
      renderer.domElement.remove();
      apiRef.current = null;
    };
  }, []);

  return (
    <div className="relative min-h-[640px] overflow-hidden rounded-[30px] border border-white/10 bg-[#070a10] shadow-[0_28px_100px_rgba(0,0,0,.6)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4">
        <div className="rounded-full border border-white/10 bg-black/45 px-3 py-2 text-[10px] font-black tracking-[0.2em] text-white/65 backdrop-blur-xl">
          PHYSICAL SKEWB · REV 2
        </div>
        <div className="rounded-full border border-white/10 bg-black/45 px-3 py-2 text-[10px] font-black tracking-[0.18em] text-white/65 backdrop-blur-xl">
          {moves} MOVES
        </div>
      </div>

      <div
        ref={mountRef}
        className="h-[min(72dvh,720px)] min-h-[540px] w-full bg-[radial-gradient(circle_at_50%_42%,rgba(81,111,190,.25),rgba(9,12,19,.2)_42%,rgba(3,5,9,.92)_78%)]"
      />

      <div className="absolute inset-x-3 bottom-3 z-20 rounded-[24px] border border-white/10 bg-black/68 p-3 shadow-2xl backdrop-blur-2xl sm:inset-x-5 sm:bottom-5 sm:p-4">
        <button
          type="button"
          onClick={() => setControlsOpen(open => !open)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div>
            <div className="text-sm font-black text-white">{status}</div>
            <div className="mt-1 text-[11px] font-semibold tracking-wide text-white/42">
              Pivot {selectedPivot} · empty-space drag rotates view
            </div>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black text-white/55">
            {controlsOpen ? "Hide" : "Controls"}
          </span>
        </button>

        {controlsOpen && (
          <div className="mt-3 border-t border-white/10 pt-3">
            {notation && (
              <div className="mb-3 overflow-x-auto whitespace-nowrap rounded-xl border border-white/8 bg-white/[0.045] px-3 py-2 font-mono text-xs text-white/58">
                {notation}
              </div>
            )}
            <div className="grid grid-cols-4 gap-2">
              <button disabled={busy} onClick={() => apiRef.current?.scramble()} className="rounded-xl bg-emerald-400 px-2 py-3 text-xs font-black text-black disabled:opacity-35">Scramble</button>
              <button disabled={busy || moves === 0} onClick={() => apiRef.current?.undo()} className="rounded-xl border border-white/12 bg-white/[0.055] px-2 py-3 text-xs font-black text-white disabled:opacity-35">Undo</button>
              <button disabled={busy || moves === 0} onClick={() => apiRef.current?.solve()} className="rounded-xl border border-sky-300/25 bg-sky-300/10 px-2 py-3 text-xs font-black text-sky-100 disabled:opacity-35">Solve</button>
              <button disabled={busy} onClick={() => apiRef.current?.reset()} className="rounded-xl border border-white/12 bg-white/[0.055] px-2 py-3 text-xs font-black text-white disabled:opacity-35">Reset</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
