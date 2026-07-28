import { describe, expect, it } from "vitest";
import {
  KILOMINX_LEARN_FACES,
  isKilominxMoveLabel,
  kilominxLearnMove,
} from "@/lib/kilominx-learn-adapter";
import {
  getLearnPuzzleModel,
  learnPuzzleModels,
  learnPuzzleOrder,
} from "@/lib/learn-model-engine";
import { FACE_COLORS, FACE_CORNERS } from "@/lib/kilominx-engine";

describe("learn model engine", () => {
  it("registers every Learn puzzle once", () => {
    expect(Object.keys(learnPuzzleModels).sort()).toEqual([...learnPuzzleOrder].sort());
    expect(new Set(learnPuzzleOrder).size).toBe(learnPuzzleOrder.length);
  });

  it("keeps temporary local face definitions valid for puzzles not migrated yet", () => {
    for (const id of learnPuzzleOrder.filter(id => id !== "kilominx")) {
      const model = getLearnPuzzleModel(id);
      const ids = model.faces.map(face => face.id);

      expect(model.faces.length).toBeGreaterThanOrEqual(3);
      expect(new Set(ids).size).toBe(ids.length);
      expect(model.faces.every(face => face.notation && face.name && face.description)).toBe(true);
    }
  });

  it("derives all twelve Kilominx teaching faces from the canonical engine", () => {
    expect(KILOMINX_LEARN_FACES).toHaveLength(12);
    KILOMINX_LEARN_FACES.forEach((face, index) => {
      expect(face.face).toBe(index);
      expect(face.notation).toBe(String(index + 1));
      expect(face.color).toBe(FACE_COLORS[index]);
      expect(face.cornerSlots).toEqual(FACE_CORNERS[index]);
    });
  });

  it("uses canonical Kilominx parser and move labels for lesson steps", () => {
    const model = getLearnPuzzleModel("kilominx");
    for (const step of model.starterAlgorithm.steps) {
      expect(isKilominxMoveLabel(step.move)).toBe(true);
      expect(kilominxLearnMove(step.move).face).toBe(Number(step.faceId));
    }
  });

  it("maps local-model algorithm steps to labeled regions", () => {
    for (const id of learnPuzzleOrder.filter(id => id !== "kilominx")) {
      const model = getLearnPuzzleModel(id);
      const faceIds = new Set(model.faces.map(face => face.id));

      expect(model.starterAlgorithm.steps.length).toBeGreaterThan(0);
      for (const step of model.starterAlgorithm.steps) {
        expect(faceIds.has(step.faceId)).toBe(true);
        expect(step.move.length).toBeGreaterThan(0);
        expect(step.explanation.length).toBeGreaterThan(0);
      }
    }
  });
});
