/**
 * Shared geometric NxN cube engine (sticker-tracking cubie model) used by the
 * 4x4 and 5x5 reduction solvers. Generalized from the verified 5x5 engine:
 * every cubie is a grid position plus a set of outward-facing colored
 * stickers, and a move physically rotates the selected layer(s). Nothing
 * here knows how to solve — it only builds, turns, reads, and scores a cube.
 *
 * Facelet ordering matches lib/cube-engine.ts / cubejs: U,R,F,D,L,B blocks,
 * row-major within each face as seen looking at that face from outside. A
 * reduced NxN state (centers solved + edges paired) can therefore be sampled
 * down to a 54-char 3x3 facelet string and handed straight to cubejs.
 */
export type Axis = "x" | "y" | "z";
export type Face = "U" | "R" | "F" | "D" | "L" | "B";
export type DirectionVector = readonly [number, number, number];
export type Sticker = { dir: DirectionVector; color: Face };
export type Cubie = { grid: readonly [number, number, number]; stickers: Sticker[] };

export const FACES: Face[] = ["U", "R", "F", "D", "L", "B"];

const FACE_DIR: Record<Face, DirectionVector> = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  R: [1, 0, 0],
  L: [-1, 0, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
};

const FACE_TURN: Record<Face, { axis: Axis; sign: 1 | -1; clockwiseQuarter: 1 | -1 }> = {
  U: { axis: "y", sign: 1, clockwiseQuarter: -1 },
  D: { axis: "y", sign: -1, clockwiseQuarter: 1 },
  R: { axis: "x", sign: 1, clockwiseQuarter: -1 },
  L: { axis: "x", sign: -1, clockwiseQuarter: 1 },
  F: { axis: "z", sign: 1, clockwiseQuarter: -1 },
  B: { axis: "z", sign: -1, clockwiseQuarter: 1 },
};

const MOVE_SUFFIXES = ["", "'", "2"] as const;
const axisIndex = (axis: Axis) => (axis === "x" ? 0 : axis === "y" ? 1 : 2);
const dirKey = (dir: DirectionVector) => dir.join(",");
const FACE_BY_DIR = new Map(FACES.map((face) => [dirKey(FACE_DIR[face]), face]));

export const cubeEdge = (size: number) => (size - 1) / 2;
export const layerValues = (size: number) => Array.from({ length: size }, (_, index) => index - cubeEdge(size));

function rotateQuarter(vector: DirectionVector, axis: Axis): DirectionVector {
  const [x, y, z] = vector;
  if (axis === "x") return [x, -z, y];
  if (axis === "y") return [z, y, -x];
  return [-y, x, z];
}

function rotateVector(vector: DirectionVector, axis: Axis, quarterTurns: number): DirectionVector {
  let out = vector;
  const turns = ((quarterTurns % 4) + 4) % 4;
  for (let i = 0; i < turns; i++) out = rotateQuarter(out, axis);
  return out;
}

function faceForDirection(dir: DirectionVector): Face | null {
  return FACE_BY_DIR.get(dirKey(dir)) ?? null;
}

function cubieKey(grid: readonly [number, number, number]): string {
  return grid.join(",");
}

export function solvedCube(size: number): Cubie[] {
  const edge = cubeEdge(size);
  const values = layerValues(size);
  const cubies: Cubie[] = [];
  for (const x of values) {
    for (const y of values) {
      for (const z of values) {
        const exterior = Math.abs(x) === edge || Math.abs(y) === edge || Math.abs(z) === edge;
        if (!exterior) continue;
        const stickers = FACES.flatMap((face) => {
          const [dx, dy, dz] = FACE_DIR[face];
          const onFace =
            (dx !== 0 && x === dx * edge) ||
            (dy !== 0 && y === dy * edge) ||
            (dz !== 0 && z === dz * edge);
          return onFace ? [{ dir: FACE_DIR[face], color: face }] : [];
        });
        cubies.push({ grid: [x, y, z], stickers });
      }
    }
  }
  return cubies;
}

/**
 * A move token is a face letter, an optional `w` (wide = outer layer plus the
 * one adjacent inner layer), and an optional `'`/`2` modifier. Only 2-layer
 * wide turns are modeled, which is all standard 4x4/5x5 reduction needs.
 */
export function parseMoveToken(token: string, size: number): { axis: Axis; quarterTurns: number; layers: number[] } {
  const match = token.match(/^([URFDLB])(w?)(2|'?)$/);
  if (!match) throw new Error(`Invalid NxN move token: ${token}`);
  const [, faceText, wideText, suffix] = match;
  const face = faceText as Face;
  const base = FACE_TURN[face];
  const edge = cubeEdge(size);
  const outerLayer = base.sign * edge;
  const innerLayer = base.sign * (edge - 1);
  const suffixTurns = suffix === "2" ? 2 : suffix === "'" ? -1 : 1;
  return {
    axis: base.axis,
    quarterTurns: base.clockwiseQuarter * suffixTurns,
    layers: wideText === "w" ? [outerLayer, innerLayer] : [outerLayer],
  };
}

export function applyMove(cubies: Cubie[], token: string, size: number): Cubie[] {
  const spec = parseMoveToken(token, size);
  const index = axisIndex(spec.axis);
  return cubies.map((cubie) => {
    if (!spec.layers.some((layer) => Math.abs(cubie.grid[index] - layer) < 0.01)) return cubie;
    return {
      grid: rotateVector(cubie.grid, spec.axis, spec.quarterTurns),
      stickers: cubie.stickers.map((sticker) => ({ ...sticker, dir: rotateVector(sticker.dir, spec.axis, spec.quarterTurns) })),
    };
  });
}

export function tokenizeSequence(sequence: string): string[] {
  return sequence.trim().split(/\s+/).filter(Boolean);
}

export function applySequence(cubies: Cubie[], sequence: string | string[], size: number): Cubie[] {
  const tokens = Array.isArray(sequence) ? sequence : tokenizeSequence(sequence);
  return tokens.reduce((state, token) => applyMove(state, token, size), cubies);
}

export function inverseMove(token: string): string {
  if (token.endsWith("2")) return token;
  return token.endsWith("'") ? token.slice(0, -1) : `${token}'`;
}

export function inverseSequence(tokens: string[]): string[] {
  return [...tokens].reverse().map(inverseMove);
}

export function isSolvedCube(cubies: Cubie[]): boolean {
  return cubies.every((cubie) => cubie.stickers.every((sticker) => faceForDirection(sticker.dir) === sticker.color));
}

// ---- Progress metrics ------------------------------------------------

function centerEntries(cubies: Cubie[]) {
  return cubies.flatMap((cubie) => {
    if (cubie.stickers.length !== 1) return [];
    const sticker = cubie.stickers[0];
    const face = faceForDirection(sticker.dir);
    return face ? [{ face, color: sticker.color }] : [];
  });
}

/** How many single-sticker center pieces currently show their own face's color. */
export function centerProgress(cubies: Cubie[]): number {
  return centerEntries(cubies).filter((entry) => entry.face === entry.color).length;
}

function edgeLocationKey(grid: readonly [number, number, number], edge: number): string {
  return [0, 1, 2]
    .filter((index) => Math.abs(grid[index]) === edge)
    .map((index) => `${index}:${Math.sign(grid[index])}`)
    .join(",");
}

type EdgeEntry = { location: string; fixedAxes: number[]; colorByAxis: Record<number, Face> };

function edgeEntries(cubies: Cubie[], edge: number): EdgeEntry[] {
  return cubies.flatMap((cubie) => {
    if (cubie.stickers.length !== 2) return [];
    const fixedAxes = [0, 1, 2].filter((index) => Math.abs(cubie.grid[index]) === edge);
    const colorByAxis: Record<number, Face> = {};
    for (const sticker of cubie.stickers) {
      const stickerAxis = [0, 1, 2].find((index) => sticker.dir[index] !== 0);
      if (stickerAxis !== undefined) colorByAxis[stickerAxis] = sticker.color;
    }
    return [{ location: edgeLocationKey(cubie.grid, edge), fixedAxes, colorByAxis }];
  });
}

/**
 * How many of the 12 physical edge locations hold a fully agreeing group of
 * wing pieces — every 2-sticker piece at that location shows the same color
 * on each fixed axis (a real visual bar, not just "same colors in some
 * order"). Works for any NxN: 4x4 groups of 2 wings, 5x5 groups of 3.
 */
export function edgeReductionProgress(cubies: Cubie[], size: number): number {
  const edge = cubeEdge(size);
  const perLocation = size - 2; // wings between the two corners on each edge
  const byLocation = new Map<string, EdgeEntry[]>();
  for (const entry of edgeEntries(cubies, edge)) {
    const list = byLocation.get(entry.location) ?? [];
    list.push(entry);
    byLocation.set(entry.location, list);
  }
  let solved = 0;
  for (const entries of Array.from(byLocation.values())) {
    if (entries.length !== perLocation) continue;
    const [first, ...rest] = entries;
    if (first.fixedAxes.every((axis) => rest.every((entry) => entry.colorByAxis[axis] === first.colorByAxis[axis]))) {
      solved++;
    }
  }
  return solved;
}

export function reductionSummary(cubies: Cubie[], size: number) {
  const edge = size - 1;
  const centers = centerProgress(cubies);
  const edges = edgeReductionProgress(cubies, size);
  const centerTarget = 6 * (size - 2) * (size - 2);
  return {
    centers,
    centerTarget,
    edges,
    edgeTarget: 12,
    reduced: centers === centerTarget && edges === 12,
    edge,
  };
}

// ---- Facelet extraction ----------------------------------------------

/**
 * Grid coordinate of the sticker at (row, col) of a face, looking at that
 * face from outside, row-major top-to-bottom / left-to-right. These per-face
 * formulas are the ones verified against cubejs for the 5x5 handoff and are
 * dimension-agnostic (they only depend on `edge`), so they hold for 4x4 too.
 */
export function faceGridCoordinate(size: number, face: Face, row: number, col: number): readonly [number, number, number] {
  const edge = cubeEdge(size);
  const value = (index: number) => index - edge;
  if (face === "U") return [value(col), edge, value(row)];
  if (face === "R") return [edge, edge - row, edge - col];
  if (face === "F") return [value(col), edge - row, edge];
  if (face === "D") return [value(col), -edge, edge - row];
  if (face === "L") return [-edge, edge - row, value(col)];
  return [edge - col, edge - row, -edge]; // B
}

/** Full (size*size per face) facelet color array in U,R,F,D,L,B order. */
export function toFacelets(cubies: Cubie[], size: number): (Face | "?")[] {
  const byGrid = new Map(cubies.map((cubie) => [cubieKey(cubie.grid), cubie]));
  return FACES.flatMap((face) => {
    const faceDir = FACE_DIR[face];
    return Array.from({ length: size * size }, (_, index) => {
      const row = Math.floor(index / size);
      const col = index % size;
      const cubie = byGrid.get(cubieKey(faceGridCoordinate(size, face, row, col)));
      return cubie?.stickers.find((sticker) => dirKey(sticker.dir) === dirKey(faceDir))?.color ?? "?";
    });
  });
}

/** The 3 sample indices (corner / inner representative / corner) used to read
 * a reduced NxN face as a 3x3 face. For reduced states every inner band agrees,
 * so any single inner index is a valid representative. */
function reducedSampleIndices(size: number): [number, number, number] {
  return [0, Math.floor((size - 1) / 2), size - 1];
}

/**
 * Sample a reduced NxN state down to the 54-char 3x3 facelet string cubejs
 * expects. Throws if any sampled sticker is missing (incomplete state).
 */
export function toReducedFaceletString(cubies: Cubie[], size: number): string {
  const byGrid = new Map(cubies.map((cubie) => [cubieKey(cubie.grid), cubie]));
  const samples = reducedSampleIndices(size);
  const facelets = FACES.flatMap((face) => {
    const faceDir = FACE_DIR[face];
    return samples.flatMap((row) =>
      samples.map((col) => {
        const cubie = byGrid.get(cubieKey(faceGridCoordinate(size, face, row, col)));
        return cubie?.stickers.find((sticker) => dirKey(sticker.dir) === dirKey(faceDir))?.color ?? "?";
      })
    );
  });
  const text = facelets.join("");
  if (text.includes("?")) throw new Error("The cube state is missing one or more visible facelets.");
  return text;
}

// ---- Scramble generation ---------------------------------------------

export function randomScramble(size: number, count = 40): string[] {
  const faces = FACES.flatMap((face) => [face as string, `${face}w`]);
  const out: string[] = [];
  let lastAxis = "";
  while (out.length < count) {
    const base = faces[Math.floor(Math.random() * faces.length)];
    const axis = FACE_TURN[base[0] as Face].axis;
    if (axis === lastAxis) continue;
    lastAxis = axis;
    out.push(`${base}${MOVE_SUFFIXES[Math.floor(Math.random() * MOVE_SUFFIXES.length)]}`);
  }
  return out;
}
