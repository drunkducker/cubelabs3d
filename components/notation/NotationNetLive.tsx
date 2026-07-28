/**
 * Live labelled 3×3 net — the flat counterpart to the interactive cube on the
 * 3×3 Notation Lab. It is a pure view of the shared CubeState: it receives a
 * 54-entry facelet array and the current guide face as props and renders them.
 *
 * There is deliberately no engine, MutationObserver, or DOM scraping here. The
 * parent lab owns the one CubeState; this component and the 3D cube are two
 * renderings of it, so they can never drift out of sync.
 */
import {
  FACELET_FACES,
  FACE_COLORS,
  FACE_TEXT,
  colorForFacelet,
  type Face,
} from "@/lib/cube-notation";
import { NET_COLS, NET_ROWS, netCellAt } from "@/lib/cube-net-layout";

type Props = {
  /** 54 colour ids (0..5) in U,R,F,D,L,B row-major order — matches toFacelets(). */
  facelets: number[];
  /** The face the guided route wants to turn next, or null. */
  guideFace?: Face | null;
  guideDir?: "cw" | "ccw" | "half" | null;
};

export default function NotationNetLive({ facelets, guideFace = null, guideDir = null }: Props) {
  return (
    <div className="mx-auto grid aspect-[12/9] max-w-[420px] grid-cols-12 gap-1">
      {Array.from({ length: NET_ROWS * NET_COLS }, (_, i) => {
        const row = Math.floor(i / NET_COLS);
        const col = i % NET_COLS;
        const cell = netCellAt(row, col);
        if (!cell) return <div key={i} />;

        const color = colorForFacelet(facelets[cell.slot] ?? 0);
        const isGuideCenter = cell.isCenter && (cell.face as Face) === guideFace;

        return (
          <div
            key={i}
            className="relative rounded-[5px] border border-white/15 transition-shadow"
            style={{
              background: color,
              boxShadow: isGuideCenter ? `0 0 0 2px #fff, 0 0 14px 2px ${FACE_COLORS[guideFace as Face]}` : undefined,
            }}
          >
            {cell.isCenter && (
              <span
                className="absolute inset-0 grid place-items-center text-sm font-extrabold"
                style={{ color: FACE_TEXT[FACELET_FACES[facelets[cell.slot] ?? 0] ?? "U"] }}
              >
                {cell.face}
              </span>
            )}
            {isGuideCenter && guideDir && (
              <span
                className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-black/85 text-[10px] font-black text-white"
                aria-hidden="true"
              >
                {guideDir === "ccw" ? "↺" : "↻"}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
