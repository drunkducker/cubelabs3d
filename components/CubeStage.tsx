"use client";

/**
 * Interactive homepage cube stage.
 *
 * A drag still rotates the cube normally. A short tap opens the puzzle chooser,
 * giving the hero model a clear purpose instead of leaving it as decoration.
 */
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CubeIcon, RefreshIcon, DragIcon } from "./icons";

const RubiksCube = dynamic(() => import("./RubiksCube"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-sm text-[var(--faint)]">
      Loading cube…
    </div>
  ),
});

export default function CubeStage() {
  const router = useRouter();
  const [nonce, setNonce] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const resetView = () => {
    setNonce((value) => value + 1);
    setSpinning(true);
    window.setTimeout(() => setSpinning(false), 500);
  };

  return (
    <div
      className="cube-card relative mt-[18px] grid h-[320px] cursor-pointer place-items-center overflow-hidden rounded-[22px]"
      onPointerDown={(event) => {
        pointerStart.current = { x: event.clientX, y: event.clientY };
        setHintVisible(false);
      }}
      onPointerUp={(event) => {
        const start = pointerStart.current;
        pointerStart.current = null;
        if (!start) return;
        const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
        if (distance < 8) router.push("/solve");
      }}
      onPointerCancel={() => {
        pointerStart.current = null;
      }}
      aria-label="Rotate the cube or tap to choose a puzzle solver"
    >
      <div className="pointer-events-none absolute left-3 top-3 z-[4] flex items-center gap-1.5 rounded-[11px] border border-[var(--border)] bg-black/35 px-3 py-1.5 text-xs font-bold text-[var(--muted)]">
        <CubeIcon className="h-[15px] w-[15px]" /> Interactive 3D
      </div>

      <button
        type="button"
        aria-label="Reset cube view"
        onPointerDown={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        onClick={resetView}
        style={{ transform: spinning ? "rotate(360deg)" : "rotate(0deg)" }}
        className="absolute right-3 top-3 z-[4] grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] bg-black/35 transition-transform duration-500"
      >
        <RefreshIcon className="h-[19px] w-[19px]" />
      </button>

      <div className="platform-ring absolute bottom-[58px] left-1/2 z-[1] h-[66px] w-[230px] -translate-x-1/2 rounded-[50%]" />
      <div className="absolute inset-0 z-[2]">
        <RubiksCube key={nonce} />
      </div>

      <div
        className={`pointer-events-none absolute bottom-4 left-1/2 z-[4] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-[var(--border)] bg-black/35 px-3 py-1.5 text-[13px] font-semibold text-[var(--muted)] transition-opacity ${
          hintVisible ? "opacity-100" : "opacity-85"
        }`}
      >
        <DragIcon className="h-[22px] w-[22px]" /> Drag to rotate • Tap to solve
      </div>
    </div>
  );
}
