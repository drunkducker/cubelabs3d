/**
 * Static labeled reference net — the flat counterpart to the 3D
 * NotationCube on the same page. Same cross layout components/ManualSolver.tsx
 * uses for color entry (lib/cube-net-layout.ts), but read-only: every
 * sticker is colored to its face's canonical color, and each face's center
 * carries its letter, for a quick "which face is which" lookup that doesn't
 * require spinning the 3D cube around.
 */
import { NET_COLS, NET_ROWS, netCellAt } from "@/lib/cube-net-layout";

const FACE_COLORS: Record<string, string> = { U: "#f5f1e8", R: "#e52b3d", F: "#00a85a", D: "#ffd500", L: "#ff7a00", B: "#1557d5" };

export default function NotationNet() {
  return (
    <div className="mx-auto grid aspect-[12/9] max-w-[390px] grid-cols-12 gap-1">
      {Array.from({ length: NET_ROWS * NET_COLS }, (_, i) => {
        const row = Math.floor(i / NET_COLS), col = i % NET_COLS;
        const cell = netCellAt(row, col);
        if (!cell) return <div key={i} />;
        return (
          <div key={i} className="relative rounded-[5px] border border-white/15" style={{ background: FACE_COLORS[cell.face] }}>
            {cell.isCenter && <span className="absolute inset-0 grid place-items-center text-sm font-extrabold text-white [text-shadow:0_1px_3px_rgba(0,0,0,.85)]">{cell.face}</span>}
          </div>
        );
      })}
    </div>
  );
}
