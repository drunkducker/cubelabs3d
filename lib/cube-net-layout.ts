/**
 * Shared grid layout for the "cross"-shaped unfolded cube net used in two
 * places: the editable color-entry net in components/ManualSolver.tsx, and
 * the static labeled reference net on the /cube-notation learning page. Both
 * need the same mapping from a 9-row x 12-col grid cell to (face, local
 * sticker index), so it lives here once instead of being redefined twice.
 *
 * This is also the exact 54-slot ordering lib/cube-engine.ts's toFacelets()
 * produces (U,R,F,D,L,B blocks of 9, row-major within each block) — a slot
 * computed here can be used directly as an index into that array, or into a
 * facelet-color string for cubejs's Cube.fromString().
 */
export const NET_FACES = ["U", "R", "F", "D", "L", "B"] as const;
export type NetFace = (typeof NET_FACES)[number];

export const NET_POS: Record<NetFace, [number, number]> = { U: [0, 3], L: [3, 0], F: [3, 3], R: [3, 6], B: [3, 9], D: [6, 3] };
export const NET_FACE_SLOT: Record<NetFace, number> = { U: 0, R: 1, F: 2, D: 3, L: 4, B: 5 };
export const NET_ROWS = 9;
export const NET_COLS = 12;

export type NetCell = { face: NetFace; localIndex: number; slot: number; isCenter: boolean };

const CELL_LOOKUP: (NetCell | null)[] = Array.from({ length: NET_ROWS * NET_COLS }, () => null);
for (const face of NET_FACES) {
  const [r, c] = NET_POS[face];
  for (let localIndex = 0; localIndex < 9; localIndex++) {
    const row = r + Math.floor(localIndex / 3), col = c + (localIndex % 3);
    CELL_LOOKUP[row * NET_COLS + col] = { face, localIndex, slot: NET_FACE_SLOT[face] * 9 + localIndex, isCenter: localIndex === 4 };
  }
}

export function netCellAt(row: number, col: number): NetCell | null {
  return CELL_LOOKUP[row * NET_COLS + col] ?? null;
}
