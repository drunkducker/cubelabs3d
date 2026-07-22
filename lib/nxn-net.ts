/**
 * Unfolded "cross" net layout for an NxN cube, generalizing lib/cube-net-layout
 * (which is fixed at 3x3). Used by the manual sticker-entry grid in the 4x4/5x5
 * solvers. Slot ordering matches lib/nxn-cube.toFacelets — U,R,F,D,L,B blocks,
 * row-major within each face — so a slot index is also a facelet index.
 */
export const NET_FACES = ["U", "R", "F", "D", "L", "B"] as const;
export type NetFace = (typeof NET_FACES)[number];

// face position in the cross, measured in face-units (row, col)
const FACE_BLOCK: Record<NetFace, [number, number]> = { U: [0, 1], L: [1, 0], F: [1, 1], R: [1, 2], B: [1, 3], D: [2, 1] };
const FACE_SLOT: Record<NetFace, number> = { U: 0, R: 1, F: 2, D: 3, L: 4, B: 5 };

export type NetCell = { face: NetFace; localIndex: number; slot: number; isCenter: boolean };

export type NxNNet = {
  size: number;
  rows: number;
  cols: number;
  cellAt: (row: number, col: number) => NetCell | null;
};

export function nxnNet(size: number): NxNNet {
  const rows = 3 * size;
  const cols = 4 * size;
  const lookup: (NetCell | null)[] = Array.from({ length: rows * cols }, () => null);
  const mid = (size - 1) / 2;
  for (const face of NET_FACES) {
    const [blockRow, blockCol] = FACE_BLOCK[face];
    const baseRow = blockRow * size;
    const baseCol = blockCol * size;
    for (let localIndex = 0; localIndex < size * size; localIndex++) {
      const lr = Math.floor(localIndex / size);
      const lc = localIndex % size;
      const row = baseRow + lr;
      const col = baseCol + lc;
      // a "center" cell here means the fixed middle sticker of an odd cube; for
      // even cubes there is no single fixed center, so nothing is locked.
      const isCenter = size % 2 === 1 && lr === mid && lc === mid;
      lookup[row * cols + col] = { face, localIndex, slot: FACE_SLOT[face] * size * size + localIndex, isCenter };
    }
  }
  return { size, rows, cols, cellAt: (row, col) => lookup[row * cols + col] ?? null };
}
