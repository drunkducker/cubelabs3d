"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  FACE_COLORS,
  applyMoveIndex,
  applyMoves,
  dirOfMove,
  faceOfMove,
  moveLabel,
  parseMove,
  solve,
  solved,
  type KiloState,
} from "@/lib/kilominx-engine";
import { resolveKilominxSpatialFace } from "@/lib/kilominx-interaction";
import KilominxNotationModel from "@/components/KilominxNotationModel";

const GUIDE_EVENT = "kilominx-notation-grab-face";

type SolveGuide = {
  move: number;
  face: number;
  color: string;
  remaining: number;
  clockwise: boolean;
};

type GuideDot = {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  texture: THREE.CanvasTexture;
};

function parseSequence(sequence: string) {
  return sequence.trim().split(/\s+/).filter(Boolean).flatMap(token => {
    try {
      return [parseMove(token)];
    } catch {
      return [];
    }
  });
}

function readModelStatus(root: HTMLElement) {
  const section = root.firstElementChild as HTMLElement | null;
  const header = section?.firstElementChild as HTMLElement | null;
  return header?.querySelector("span")?.textContent?.trim() ?? "";
}

function guideDotTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.2, "rgba(255,255,255,1)");
    gradient.addColorStop(0.45, "rgba(255,255,255,.82)");
    gradient.addColorStop(0.72, "rgba(255,255,255,.3)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function dispatchGuide(guide: SolveGuide | null) {
  window.dispatchEvent(new CustomEvent(GUIDE_EVENT, {
    detail: guide
      ? {
          face: guide.face,
          move: guide.move,
          kite: 0,
          // The Learn shell owns the face dot. Leaving the durable sticker label
          // empty prevents the model's old label-based glow from selecting a
          // different spatial face after a scramble.
          stickerLabel: null,
          color: null,
        }
      : {
          face: null,
          move: null,
          kite: null,
          stickerLabel: null,
          color: null,
        },
  }));
}

/**
 * Learn-only interaction shell.
 *
 * The solve dot is resolved from the same current-spatial-face authority as the
 * playable touch gesture. Durable sticker labels remain useful identity data,
 * but they are never used to decide which face a human should turn.
 */
export default function KilominxNotationTouchGuard() {
  const modelRootRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<KiloState>(solved());
  const guideRef = useRef<SolveGuide | null>(null);
  const pendingScrambleRef = useRef<KiloState | null>(null);
  const pendingManualMoveRef = useRef<number | null>(null);
  const scrambleActiveRef = useRef(false);
  const lastScrambleRef = useRef("");
  const lastStatusRef = useRef("");
  const humanMovesRef = useRef(0);
  const stickerMeshesRef = useRef<THREE.Mesh[]>([]);
  const guideDotRef = useRef<GuideDot | null>(null);
  const pulseFrameRef = useRef(0);
  const [guide, setGuide] = useState<SolveGuide | null>(null);
  const [humanMoves, setHumanMoves] = useState(0);
  const [feedback, setFeedback] = useState("Tap Scramble to begin a guided solve.");

  const clearGuideDot = () => {
    const dot = guideDotRef.current;
    if (!dot) return;
    dot.sprite.removeFromParent();
    dot.sprite.visible = false;
  };

  const placeGuideDot = (nextGuide: SolveGuide | null) => {
    clearGuideDot();
    if (!nextGuide) return;

    const targetSticker = stickerMeshesRef.current.find(sticker => {
      const geometry = sticker.geometry;
      if (!(geometry instanceof THREE.BufferGeometry)) return false;
      const normals = geometry.getAttribute("normal");
      const localNormal = normals
        ? new THREE.Vector3(normals.getX(0), normals.getY(0), normals.getZ(0)).normalize()
        : new THREE.Vector3(0, 0, 1);
      return resolveKilominxSpatialFace(sticker, localNormal) === nextGuide.face;
    });

    if (!targetSticker) return;

    let dot = guideDotRef.current;
    if (!dot) {
      const texture = guideDotTexture();
      const material = new THREE.SpriteMaterial({
        map: texture,
        color: "#ffffff",
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
      });
      const sprite = new THREE.Sprite(material);
      sprite.renderOrder = 45;
      dot = { sprite, material, texture };
      guideDotRef.current = dot;
    }

    const geometry = targetSticker.geometry as THREE.BufferGeometry;
    geometry.computeBoundingSphere();
    const center = geometry.boundingSphere?.center.clone() ?? new THREE.Vector3();
    const normals = geometry.getAttribute("normal");
    const normal = normals
      ? new THREE.Vector3(normals.getX(0), normals.getY(0), normals.getZ(0)).normalize()
      : new THREE.Vector3(0, 0, 1);

    dot.material.color.set("#ffffff");
    targetSticker.add(dot.sprite);
    dot.sprite.position.copy(center).addScaledVector(normal, 0.12);
    dot.sprite.scale.setScalar(0.3);
    dot.sprite.visible = true;
  };

  const setActiveGuide = (nextGuide: SolveGuide | null) => {
    guideRef.current = nextGuide;
    setGuide(nextGuide);
    dispatchGuide(nextGuide);
    placeGuideDot(nextGuide);
  };

  const guideState = (state: KiloState, completedMoves: number, message?: string) => {
    const solution = solve(state);
    if (!solution.length) {
      setActiveGuide(null);
      setFeedback("Solved — scramble again or keep experimenting.");
      return;
    }

    const move = solution[0]!;
    const face = faceOfMove(move);
    const nextGuide: SolveGuide = {
      move,
      face,
      color: FACE_COLORS[face]!,
      remaining: solution.length,
      clockwise: dirOfMove(move) === 1,
    };
    setActiveGuide(nextGuide);
    setFeedback(message ?? `Find the bright dot on face ${face + 1}, then follow the ${nextGuide.clockwise ? "clockwise" : "counter-clockwise"} thumb guide.`);
    humanMovesRef.current = completedMoves;
    setHumanMoves(completedMoves);
  };

  useLayoutEffect(() => {
    stickerMeshesRef.current = [];

    const originalSpriteRaycast = THREE.Sprite.prototype.raycast;
    const originalAdd = THREE.Object3D.prototype.add;

    const guardedRaycast = function (
      this: THREE.Sprite,
      raycaster: THREE.Raycaster,
      intersects: THREE.Intersection[],
    ) {
      const material = this.material;
      const isPresentationGlow =
        material instanceof THREE.SpriteMaterial &&
        material.blending === THREE.AdditiveBlending &&
        material.depthWrite === false;

      if (isPresentationGlow) return;
      originalSpriteRaycast.call(this, raycaster, intersects);
    };

    const captureStickerAdd = function (this: THREE.Object3D, ...objects: THREE.Object3D[]) {
      for (const object of objects) {
        if (
          object instanceof THREE.Mesh &&
          typeof object.userData.label === "string" &&
          !stickerMeshesRef.current.includes(object)
        ) {
          stickerMeshesRef.current.push(object);
        }
      }
      return originalAdd.apply(this, objects);
    };

    THREE.Sprite.prototype.raycast = guardedRaycast;
    THREE.Object3D.prototype.add = captureStickerAdd as typeof THREE.Object3D.prototype.add;

    const pulse = (now: number) => {
      const sprite = guideDotRef.current?.sprite;
      if (sprite?.visible) {
        const scale = 0.3 + Math.sin(now * 0.006) * 0.045;
        sprite.scale.setScalar(scale);
      }
      pulseFrameRef.current = requestAnimationFrame(pulse);
    };
    pulseFrameRef.current = requestAnimationFrame(pulse);

    const root = modelRootRef.current;
    const buttons = root ? Array.from(root.querySelectorAll<HTMLButtonElement>("button")) : [];
    const solveButton = buttons.find(button => button.textContent?.trim() === "Solve") ?? null;
    const buttonRow = solveButton?.parentElement ?? null;
    const previousDisplay = solveButton?.style.display ?? "";
    const previousColumns = buttonRow?.style.gridTemplateColumns ?? "";
    if (solveButton) solveButton.style.display = "none";
    if (buttonRow) buttonRow.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";

    return () => {
      cancelAnimationFrame(pulseFrameRef.current);
      if (THREE.Sprite.prototype.raycast === guardedRaycast) {
        THREE.Sprite.prototype.raycast = originalSpriteRaycast;
      }
      if (THREE.Object3D.prototype.add === captureStickerAdd) {
        THREE.Object3D.prototype.add = originalAdd;
      }
      if (solveButton) solveButton.style.display = previousDisplay;
      if (buttonRow) buttonRow.style.gridTemplateColumns = previousColumns;
      clearGuideDot();
      guideDotRef.current?.material.dispose();
      guideDotRef.current?.texture.dispose();
      guideDotRef.current = null;
      stickerMeshesRef.current = [];
    };
  }, []);

  useEffect(() => {
    const root = modelRootRef.current;
    if (!root) return;

    const resetGuide = () => {
      stateRef.current = solved();
      pendingScrambleRef.current = null;
      pendingManualMoveRef.current = null;
      scrambleActiveRef.current = false;
      humanMovesRef.current = 0;
      setHumanMoves(0);
      setActiveGuide(null);
      setFeedback("Tap Scramble to begin a guided solve.");
    };

    const sync = () => {
      const scrambleText = root.querySelector<HTMLElement>("[data-puzzle-scramble]")?.textContent?.trim() ?? "";
      const status = readModelStatus(root);

      if (scrambleText !== lastScrambleRef.current) {
        lastScrambleRef.current = scrambleText;
        if (!scrambleText) {
          resetGuide();
        } else {
          const scrambleMoves = parseSequence(scrambleText);
          pendingScrambleRef.current = scrambleMoves.length ? applyMoves(solved(), scrambleMoves) : solved();
          scrambleActiveRef.current = true;
          pendingManualMoveRef.current = null;
          humanMovesRef.current = 0;
          setHumanMoves(0);
          setActiveGuide(null);
          setFeedback("Scrambling… the first bright target will appear when it stops.");
        }
      }

      if (!status || status === lastStatusRef.current) return;
      lastStatusRef.current = status;

      const turnMatch = status.match(/^Turn\s+(\d+'?)\s+from sticker/i);
      if (turnMatch) {
        try {
          pendingManualMoveRef.current = parseMove(turnMatch[1]!);
          const expected = guideRef.current?.move;
          setFeedback(expected === pendingManualMoveRef.current
            ? "Nice move — checking the next step…"
            : "That works too — recalculating a new path from here…");
        } catch {
          pendingManualMoveRef.current = null;
        }
        return;
      }

      const moveFinished = status === "Kilominx ready" || status === "Solved";
      if (!moveFinished) return;

      if (scrambleActiveRef.current && pendingScrambleRef.current) {
        stateRef.current = pendingScrambleRef.current;
        pendingScrambleRef.current = null;
        scrambleActiveRef.current = false;
        guideState(stateRef.current, 0);
        return;
      }

      if (pendingManualMoveRef.current !== null) {
        const move = pendingManualMoveRef.current;
        pendingManualMoveRef.current = null;
        stateRef.current = applyMoveIndex(stateRef.current, move);
        const completed = humanMovesRef.current + 1;
        guideState(
          stateRef.current,
          completed,
          completed >= 3
            ? "Keep playing — remaining moves are now pinned at the top."
            : "Good. Follow the new face dot and thumb direction.",
        );
      }
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      dispatchGuide(null);
    };
  }, []);

  const remainingLabel = guide
    ? `${guide.remaining} move${guide.remaining === 1 ? "" : "s"} to completion`
    : "";

  return (
    <div className="relative" data-kilominx-learn-guide>
      <div ref={modelRootRef}>
        <KilominxNotationModel />
      </div>

      {guide ? (
        <div className="pointer-events-none absolute right-4 top-3 z-40 rounded-full border border-white/20 bg-black/90 px-3 py-2 text-xs font-black tracking-[.1em] text-white shadow-[0_0_20px_rgba(0,0,0,.65)] backdrop-blur">
          FACE {guide.face + 1}
        </div>
      ) : null}

      {guide && humanMoves >= 3 ? (
        <div className="pointer-events-none absolute left-4 top-3 z-40 rounded-full border border-white/20 bg-black/90 px-3 py-2 text-xs font-black tracking-[.06em] text-white shadow-[0_0_20px_rgba(0,0,0,.65)] backdrop-blur">
          {remainingLabel}
        </div>
      ) : null}

      {guide ? (
        <div
          className={`pointer-events-none absolute top-[46%] z-30 flex w-[108px] -translate-y-1/2 flex-col items-center rounded-2xl border border-white/20 bg-black/78 px-3 py-3 text-center shadow-[0_18px_38px_rgba(0,0,0,.6)] backdrop-blur ${guide.clockwise ? "right-2" : "left-2"}`}
          aria-hidden="true"
        >
          <span className="text-[10px] font-black uppercase tracking-[.16em] text-white/65">Slide thumb</span>
          <span className="mt-1 animate-pulse text-5xl font-black leading-none" style={{ color: guide.color }}>
            {guide.clockwise ? "↻" : "↺"}
          </span>
          <span className="mt-1 text-sm font-black text-white">{moveLabel(guide.move)}</span>
          <span className="mt-1 text-[10px] font-bold uppercase tracking-[.1em] text-white/60">Face {guide.face + 1}</span>
          {humanMoves < 3 ? <span className="mt-2 text-[10px] font-bold leading-4 text-white/70">{remainingLabel}</span> : null}
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-[76px] left-1/2 z-30 w-[min(88%,340px)] -translate-x-1/2 rounded-full border border-white/10 bg-black/65 px-4 py-2 text-center text-xs font-bold text-white/75 backdrop-blur">
        {feedback}
      </div>
    </div>
  );
}
