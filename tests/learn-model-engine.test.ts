import { describe, expect, it } from "vitest";
import {
  getLearnPuzzleModel,
  learnPuzzleModels,
  learnPuzzleOrder,
} from "@/lib/learn-model-engine";

describe("learn model engine", () => {
  it("registers every labeled Learn puzzle once", () => {
    expect(Object.keys(learnPuzzleModels).sort()).toEqual([...learnPuzzleOrder].sort());
    expect(new Set(learnPuzzleOrder).size).toBe(learnPuzzleOrder.length);
  });

  it("gives every model unique face IDs and visible labels", () => {
    for (const id of learnPuzzleOrder) {
      const model = getLearnPuzzleModel(id);
      const ids = model.faces.map(face => face.id);

      expect(model.faces.length).toBeGreaterThanOrEqual(3);
      expect(new Set(ids).size).toBe(ids.length);
      expect(model.faces.every(face => face.notation && face.name && face.description)).toBe(true);
    }
  });

  it("maps every algorithm step to a labeled region", () => {
    for (const id of learnPuzzleOrder) {
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
