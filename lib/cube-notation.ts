/**
 * 3×3 notation-teaching helpers layered over the canonical lib/cube-engine.ts.
 *
 * The Learn "3×3 Notation Lab" keeps ONE source of truth: a single CubeState in
 * React. The interactive 3D cube reports each committed face turn, the engine
 * applies it, and both the flat net and the guided route are pure functions of
 * that same state. This module owns only the small pieces the engine does not:
 *
 *   - the shared face → colour / label palette used by the 3D cube and net;
 *   - token algebra (inverse, simplify) for the guided "route back to solved";
 *   - human-readable notation reference copy for the legend.
 *
 * Unlike the Kilominx notation beta, nothing here scrapes DOM text or observes
 * mutations to synchronise views — every view renders from the shared state.
 */

export type Face = "U" | "R" | "F" | "D" | "L" | "B";

/** toFacelets() emits colour ids 0..5 in this order (U,R,F,D,L,B). */
export const FACELET_FACES: readonly Face[] = ["U", "R", "F", "D", "L", "B"];

export const FACE_COLORS: Record<Face, string> = {
  U: "#f7f7f2",
  R: "#e53935",
  F: "#24c45a",
  D: "#ffd21f",
  L: "#ff7a18",
  B: "#1464e8",
};

/** High-contrast text colour to draw a label on top of each face colour. */
export const FACE_TEXT: Record<Face, string> = {
  U: "#111318",
  R: "#fff5f5",
  F: "#041b0b",
  D: "#191200",
  L: "#1d0d00",
  B: "#f4f8ff",
};

export const FACE_NAMES: Record<Face, string> = {
  U: "Up",
  R: "Right",
  F: "Front",
  D: "Down",
  L: "Left",
  B: "Back",
};

export const FACE_DESCRIPTIONS: Record<Face, string> = {
  U: "The top layer. A plain U spins it clockwise looking down from above.",
  R: "The right-hand layer, turned clockwise as if you were facing the right side.",
  F: "The face pointing toward you — the side you look at while solving.",
  D: "The bottom layer, the mirror of U underneath the cube.",
  L: "The left-hand layer, clockwise as if you were facing the left side.",
  B: "The far side, hidden from view. Clockwise is judged from behind the cube.",
};

export const colorForFacelet = (value: number): string =>
  FACE_COLORS[FACELET_FACES[value] ?? "U"];

export const faceOfToken = (token: string): Face => token[0] as Face;

/** Quarter-turns clockwise a token represents: R=1, R2=2, R'=3. */
export function turnsOf(token: string): number {
  if (token.endsWith("2")) return 2;
  if (token.endsWith("'")) return 3;
  return 1;
}

const tokenFor = (face: string, turns: number): string | null => {
  const normalized = ((turns % 4) + 4) % 4;
  if (normalized === 0) return null;
  return `${face}${normalized === 1 ? "" : normalized === 2 ? "2" : "'"}`;
};

export function inverseToken(token: string): string {
  const face = token[0]!;
  const inverse = tokenFor(face, 4 - turnsOf(token));
  // A well-formed token always has a non-identity inverse; fall back defensively.
  return inverse ?? face;
}

export function inverseSequence(tokens: string[]): string[] {
  return tokens.map(inverseToken).reverse();
}

/**
 * Collapse consecutive same-face turns (R R → R2, R R' → nothing, R2 R → R').
 * This never changes the resulting cube state; it only keeps the displayed
 * guided route short. Non-adjacent and cross-face moves are left untouched,
 * which is always safe.
 */
export function simplify(tokens: string[]): string[] {
  const out: string[] = [];
  for (const token of tokens) {
    const face = token[0]!;
    const prev = out[out.length - 1];
    if (prev && prev[0] === face) {
      out.pop();
      const merged = tokenFor(face, turnsOf(prev) + turnsOf(token));
      if (merged) out.push(merged);
    } else {
      out.push(token);
    }
  }
  return out;
}

/**
 * Expand half turns into two quarter turns (R2 → R R). The guided trainer teaches
 * one thumb flick per step, and a physical flick is a single 90° turn, so the
 * route must be quarter-only for "one flick = one guided move" to hold. This never
 * changes the resulting state (R R is R2).
 */
export function toQuarterTurns(tokens: string[]): string[] {
  return tokens.flatMap((token) => (turnsOf(token) === 2 ? [token[0]!, token[0]!] : [token]));
}

export type NotationReference = { symbol: string; name: string; detail: string };

/** Reference copy for the notation legend on the Learn page. */
export const NOTATION_REFERENCE: NotationReference[] = [
  { symbol: "R", name: "Face turn", detail: "A single capital letter turns that face 90° clockwise (viewed from that side)." },
  { symbol: "R′", name: "Prime = inverse", detail: "An apostrophe reverses the turn: 90° counter-clockwise." },
  { symbol: "R2", name: "Double turn", detail: "A 2 means a half turn — 180°, direction doesn't matter." },
  { symbol: "M E S", name: "Slice moves", detail: "The middle layers: M follows L, E follows D, S follows F. (Reference — this trainer drills face turns.)" },
  { symbol: "r u f", name: "Wide turns", detail: "Lowercase turns two layers at once, used on bigger cubes." },
  { symbol: "x y z", name: "Rotations", detail: "Whole-cube rotations that re-orient without changing the solve — x follows R, y follows U, z follows F." },
];
