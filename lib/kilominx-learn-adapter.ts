import {
  FACE_COLORS,
  FACE_CORNERS,
  MOVE_COUNT,
  faceOfMove,
  moveLabel,
  parseMove,
} from "@/lib/kilominx-engine";

export type KilominxLearnFace = {
  face: number;
  notation: string;
  name: string;
  description: string;
  color: string;
  cornerSlots: readonly number[];
};

/**
 * Teaching metadata layered over the canonical Kilominx engine.
 * Face identity, color, affected corner slots, parsing, and move labels all come
 * from lib/kilominx-engine.ts. Learn owns only explanatory copy and flat layout.
 */
export const KILOMINX_LEARN_FACES: KilominxLearnFace[] = FACE_COLORS.map((color, face) => ({
  face,
  notation: String(face + 1),
  name: `Face ${face + 1}`,
  description: `A 72° turn moves the five corner pieces in slots ${FACE_CORNERS[face]
    .map(slot => slot + 1)
    .join(", ")}.`,
  color,
  cornerSlots: FACE_CORNERS[face],
}));

export function kilominxLearnMove(token: string) {
  const moveIndex = parseMove(token);
  return {
    moveIndex,
    face: faceOfMove(moveIndex),
    label: moveLabel(moveIndex),
  };
}

export function isKilominxMoveLabel(token: string): boolean {
  try {
    const moveIndex = parseMove(token);
    return moveIndex >= 0 && moveIndex < MOVE_COUNT && moveLabel(moveIndex) === token;
  } catch {
    return false;
  }
}
