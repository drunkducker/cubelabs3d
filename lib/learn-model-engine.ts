export type LearnPuzzleId = "3x3" | "4x4" | "skewb" | "pyraminx" | "kilominx";

export type LearnFaceLabel = {
  id: string;
  notation: string;
  name: string;
  description: string;
  color: string;
  polygon: string;
  textX: number;
  textY: number;
};

export type LearnAlgorithmStep = {
  move: string;
  faceId: string;
  explanation: string;
};

export type LearnPuzzleModel = {
  id: LearnPuzzleId;
  name: string;
  subtitle: string;
  viewBox: string;
  faces: LearnFaceLabel[];
  starterAlgorithm: {
    name: string;
    notation: string;
    steps: LearnAlgorithmStep[];
  };
};

const cubeColors = {
  U: "#f4f6f8",
  D: "#ffd21f",
  F: "#2fbf3f",
  B: "#1667e0",
  R: "#e6352b",
  L: "#ff7a1a",
};

export const learnPuzzleModels: Record<LearnPuzzleId, LearnPuzzleModel> = {
  "3x3": {
    id: "3x3", name: "3×3 Cube", subtitle: "Standard face notation used by most cube algorithms.", viewBox: "0 0 280 230",
    faces: [
      { id: "U", notation: "U", name: "Up", description: "Turn the top layer.", color: cubeColors.U, polygon: "140,18 226,62 140,106 54,62", textX: 140, textY: 66 },
      { id: "F", notation: "F", name: "Front", description: "Turn the face pointing toward you.", color: cubeColors.F, polygon: "54,62 140,106 140,202 54,158", textX: 96, textY: 137 },
      { id: "R", notation: "R", name: "Right", description: "Turn the right layer.", color: cubeColors.R, polygon: "140,106 226,62 226,158 140,202", textX: 184, textY: 137 },
    ],
    starterAlgorithm: { name: "Sexy Move", notation: "R U R′ U′", steps: [
      { move: "R", faceId: "R", explanation: "Turn the right face clockwise." },
      { move: "U", faceId: "U", explanation: "Turn the top face clockwise." },
      { move: "R′", faceId: "R", explanation: "Return the right face counter-clockwise." },
      { move: "U′", faceId: "U", explanation: "Return the top face counter-clockwise." },
    ] },
  },
  "4x4": {
    id: "4x4", name: "4×4 Cube", subtitle: "The same outer-face labels, plus lowercase wide turns for two layers.", viewBox: "0 0 280 230",
    faces: [
      { id: "U", notation: "U / u", name: "Up", description: "U turns one layer; u turns the top two layers.", color: cubeColors.U, polygon: "140,18 226,62 140,106 54,62", textX: 140, textY: 66 },
      { id: "F", notation: "F / f", name: "Front", description: "F turns one layer; f turns the front two layers.", color: cubeColors.F, polygon: "54,62 140,106 140,202 54,158", textX: 96, textY: 137 },
      { id: "R", notation: "R / r", name: "Right", description: "R turns one layer; r turns the right two layers.", color: cubeColors.R, polygon: "140,106 226,62 226,158 140,202", textX: 184, textY: 137 },
    ],
    starterAlgorithm: { name: "Wide-turn trigger", notation: "r U r′ U′", steps: [
      { move: "r", faceId: "R", explanation: "Turn the two rightmost layers together." },
      { move: "U", faceId: "U", explanation: "Turn only the top outer layer." },
      { move: "r′", faceId: "R", explanation: "Return both right layers counter-clockwise." },
      { move: "U′", faceId: "U", explanation: "Return the top outer layer." },
    ] },
  },
  skewb: {
    id: "skewb", name: "Skewb", subtitle: "Corner-axis notation mapped onto the visible turning regions.", viewBox: "0 0 280 230",
    faces: [
      { id: "U", notation: "U", name: "Upper corner axis", description: "Turn around the upper visible corner axis.", color: cubeColors.U, polygon: "140,18 226,62 140,106 54,62", textX: 140, textY: 66 },
      { id: "L", notation: "L", name: "Left corner axis", description: "Turn around the left-front corner axis.", color: cubeColors.F, polygon: "54,62 140,106 140,202 54,158", textX: 96, textY: 137 },
      { id: "R", notation: "R", name: "Right corner axis", description: "Turn around the right-front corner axis.", color: cubeColors.R, polygon: "140,106 226,62 226,158 140,202", textX: 184, textY: 137 },
    ],
    starterAlgorithm: { name: "Skewb sledge", notation: "R′ L R L′", steps: [
      { move: "R′", faceId: "R", explanation: "Turn the right corner axis counter-clockwise." },
      { move: "L", faceId: "L", explanation: "Turn the left corner axis clockwise." },
      { move: "R", faceId: "R", explanation: "Return the right corner axis clockwise." },
      { move: "L′", faceId: "L", explanation: "Return the left corner axis counter-clockwise." },
    ] },
  },
  pyraminx: {
    id: "pyraminx", name: "Pyraminx", subtitle: "Face turns use capitals; tip turns use the matching lowercase letter.", viewBox: "0 0 280 230",
    faces: [
      { id: "U", notation: "U / u", name: "Upper face and tip", description: "U turns the upper layer; u turns only its tip.", color: cubeColors.U, polygon: "140,20 226,194 54,194", textX: 140, textY: 104 },
      { id: "L", notation: "L / l", name: "Left face and tip", description: "L turns the left layer; l turns only the left tip.", color: cubeColors.F, polygon: "54,194 140,20 140,194", textX: 104, textY: 156 },
      { id: "R", notation: "R / r", name: "Right face and tip", description: "R turns the right layer; r turns only the right tip.", color: cubeColors.R, polygon: "140,20 226,194 140,194", textX: 176, textY: 156 },
    ],
    starterAlgorithm: { name: "Right trigger", notation: "R U R′ U′", steps: [
      { move: "R", faceId: "R", explanation: "Turn the right layer clockwise." },
      { move: "U", faceId: "U", explanation: "Turn the upper layer clockwise." },
      { move: "R′", faceId: "R", explanation: "Return the right layer." },
      { move: "U′", faceId: "U", explanation: "Return the upper layer." },
    ] },
  },
  kilominx: {
    id: "kilominx",
    name: "Kilominx",
    subtitle: "All twelve face labels, colors, affected corners, and move tokens come from the canonical Kilominx engine.",
    viewBox: "0 0 420 330",
    faces: [],
    starterAlgorithm: {
      name: "Two-face engine trigger",
      notation: "1 2 1' 2'",
      steps: [
        { move: "1", faceId: "0", explanation: "Turn engine face 1 forward by 72°." },
        { move: "2", faceId: "1", explanation: "Turn engine face 2 forward by 72°." },
        { move: "1'", faceId: "0", explanation: "Turn engine face 1 backward by 72°." },
        { move: "2'", faceId: "1", explanation: "Turn engine face 2 backward by 72°." },
      ],
    },
  },
};

export const learnPuzzleOrder: LearnPuzzleId[] = ["3x3", "4x4", "skewb", "pyraminx", "kilominx"];

export function getLearnPuzzleModel(id: LearnPuzzleId): LearnPuzzleModel {
  return learnPuzzleModels[id];
}
